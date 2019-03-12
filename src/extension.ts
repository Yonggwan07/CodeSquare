import * as vscode from 'vscode';
import * as xml2js from 'xml2js';
import fs = require('fs');
import os = require('os');

// DataList, DataMap 등의 Object 정보를 저장
export interface IObjects {
	type: string;
	id: string;
	objDetail: IObjectDetail[];
}

// DataList, DataMap의 세부 컬럼, 키 정보를 저장
export interface IObjectDetail {
	id: string;
	name: string;
	dataType: string;
}

// Websquare Objects (ex. dataMap, dataList...)
let objects: IObjects[] = [];

const startWords: string[] = ["<script type=\"javascript\"><![CDATA[",
	"<script type=\"text/javascript\"><![CDATA["];
const endWord = "]]></script>";

let originDocs: vscode.TextDocument[] = [];		// 원본 xml 파일
let jsDocs: vscode.TextDocument[] = [];			// 임시 js 파일

let documentation: any;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	documentation = require('../documentation.json');

	completion();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.CodeSquare', () => {
		// The code you place here will be executed every time your command is executed

		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		// 현재 활성화된 document를 확인
		if (!vscode.window.activeTextEditor)
			return;

		// Websquare Object Parsing
		parseXML();

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
			if (dirList[i].includes("yonggwan.codesquare-") == true) {
				jsFilePath += dirList[i];
				break;
			}
		}

		// 파싱된 데이터를 통해 임시파일 생성
		let originName = originDoc.fileName;
		let jsFile = originName.replace(/.xml/, ".js");
		jsFile = [jsFile.slice(0, jsFile.length - 3), " (CodeSquare)", jsFile.slice(jsFile.length - 3)].join('');
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

		if (jsDoc.fileName.match("(CodeSquare)") == null)
			return;

		let we = new vscode.WorkspaceEdit();

		let startLine = 0;
		let endLine = 0;

		let originDoc = null;

		for (let i = 0; i < originDocs.length; i++) {

			let fileName = jsDoc.fileName.replace(" (CodeSquare)", '');
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

export function parseXML() {

	if (!vscode.window.activeTextEditor)
		return undefined;

	var parser = new xml2js.Parser();

	var xml = fs.readFileSync(vscode.window.activeTextEditor.document.fileName, 'utf-8');

	parser.parseString(xml, function (err: Object, result: string) {

		let json = JSON.parse(JSON.stringify(result));

		// parse datalist
		let dtl = json['html']['head'][0]['xf:model'][0]['w2:dataCollection'][0]['w2:dataList'];

		for (let i = 0; i < dtl.length; i++) {

			let dtlCols = dtl[i]['w2:columnInfo'][0]['w2:column'];

			let objDetails: IObjectDetail[] = [];

			for (let i = 0; i < dtlCols.length; i++) {
				objDetails[i] = {
					id: dtlCols[i]['$']['id'],
					name: dtlCols[i]['$']['name'],
					dataType: dtlCols[i]['$']['dataType'],
				}
			}

			let obj: IObjects = {
				type: "DataList",
				id: dtl[i]['$']['id'],
				objDetail: objDetails
			};

			objects.push(obj);
		}

		// parse datamap
		let dtm = json['html']['head'][0]['xf:model'][0]['w2:dataCollection'][0]['w2:dataMap'];

		for (let i = 0; i < dtm.length; i++) {

			let dtmKeys = dtm[i]['w2:keyInfo'][0]['w2:key'];

			let objDetails: IObjectDetail[] = [];

			for (let i = 0; i < dtmKeys.length; i++) {
				objDetails[i] = {
					id: dtmKeys[i]['$']['id'],
					name: dtmKeys[i]['$']['name'],
					dataType: dtmKeys[i]['$']['dataType'],
				}
			}

			let obj: IObjects = {
				type: "DataMap",
				id: dtm[i]['$']['id'],
				objDetail: objDetails
			};

			objects.push(obj);
		}
	});
}

export function completion() {

	// completion (object)
	vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
			token: vscode.CancellationToken, context: vscode.CompletionContext) {

			if (document.fileName.match("(CodeSquare)") == null)
				return;

			const commitCharacterCompletions: vscode.CompletionItem[] = [];

			for (let i = 0; i < objects.length; i++) {
				commitCharacterCompletions.push(new vscode.CompletionItem(
					objects[i]['id'], vscode.CompletionItemKind.Variable));
			}

			for (let i = 0; i < commitCharacterCompletions.length; i++) {
				commitCharacterCompletions[i].commitCharacters = ['.'];

				commitCharacterCompletions[i].documentation = new vscode.MarkdownString(
					'(' + objects[i]['type'] + ') ' + objects[i]['id']);
			}

			return commitCharacterCompletions;
		}
	});

	// completion (method, event, property)
	vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'javascript' }, {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			if (document.fileName.match("(CodeSquare)") == null)
				return;

			let linePrefix = document.lineAt(position).text.substr(0, position.character);

			let objType = undefined;

			for (let i = 0; i < objects.length; i++) {

				if (linePrefix.endsWith(objects[i]['id'] + '.')) {
					objType = objects[i]['type'];
				}
			}

			if (!objType) {
				return undefined;
			}

			const commitCharacterCompletions: vscode.CompletionItem[] = [];

			const methods = documentation[objType]['methods'];

			for (let i = 0; i < methods.length; i++) {
				commitCharacterCompletions.push(new vscode.CompletionItem(
					methods[i]['name'], vscode.CompletionItemKind.Method));
			}

			for (let i = 0; i < commitCharacterCompletions.length; i++) {
				let mks = new vscode.MarkdownString();
				let desc = methods[i]['documentation'];

				for (let j = 0; j < desc.length; j++) {
					mks.appendMarkdown(desc[j] + '  \n   \n');
				}

				commitCharacterCompletions[i].documentation = mks;
				commitCharacterCompletions[i].detail = "(method) " + methods[i]['label'];
			}

			return commitCharacterCompletions;
		}
	},
		'.'	// triggered whenever a '.' is being typed
	);

	// signature help
	vscode.languages.registerSignatureHelpProvider({ scheme: 'file', language: 'javascript' }, {
		provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position,
			token: vscode.CancellationToken, context: vscode.SignatureHelpContext) {

			if (document.fileName.match("(CodeSquare)") == null)
				return;

			let linePrefix = document.lineAt(position).text.substr(0, position.character);

			let objType = undefined;

			for (let i = 0; i < objects.length; i++) {

				if (linePrefix.match(objects[i]['id'] + '.')) {
					objType = objects[i]['type'];
				}
			}

			if (!objType) {
				return undefined;
			}

			let methodIdx = -1;
			const methods = documentation[objType]['methods'];

			for (let i = 0; i < methods.length; i++) {

				if (linePrefix.match(methods[i]['name'])) {
					methodIdx = i;
				}
			}

			if (methodIdx < 0) {
				return undefined;
			}

			const sigHelp = new vscode.SignatureHelp();

			let sign = new vscode.SignatureInformation(methods[methodIdx]['label'],
				methods[methodIdx]['documentation'][0])

			const params = methods[methodIdx]['parameters'];

			for (let i = 0; i < params.length; i++) {
				sign.parameters.push(params[i]['label']);
			}

			sigHelp.activeParameter = params.length;
			sigHelp.activeSignature = 0;
			sigHelp.signatures = [
				sign
			];

			return sigHelp;
		}
	}, {
			triggerCharacters: ['('],
			retriggerCharacters: [',']
		});

	vscode.languages.registerHoverProvider({ scheme: 'file', language: 'javascript' }, {
		provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {

			if (document.fileName.match("(CodeSquare)") == null)
				return;

			let isObj = true;
			let type = undefined;
			let objIdx = -1;
			let method = '';

			let word = wordExtract(document, position);

			if (!word)
				return undefined;

			// 추출된 문구가 Object인지 Method 인지 구분
			if (word.indexOf('(') > 0) {
				isObj = false;

				// Method인 경우 호출한 Object를 확인
				const documentLine = document.lineAt(position.line).text;
				let words: string[] = [];
				let preWords: string[] = [];

				let point = documentLine.indexOf(word) - 2;

				for (let i = point; i > -1; i--) {
					const w = documentLine[i];
					if (w == '.' || w == ' ') {
						break;
					} else {
						words.push(w);
					}
				}

				method = word;
				word = words.reverse().join('');
			}

			// object check
			for (let i = 0; i < objects.length; i++) {

				if (word.match(objects[i]['id'])) {
					type = objects[i]['type'];
					objIdx = i;
				}
			}

			if (!type)
				return undefined;

			// Websquare Object 인 경우
			if (isObj) {
				let md = new vscode.MarkdownString();
				md.appendMarkdown('(' + objects[objIdx]['type'] + ') ' + objects[objIdx]['id'] + '  \n  \n');

				//let desc = methods[methodIdx]['documentation'];

				md.appendMarkdown("|id|name|DataType|  \n");
				md.appendMarkdown("|---|---|---|  \n");

				let objD = objects[objIdx]['objDetail'];

				for (let i = 0; i < objD.length; i++) {
					md.appendMarkdown('|`' + objD[i].id + '`|' + objD[i].name + '|`' + objD[i].dataType + '`|   \n');
				}

				return new vscode.Hover(md);
			} else {
				// method
				let methodIdx = -1;
				const methods = documentation[type]['methods'];

				for (let i = 0; i < methods.length; i++) {

					if (method.match(methods[i]['name'])) {
						methodIdx = i;
					}
				}

				if (methodIdx < 0) {
					return undefined;
				}

				let md = new vscode.MarkdownString();
				md.appendCodeblock(objects[objIdx]['type'] + '.' + methods[methodIdx]['label']);

				let desc = methods[methodIdx]['documentation'];

				for (let j = 0; j < desc.length; j++) {
					md.appendMarkdown(desc[j] + '  \n   \n');
				}

				return new vscode.Hover(md);
			}
		}
	})
}

// hover시의 단어
function wordExtract(document: vscode.TextDocument, position: vscode.Position) {
	const line = position.line;
	const documentLine = document.lineAt(line).text;
	const lineLength = documentLine.length;
	const linePoint = position.character;

	let words: string[] = [];
	let preWords: string[] = [];

	for (let i = 0; i <= lineLength; i++) {
		const w = documentLine[i];
		if (/[a-zA-Z0-9_()]/.test(w)) {
			words.push(w);
		} else {
			preWords = words;
			words = [];
		}

		if (i >= linePoint && words.length === 0) {
			return preWords.join('');
		}
		if (lineLength === i) {
			return words.join('');
		}
	}
	return undefined;
}