import * as vscode from 'vscode';
import fs = require('fs');
import os = require('os');

const startWords: string[] = ["<script type=\"javascript\"><![CDATA[",
	"<script type=\"text/javascript\"><![CDATA["];
const endWord = "]]></script>";

let originDocs: vscode.TextDocument[] = [];		// 원본 xml 파일
let jsDocs: vscode.TextDocument[] = [];			// 임시 js 파일

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.jspick', () => {
		// The code you place here will be executed every time your command is executed

		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		// 현재 활성화된 document를 확인
		if (!vscode.window.activeTextEditor)
			return;

		// 원본 xml 파일에서 javascript 부분만 파싱
		let originDoc = vscode.window.activeTextEditor.document;

		originDocs.push(originDoc);
		let pickedDoc = originDoc.getText();

		let startIdx = -1;

		if (pickedDoc.indexOf(startWords[0]) > -1) {
			startIdx = pickedDoc.indexOf(startWords[0])	// javascript
				+ new String(startWords[0]).length;
		} else {
			startIdx = pickedDoc.indexOf(startWords[1])	// text/javascript
				+ new String(startWords[1]).length;
		}
		let endIdx = pickedDoc.indexOf(endWord);

		let pickedJS = pickedDoc.substring(startIdx, endIdx);
		pickedJS = pickedJS.substring(0, pickedJS.lastIndexOf("\n"));

		if (pickedJS == null)
			return;

		// vscode extension 폴더에 임시 파일 생성
		let jsFilePath = "C:\\Users\\" + os.userInfo().username + "\\.vscode\\extensions\\";

		let dirList = fs.readdirSync(jsFilePath);

		for (let i = 0; i < dirList.length; i++) {
			if (dirList[i].includes("park.js-picker-") == true) {
				jsFilePath += dirList[i];
				break;
			}
		}

		// 파싱된 데이터를 통해 임시파일 생성
		let originName = originDoc.fileName;
		let jsFile = originName.replace(/.xml/, ".js");
		jsFile = [jsFile.slice(0, jsFile.length - 3), " (JS-Picker)", jsFile.slice(jsFile.length - 3)].join('');
		jsFile = jsFile.substring(jsFile.lastIndexOf("\\"), jsFile.length);

		jsFilePath += jsFile;

		fs.writeFile(jsFilePath, pickedJS, (err) => {
			if (err) throw err;
		});

		vscode.workspace.openTextDocument(jsFilePath).then(document => {
			jsDocs.push(document);
			vscode.window.showTextDocument(document);
		});

	});

	// 문서 저장시
	// 임시 js 파일인지 확인하고 임시 js 파일인 경우
	// 변경된 내용을 원본 xml 파일의 js 부분에 적용
	vscode.workspace.onDidSaveTextDocument(() => {

		if (!vscode.window.activeTextEditor)
			return;

		let jsDoc = vscode.window.activeTextEditor.document;

		if (jsDoc.fileName.match("(JS-Picker)") == null)
			return;

		let we = new vscode.WorkspaceEdit();

		let startLine = 0;
		let endLine = 0;

		let originDoc = null;

		for (let i = 0; i < originDocs.length; i++) {

			let fileName = jsDoc.fileName.replace(" (JS-Picker)", '');
			fileName = fileName.substring(fileName.lastIndexOf("\\") + 1, fileName.length);
			fileName = fileName.replace(".js", ".xml");

			let originFileName = originDocs[i].fileName.substring(
				originDocs[i].fileName.lastIndexOf("\\") + 1, originDocs[i].fileName.length);

			if (fileName == originFileName)
				originDoc = originDocs[i];
		}

		if (originDoc == null)
			return;

		let startWord = '';

		for (let lineNumber = 0; lineNumber < originDoc.lineCount; lineNumber++) {
			let lineText = originDoc.lineAt(lineNumber);

			let tests = -1;

			if (lineText.text.indexOf(startWords[0]) > -1) {
				tests = lineText.text.indexOf(startWords[0]);
				startWord = startWords[0];
			} else {
				tests = lineText.text.indexOf(startWords[1]);
				startWord = startWords[1];
			}

			if (tests > -1) {
				startLine = lineNumber;
			}

			tests = lineText.text.indexOf(endWord);

			if (tests > -1) {
				endLine = lineNumber;
			}
		}

		let jsText = jsDoc.getText();

		we.replace(originDoc.uri, new vscode.Range(
			startLine, startWord.length +
			originDoc.lineAt(startLine).text.split(' ').length - 1, endLine, 0), jsText);

		vscode.workspace.applyEdit(we);

		// 파일 저장시 원본 xml 파일도 함께 저장 (미작동)
		//originDoc.save();
	});

	// 문서 닫을시
	// 임시 js 파일인지 확인
	// uri scheme가 git인 것은 무시하고 file인 것만 처리
	vscode.workspace.onDidCloseTextDocument((doc) => {

		if (doc.uri.scheme == 'git') {
			return;
		}

		let jsDoc = null;

		for (let i = 0; i < jsDocs.length; i++) {
			if (jsDocs[i].fileName == doc.fileName) {
				jsDoc = jsDocs[i];

				originDocs.splice(i, 1);
				jsDocs.splice(i, 1);
			}
		}

		if (jsDoc == null)
			return;

		if (!doc.isClosed)
			return;

		let we = new vscode.WorkspaceEdit();

		we.deleteFile(jsDoc.uri);
		vscode.workspace.applyEdit(we);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {

	for (let i = 0; i < jsDocs.length; i++)
		fs.unlink(jsDocs[i].fileName, (err) => { });
}
