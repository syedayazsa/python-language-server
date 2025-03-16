import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

// Logger utility for consistent logging
const Logger = {
  info: (message: string) => {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[INFO][${timestamp}] CLIENT: ${message}`);
  },
  log: (message: string) => {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[LOG][${timestamp}] CLIENT: ${message}`);
  },
  warn: (message: string) => {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[WARN][${timestamp}] CLIENT: ${message}`);
  },
  error: (message: string) => {
    const timestamp = new Date().toISOString();
    outputChannel.appendLine(`[ERROR][${timestamp}] CLIENT: ${message}`);
  }
};

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel("Custom Python Language Server");
  context.subscriptions.push(outputChannel);
  
  Logger.info("Python Language Server extension activating...");
  
  // Path to your compiled language server
  const serverModule = context.asAbsolutePath(
    path.join('out', 'server', 'server.js')
  );
  
  Logger.log(`Server module path: ${serverModule}`);

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { 
      module: serverModule, 
      transport: TransportKind.ipc,
      options: {
        execArgv: ["--nolazy", "--inspect=6009"]
      }
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'python' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.py')
    },
    outputChannel: outputChannel,
    middleware: {
      provideDefinition: async (document, position, token, next) => {
        Logger.log(`Definition requested at ${document.uri.toString()}:${position.line}:${position.character}`);
        const result = await next(document, position, token);
        Logger.log(`Definition result: ${result ? 'found' : 'not found'}`);
        return result;
      }
    }
  };

  // Create the language client
  client = new LanguageClient(
    'myPyLanguageServer',
    'My Py Language Server',
    serverOptions,
    clientOptions
  );

  // Register event handlers
  client.onDidChangeState(event => {
    Logger.info(`Client state changed: ${event.oldState} -> ${event.newState}`);
  });

  // Start the client
  Logger.info("Starting language client...");
  client.start();
  Logger.info("Language client started");
  
  // Push a disposable that stops the client when being disposed
  context.subscriptions.push({
    dispose: () => client.stop()
  });
  
  // Show the output channel
  outputChannel.show();
}

export function deactivate(): Thenable<void> | undefined {
  Logger.info("Deactivating extension...");
  if (!client) {
    return undefined;
  }
  return client.stop();
}
