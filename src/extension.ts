import * as vscode from 'vscode';

import { WsObjectCompletionProvider } from './features/WsObjectCompletionProvider';
import { WsMethodCompletionProvider } from './features/WsMethodCompletionProvider';
import { WsSignatureHelpProvider } from './features/WsSignatureHelpProvider';
import { WsHoverProvider } from './features/WsHoverProvider';
import { wsParseObjectInfo, isWsDocument } from './parser';
import { getObjectsByDocName } from './util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	vscode.workspace.onDidOpenTextDocument(didOpenTextDocument);

	function didOpenTextDocument(document: vscode.TextDocument): void {

		if (document.languageId !== 'xml') {
			return;
		}

		if (isWsDocument()) {
			wsParseObjectInfo();
			getObjectsByDocName(document);

			context.subscriptions.push(
				vscode.languages.registerCompletionItemProvider(
					{ scheme: 'file', language: 'xml' }, new WsObjectCompletionProvider()
				)
			);

			context.subscriptions.push(
				vscode.languages.registerCompletionItemProvider(
					{ scheme: 'file', language: 'xml' }, new WsMethodCompletionProvider(), '.'
				)
			);

			context.subscriptions.push(
				vscode.languages.registerSignatureHelpProvider(
					{ scheme: 'file', language: 'xml' }, new WsSignatureHelpProvider(), {
						triggerCharacters: ['('], retriggerCharacters: [',']
					}
				)
			);

			context.subscriptions.push(
				vscode.languages.registerHoverProvider(
					{ scheme: 'file', language: 'xml' }, new WsHoverProvider()
				)
			);
		}
	}
}

// this method is called when your extension is deactivated
export function deactivate() {

}