import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel;

const getTimestamp = (): string => new Date().toISOString();

const Logger = {
  info: (msg: string): void =>
    outputChannel.appendLine(`[INFO][${getTimestamp()}] CLIENT: ${msg}`),
  log: (msg: string): void =>
    outputChannel.appendLine(`[LOG][${getTimestamp()}] CLIENT: ${msg}`),
  warn: (msg: string): void =>
    outputChannel.appendLine(`[WARN][${getTimestamp()}] CLIENT: ${msg}`),
  error: (msg: string): void =>
    outputChannel.appendLine(`[ERROR][${getTimestamp()}] CLIENT: ${msg}`)
};

export function activate(context: vscode.ExtensionContext): void {
  // Create and register the output channel.
  outputChannel = vscode.window.createOutputChannel("Custom Python Language Server");
  context.subscriptions.push(outputChannel);

  Logger.info("Activating Python Language Server extension...");

  // Resolve the path to the compiled language server.
  const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));
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

  client = new LanguageClient(
    'myPyLanguageServer',
    'My Py Language Server',
    serverOptions,
    clientOptions
  );

  client.onDidChangeState(event => {
    Logger.info(`Client state changed: ${event.oldState} -> ${event.newState}`);
  });

  Logger.info("Starting language client...");
  client.start().then(
    () => Logger.info("Language client started"),
    (err) => Logger.error(`Failed to start language client: ${err}`)
  );

  // Ensure the client stops on extension deactivation.
  context.subscriptions.push({
    dispose: () => {
      if (client) {
        client.stop();
      }
    }
  });

  outputChannel.show();
}

export function deactivate(): Thenable<void> | undefined {
  Logger.info("Deactivating extension...");
  return client ? client.stop() : undefined;
}