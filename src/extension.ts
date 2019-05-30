import * as vscode from 'vscode';

import { WsObjectCompletionProvider } from './features/WsObjectCompletionProvider';
import { WsMethodCompletionProvider } from './features/WsMethodCompletionProvider';
import { WsSignatureHelpProvider } from './features/WsSignatureHelpProvider';
import { WsHoverProvider } from './features/WsHoverProvider';
import { wsParseObjectInfo, isWsDocument, loadDocumentation } from './parser';
import { WorkspaceContext } from './WorkspaceContext';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	vscode.workspace.onDidOpenTextDocument(didOpenTextDocument);
	vscode.workspace.onDidChangeTextDocument(didOpenTextDocument);

	function didOpenTextDocument(): void {

		if (isWsDocument()) {
			wsParseObjectInfo();
		}
	}

	// Load WebSquare API Documentation
	loadDocumentation();

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
				triggerCharacters: ['(', ','], retriggerCharacters: [',']
			}
		)
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ scheme: 'file', language: 'xml' }, new WsHoverProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ scheme: 'file', language: 'javascript' }, new WsObjectCompletionProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ scheme: 'file', language: 'javascript' }, new WsMethodCompletionProvider(), '.'
		)
	);

	context.subscriptions.push(
		vscode.languages.registerSignatureHelpProvider(
			{ scheme: 'file', language: 'javascript' }, new WsSignatureHelpProvider(), {
				triggerCharacters: ['('], retriggerCharacters: [',']
			}
		)
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ scheme: 'file', language: 'javascript' }, new WsHoverProvider()
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'extension.CodeSquare', WorkspaceContext.openNewWsPage)
	);

	// 문서 저장시
	// 임시 js 파일인지 확인하고 임시 js 파일인 경우
	// 변경된 내용을 원본 xml 파일의 js 부분에 적용
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(WorkspaceContext.onSave)
	);

	// 문서 닫을시
	// 임시 js 파일인지 확인
	// uri scheme가 git인 것은 무시하고 file인 것만 처리
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => WorkspaceContext.onClose(doc))
	);
}

// this method is called when your extension is deactivated
export function deactivate() {
	WorkspaceContext.deactivate();
}