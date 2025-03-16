import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  Hover,
  HoverParams,
  DefinitionParams,
  Location,
  Position,
  Range,
  DocumentUri,
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Logger utility for consistent logging
const Logger = {
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    connection.console.info(`[INFO][${timestamp}] ${message}`);
  },
  log: (message: string) => {
    const timestamp = new Date().toISOString();
    connection.console.log(`[LOG][${timestamp}] ${message}`);
  },
  warn: (message: string) => {
    const timestamp = new Date().toISOString();
    connection.console.warn(`[WARN][${timestamp}] ${message}`);
  },
  error: (message: string) => {
    const timestamp = new Date().toISOString();
    connection.console.error(`[ERROR][${timestamp}] ${message}`);
  }
};

// Log server startup
Logger.info(`Server process started with PID: ${process.pid}`);

// Track open TextDocuments in memory
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// ---------------------------------------------------------------------------
// DATA STRUCTURES
// We'll keep a simple map from symbol name -> { uri, range } to store where a function is defined
// ---------------------------------------------------------------------------
interface DefinitionInfo {
  uri: DocumentUri;
  range: Range;
}

const functionDefinitions = new Map<string, DefinitionInfo>();

// LIFECYCLE EVENTS
// Handle server initialization
connection.onInitialize((params: InitializeParams): InitializeResult => {
  Logger.info('Python Language Server initializing...');
  Logger.log(`Client capabilities: ${JSON.stringify(params.capabilities)}`);

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental
      },
      hoverProvider: true,
      definitionProvider: true
    }
  };
});

// After the client is ready, you can do any extra setup
connection.onInitialized(() => {
  Logger.info('Python Language Server initialized successfully.');
});

// ---------------------------------------------------------------------------
// DOCUMENT HANDLING
// ---------------------------------------------------------------------------

// Triggered when a document is opened or its content changes
documents.onDidChangeContent((change) => {
  Logger.log(`Document changed: ${change.document.uri}`);
  const textDocument = change.document;
  parseDocumentForDefinitions(textDocument);
});

documents.onDidOpen((event) => {
  Logger.log(`Document opened: ${event.document.uri}`);
  parseDocumentForDefinitions(event.document);
});

// Parses a text document to find all function definitions of the form:
//   def function_name(...):
function parseDocumentForDefinitions(textDocument: TextDocument) {
  const text = textDocument.getText();
  Logger.log(`Parsing document: ${textDocument.uri}, length: ${text.length}`);
  
  // Clear old definitions for this file
  for (let [funcName, info] of functionDefinitions.entries()) {
    if (info.uri === textDocument.uri) {
      functionDefinitions.delete(funcName);
    }
  }

  // Split into lines and look for "def " at the start
  const lines = text.split(/\r?\n/g);
  Logger.log(`Document has ${lines.length} lines`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A very naive approach to detect function definitions
    if (line.trimStart().startsWith('def ')) {
      // e.g. line might be "def my_func(param):"
      // Let's extract "my_func"
      const match = /^def\s+([A-Za-z0-9_]+)/.exec(line);
      if (match) {
        const funcName = match[1];
        // Range for the entire line (very simplistic)
        const startPos: Position = { line: i, character: 0 };
        const endPos: Position = { line: i, character: line.length };
        const definitionRange: Range = { start: startPos, end: endPos };

        functionDefinitions.set(funcName, {
          uri: textDocument.uri,
          range: definitionRange
        });
        Logger.log(`Found function definition: ${funcName} at line ${i}`);
      }
    }
  }
  
  Logger.log(`Total function definitions found: ${functionDefinitions.size}`);
}

// ---------------------------------------------------------------------------
// HOVER PROVIDER
// ---------------------------------------------------------------------------
connection.onHover((params: HoverParams): Hover | undefined => {
  Logger.log(`Hover requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
  
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    Logger.warn('Document not found for hover request');
    return undefined;
  }

  // Get the word that the user is hovering over
  const hoveredWord = getWordAtPosition(doc, params.position);
  Logger.log(`Hovered word: ${hoveredWord || 'none'}`);
  
  if (!hoveredWord) {
    return undefined;
  }

  // If we have a definition for that symbol, we can provide a hover
  if (functionDefinitions.has(hoveredWord)) {
    Logger.log(`Providing hover for function: ${hoveredWord}`);
    return {
      contents: {
        kind: 'markdown',
        value: `**Function**: \`${hoveredWord}\`\n\nThis is a simple doc for \`${hoveredWord}\`.`
      }
    };
  }

  return undefined;
});

// ---------------------------------------------------------------------------
// DEFINITION PROVIDER
// ---------------------------------------------------------------------------
connection.onDefinition((params: DefinitionParams): Location[] => {
  Logger.log(`Definition requested at ${params.textDocument.uri}:${params.position.line}:${params.position.character}`);
  
  const doc = documents.get(params.textDocument.uri);
  if (!doc) {
    Logger.warn('Document not found for definition request');
    return [];
  }

  // Identify the word we want to go to
  const word = getWordAtPosition(doc, params.position);
  Logger.log(`Word at position: ${word || 'none'}`);
  
  if (!word) {
    return [];
  }

  // If we know the definition of this word, return its location
  const definitionInfo = functionDefinitions.get(word);
  if (definitionInfo) {
    Logger.log(`Found definition for: ${word}`);
    return [
      {
        uri: definitionInfo.uri,
        range: definitionInfo.range
      }
    ];
  }

  Logger.log(`No definition found for: ${word}`);
  return [];
});

// ---------------------------------------------------------------------------
// UTILITY: Get the symbol at a given position
// ---------------------------------------------------------------------------
function getWordAtPosition(doc: TextDocument, position: Position): string | undefined {
  const text = doc.getText();
  // Convert position to an absolute offset
  const offset = doc.offsetAt(position);
  if (offset >= text.length) {
    return undefined;
  }

  // Expand from offset to find boundaries of the "word"
  const isWordChar = (char: string) => /[A-Za-z0-9_]/.test(char);

  let start = offset;
  while (start > 0 && isWordChar(text[start - 1])) {
    start--;
  }

  let end = offset;
  while (end < text.length && isWordChar(text[end])) {
    end++;
  }

  const word = text.substring(start, end);
  return word.length > 0 ? word : undefined;
}

// ---------------------------------------------------------------------------
// Listen for text document events & messages from the client
// ---------------------------------------------------------------------------
documents.listen(connection);
connection.listen();