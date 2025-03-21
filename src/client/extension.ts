import * as path from "path";
import * as vscode from "vscode"; //VSCode API
import {
  LanguageClient, // Class representing the client
  LanguageClientOptions, // config options for langauge client
  ServerOptions, // defines how to start language server
  TransportKind, // Transfort mechanism bw client and server
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel;

const getTimestamp = (): string => new Date().toISOString();

// Logger object with methods for different log levels
const Logger = {
  info: (msg: string): void =>
    outputChannel.appendLine(`[INFO][${getTimestamp()}] CLIENT: ${msg}`),
  log: (msg: string): void =>
    outputChannel.appendLine(`[LOG][${getTimestamp()}] CLIENT: ${msg}`),
  warn: (msg: string): void =>
    outputChannel.appendLine(`[WARN][${getTimestamp()}] CLIENT: ${msg}`),
  error: (msg: string): void =>
    outputChannel.appendLine(`[ERROR][${getTimestamp()}] CLIENT: ${msg}`),
};

export function activate(context: vscode.ExtensionContext): void {
  // Create and register the output channel.
  outputChannel = vscode.window.createOutputChannel(
    "Python AI Language Server"
  );
  context.subscriptions.push(outputChannel); // vscode will dispose of the output channel when the extension is deactivated

  Logger.info("Activating Python AI Language Server extension...");

  // Resolve the path to the compiled language server.
  const serverModule = context.asAbsolutePath(
    path.join("out", "server", "server.js")
  );
  Logger.log(`Server module path: ${serverModule}`);

  // Define the server options for the language server
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ["--nolazy", "--inspect=6009"],
      },
    },
  };

  // Define the client options for the language server
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "python" }], // Only activate for python files
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.py"), // Watch for python files
    },
    outputChannel: outputChannel, // Use the output channel for logging
    middleware: {
      provideDefinition: async (document, position, token, next) => {
        Logger.log(
          `Definition requested at ${document.uri.toString()}:${
            position.line
          }:${position.character}`
        );
        const result = await next(document, position, token);
        Logger.log(`Definition result: ${result ? "found" : "not found"}`);
        return result;
      },
      provideHover: async (document, position, token, next) => {
        Logger.log(
          `Hover requested at ${document.uri.toString()}:${
            position.line
          }:${position.character}`
        );
        const result = await next(document, position, token);
        Logger.log(`Hover result: ${result ? "provided" : "not provided"}`);
        return result;
      },
      provideCompletionItem: async (document, position, context, token, next) => {
        Logger.log(
          `Completion requested at ${document.uri.toString()}:${
            position.line
          }:${position.character}`
        );
        const result = await next(document, position, context, token);
        Logger.log(`Completion items: ${result ? (Array.isArray(result) ? result.length : "1") : "0"} provided`);
        return result;
      }
    },
  };

  client = new LanguageClient(
    "pythonAiLanguageClient", // The ID of the language client
    "Python AI Language Client", // The name of the language client
    serverOptions, // The server options for the language server
    clientOptions // The client options for the language server
  );

  // Listen and Log when the client state changes
  client.onDidChangeState((event) => {
    Logger.info(`Client state changed: ${event.oldState} -> ${event.newState}`);
  });

  // Start the language client asynchronously
  Logger.info("Starting language client...");
  client.start().then(
    () => Logger.info("Language client started"),
    (err) => Logger.error(`Failed to start language client: ${err}`)
  );

  // Ensure the client stops on extension deactivation
  context.subscriptions.push({
    dispose: () => {
      if (client) {
        client.stop();
      }
    },
  });

  outputChannel.show(); // Shows the output channel in the UI
}

export function deactivate(): Thenable<void> | undefined {
  Logger.info("Deactivating extension...");
  return client ? client.stop() : undefined;
}
