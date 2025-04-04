import {
  createConnection, // For connection bw C & S
  ProposedFeatures, // To enable all proposed LSP features for server
  TextDocuments, // Manage & Sync text docs withing server
  TextDocumentSyncKind, //enum defining how changes sent from C2S
  InitializeParams, // Type (Params received druing server init)
  InitializeResult, // Type (Resp. sent after init)
  Hover, // Type for hover info to be returned
  HoverParams, // Type (params received when a hover req is made)
  DefinitionParams, // Type (params when def. req. is made)
  Location, // Location within a doc
  Position, // position in a text doc (line and char)
  Range, // Type range within a doc(start, end)
  DocumentUri,
  CompletionItem, // Suggestion returned back by the server
  CompletionItemKind, // Enum categorizing completion item
  CompletionParams, // Type (params received when a completion req is made)
  InsertTextFormat, // Enum indicating the format of inserted txt (Snippet or plain)
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { Logger } from "./logger";
import { LLMService } from "./llm";
import { getWordAtPosition } from "./utils";

// Create a connection for the server with all proposed features
const connection = createConnection(ProposedFeatures.all);

// Initialize Logger
const logger = new Logger(connection);

// Initialize LLM service
const llmService = new LLMService(logger);

logger.info(`Server process started with PID: ${process.pid}`);

// Manage open text documents i.e intializing a document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// DATA STRUCTURES: For storing function definitions
interface DefinitionInfo {
  uri: DocumentUri;
  range: Range;
}

const functionDefinitions = new Map<string, DefinitionInfo>();

// LIFECYCLE EVENTS
connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger.info("Initializing Python Language Server...");
  logger.log(`Client capabilities: ${JSON.stringify(params.capabilities)}`);

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
      },
      hoverProvider: true,
      definitionProvider: true,
      completionProvider: {
        triggerCharacters: [
          ".",
          " ",
          "\n",
          ":",
          "(",
          "[",
          ",",
          "=",
          "#",
          "@",
          "_",
          '"',
          "'",
          ")",
          "]",
        ],
      },
      // Standard LSP completion provider is used for code suggestions
    },
  };
});

connection.onInitialized(() => {
  logger.info("Python Language Server initialized successfully.");
});

// DOCUMENT HANDLING
documents.onDidOpen((event) => {
  logger.log(`Document opened: ${event.document.uri}`);
  parseDocumentForDefinitions(event.document);
});

documents.onDidChangeContent((change) => {
  logger.log(`Document changed: ${change.document.uri}`);
  parseDocumentForDefinitions(change.document);
});

// Parses to detect Python function definitions
function parseDocumentForDefinitions(textDocument: TextDocument): void {
  const text = textDocument.getText();
  logger.log(`Parsing document: ${textDocument.uri} (length: ${text.length})`);

  // Remove existing definitions from this document. (Logic improvement needed here)
  const keysToRemove = Array.from(functionDefinitions.entries())// Conv KV array
    .filter(([_, info]) => info.uri === textDocument.uri) // keep those with matching uri
    .map(([key]) => key); // extract keys
  keysToRemove.forEach((key) => functionDefinitions.delete(key)); // delete the keys

  const lines = text.split(/\r?\n/);
  logger.log(`Document has ${lines.length} lines`);

  // Now finding the function definitions (TODO: AST)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("def ")) {
      const match = /^def\s+([A-Za-z0-9_]+)/.exec(line);
      if (match) {
        const funcName = match[1];
        const startPos: Position = { line: i, character: 0 };
        const endPos: Position = { line: i, character: line.length };
        functionDefinitions.set(funcName, {
          uri: textDocument.uri,
          range: { start: startPos, end: endPos },
        });
        logger.log(`Found function definition: ${funcName} at line ${i}`);
      }
    }
  }
  logger.log(`Total function definitions: ${functionDefinitions.size}`);
}

// HOVER PROVIDER
connection.onHover((params: HoverParams): Hover | undefined => {
  logger.log(
    `Hover requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`
  );

  const doc = documents.get(params.textDocument.uri); // fetching the document with uri
  if (!doc) {
    logger.warn("Document not found for hover request");
    return undefined;
  }

  const hoveredWord = getWordAtPosition(doc, params.position);
  logger.log(`Hovered word: ${hoveredWord || "none"}`);

  if (!hoveredWord) {
    return undefined;
  }

  if (functionDefinitions.has(hoveredWord)) {
    logger.log(`Providing hover for function: ${hoveredWord}`);
    return {
      contents: {
        kind: "markdown",
        value: `**Function**: \`${hoveredWord}\`\n\nThis is a sample doc for \`${hoveredWord}\`.`,
      },
    };
  }
  return undefined;
});

// DEFINITION PROVIDER
connection.onDefinition((params: DefinitionParams): Location[] => {
  logger.log(
    `Definition requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`
  );

  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    logger.warn("Document not found for definition request");
    return [];
  }

  const word = getWordAtPosition(doc, params.position);
  logger.log(`Word at position: ${word || "none"}`);

  if (!word) {
    return [];
  }

  const definitionInfo = functionDefinitions.get(word);
  if (definitionInfo) {
    logger.log(`Found definition for: ${word}`);
    return [
      {
        uri: definitionInfo.uri,
        range: definitionInfo.range,
      },
    ];
  }

  logger.log(`No definition found for: ${word}`);
  return [];
});

// COMPLETION PROVIDER
connection.onCompletion(
  async (params: CompletionParams): Promise<CompletionItem[]> => {
    logger.log(
      `Completion requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`
    );

    const doc = documents.get(params.textDocument.uri);
    if (!doc) {
      logger.warn("Document not found for completion request");
      return [];
    }

    // Get the context (preceding lines of code) to provide to the LLM
    const text = doc.getText();
    const cursorOffset = doc.offsetAt(params.position);
    const contextBeforeCursor = text.substring(0, cursorOffset);

    try {
      const suggestion = await llmService.getSuggestionsFromLLM(
        contextBeforeCursor
      );
      if (!suggestion) {
        return [];
      }

      // Process and create a completion item (suggestion)
      const codeSuggestion: CompletionItem = {
        label: "Code Suggestion", // Dropdown label
        kind: CompletionItemKind.Snippet, // Type of completion item
        detail: "AI-powered code suggestion", // Additional information
        documentation: {
          kind: "markdown",
          value: `### AI Code Suggestion\n\`\`\`python\n${suggestion}\n\`\`\`\n\n*Press Enter to insert this code*`,
        },
        insertText: suggestion, // Text that will be inserted if user accepts the suggestion
        insertTextFormat: InsertTextFormat.Snippet, // Format of the text that will be inserted
        data: {
          source: "llm-main",
        },
      };

      // LSP requires completion providers to return an array of completion items
      // by design because code completion typically offers multiple suggestions
      // for the user to choose from
      return [codeSuggestion];
    } catch (error) {
      logger.error(`Error in completion provider: ${error}`);
      return [];
    }
  }
);

// Start listening for document events and client messages.
documents.listen(connection);
connection.listen();