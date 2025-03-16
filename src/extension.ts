import * as client from './client/extension';
import { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  // Forward activation to the client module
  return client.activate(context);
}

export function deactivate() {
  // Forward deactivation to the client module
  return client.deactivate();
}