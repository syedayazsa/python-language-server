import * as client from './client/extension';
import { ExtensionContext } from 'vscode';

// Standard VS Code LSP pattern of separating entry point from implementation
export function activate(context: ExtensionContext): void {
  return client.activate(context);
}

export function deactivate(): Thenable<void> | undefined {
  return client.deactivate();
}