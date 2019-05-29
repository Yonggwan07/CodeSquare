'use strict';

import fs = require('fs');

import { TextDocument, window, workspace, WorkspaceEdit, Range } from 'vscode';
import { wsParseObjectInfo, docObjects, wsParseJavascript, originDocs } from './parser';

const startRegex = /<script type="(text\/)?javascript"><!\[CDATA\[(\s*)/i;
const endRegex = /\]\]><\/script>/i;

const jsDocs: TextDocument[] = [];			// 임시 js 파일

export class WorkspaceContext {

    public static openNewWsPage() {
        // 현재 활성화된 document를 확인
        if (!window.activeTextEditor) {
            return;
        }

        // Websquare Object Parsing
        wsParseObjectInfo();

        if (docObjects.length <= 0) {
            return;
        }

        // 원본 xml 파일에서 javascript 부분만 파싱
        let jsFilePath = wsParseJavascript();

        if (jsFilePath === '') {
            return;
        }

        workspace.openTextDocument(jsFilePath).then(document => {
            jsDocs.push(document);
            window.showTextDocument(document);
        });
    }

    public static onSave() {
        if (!window.activeTextEditor) {
            return;
        }

        let jsDoc = window.activeTextEditor.document;

        if (jsDoc.fileName.indexOf("(CodeSquare)") === -1) {
            return;
        }

        let we = new WorkspaceEdit();

        let startLine = 0;
        let endLine = 0;

        let originDoc = null;

        for (let i = 0; i < originDocs.length; i++) {

            let fileName = jsDoc.fileName.replace(" (CodeSquare)", '');
            fileName = fileName.substring(fileName.lastIndexOf("\\") + 1, fileName.length);
            fileName = fileName.replace(".js", ".xml");

            let originFileName = originDocs[i].fileName.substring(
                originDocs[i].fileName.lastIndexOf("\\") + 1, originDocs[i].fileName.length);

            if (fileName === originFileName) {
                originDoc = originDocs[i];
            }
        }

        if (originDoc === null) {
            window.showErrorMessage("[CodeSquare] ERROR: Can not saved.");
            return;
        }

        let startIdx = 0;
        let endIdx = 0;

        for (let lineNumber = 0; lineNumber < originDoc.lineCount; lineNumber++) {
            let lineText = originDoc.lineAt(lineNumber);

            let matches;
            
            if ((matches = lineText.text.match(startRegex)) !== null) {
                startIdx = matches[0].length;
                startLine = lineNumber;
            }

            if((matches = lineText.text.match(endRegex)) !== null) {
                endIdx = matches.index ? matches.index : 0;
                endLine = lineNumber;
                break;
            }
        }

        let jsText = jsDoc.getText();

        we.replace(originDoc.uri, new Range(startLine, startIdx, endLine, endIdx), jsText);

        workspace.applyEdit(we);
        
        // 파일 저장시 원본 xml 파일도 함께 저장 (미작동)
        originDoc.save();
    }
 
    public static onClose(doc: TextDocument) {
        if (doc.uri.scheme === 'git') {
            return;
        }

        let jsDoc = null;

        for (let i = 0; i < jsDocs.length; i++) {
            if (jsDocs[i].fileName === doc.fileName) {
                jsDoc = jsDocs[i];

                originDocs.splice(i, 1);
                jsDocs.splice(i, 1);
            }
        }

        if (!jsDoc) {
            return;
        }

        if (!doc.isClosed) {
            return;
        }

        fs.unlink(jsDoc.fileName, (err) => { });
    }

    public static deactivate() {
        for (let i = 0; i < jsDocs.length; i++) {
            fs.unlink(jsDocs[i].fileName, (err) => { });
        }
    }
}