'use strict'

import fs = require('fs');

import { TextDocument, window, workspace, WorkspaceEdit, Range } from 'vscode';
import { wsParseObjectInfo, docObjects, wsParseJavascript, originDocs, startWords, endWord } from './parser';

let jsDocs: TextDocument[] = [];			// 임시 js 파일

export class WorkspaceContext {

    public static openNewWsPage() {
        // 현재 활성화된 document를 확인
        if (!window.activeTextEditor)
            return;

        // Websquare Object Parsing
        wsParseObjectInfo();

        if (docObjects.length <= 0)
            return;

        // 원본 xml 파일에서 javascript 부분만 파싱
        let jsFilePath = wsParseJavascript();

        if (jsFilePath == '')
            return;

        workspace.openTextDocument(jsFilePath).then(document => {
            jsDocs.push(document);
            window.showTextDocument(document);
        });
    }

    public static onSave() {
        if (!window.activeTextEditor)
            return;

        let jsDoc = window.activeTextEditor.document;

        if (jsDoc.fileName.indexOf("(CodeSquare)") == -1)
            return;

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

                break;
            }
        }

        let jsText = jsDoc.getText();

        we.replace(originDoc.uri, new Range(
            startLine, startWord.length +
            originDoc.lineAt(startLine).text.split(' ').length - 1, endLine, 0), jsText);

        workspace.applyEdit(we);

        // 파일 저장시 원본 xml 파일도 함께 저장 (미작동)
        originDoc.save();
    }
 
    public static onClose(doc: TextDocument) {
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

        let we = new WorkspaceEdit();

        we.deleteFile(jsDoc.uri);
        workspace.applyEdit(we);
    }

    public static deactivate() {
        for (let i = 0; i < jsDocs.length; i++)
            fs.unlink(jsDocs[i].fileName, (err) => { });
    }
}