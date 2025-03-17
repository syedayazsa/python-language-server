import * as client from './client/extension';
import { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext): void {
  return client.activate(context);
}

export function deactivate(): Thenable<void> | undefined {
  return client.deactivate();
}