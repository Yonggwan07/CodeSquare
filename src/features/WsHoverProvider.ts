'use strict'

import { HoverProvider, TextDocument, Position, ProviderResult, Hover, MarkdownString } from "vscode";
import { IObject } from "../structure";
import { getObjectsByDocName } from "../util";

// Websquare Hover Provider Class
export class WsHoverProvider implements HoverProvider {

    provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

        const documentation = require('../../documentation.json');
        let retHover = undefined;      // return될 Hover
        const objs: IObject[] = getObjectsByDocName(document);   // 해당 파일의 Objects

        if (objs.length <= 0)
            return undefined;

        let word = this.wordExtract(document, position);    // Hover중인 문구
        let wordType = '';   // Hover중인 word가 Object인지 Method인지 구분
        let objName = '';
        let objType = '';
        let objIdx = -1;
        let methodName = '';

        if(!word)
            return undefined;

        // Hover중인 word가 Object인지 Method인지 구분
        if (word.indexOf('(') > 0) {
            wordType = "Method";

            // Method인 경우 호출한 Object ID를 추출
            const lineText = document.lineAt(position.line).text;

            let words: string[] = [];
            let point = lineText.indexOf(word) - 2;

            for (let i = point; i > -1; i--) {
                const w = lineText[i];
                if (w == '.' || w == ' ') {
                    break;
                } else {
                    words.push(w);
                }
            }

            methodName = word;  // Hover중인 Method 명
            objName = words.reverse().join(''); // Hover중인 Method를 호출한 Object 명

        } else {
            wordType = "Object";
            objName = word;
        }

        // Object의 Type과 Index를 확인
        for (let i = 0; i < objs.length; i++) {

            if (objName.match(objs[i]['id'])) {
                objType = objs[i]['type'];
                objIdx = i;
            }
        }

        if(objType == '' || objIdx < 0)
            return undefined;

        let md = new MarkdownString();

        switch(wordType){
            case "Object":
                md.appendMarkdown('(' + objs[objIdx]['type'] + ') ' + objs[objIdx]['id'] + '  \n  \n');
                md.appendMarkdown("|id|name|DataType|  \n");
                md.appendMarkdown("|---|---|---|  \n");

                let objD = objs[objIdx]['objDetail'];

                for (let i = 0; i < objD.length; i++) {
                    md.appendMarkdown('|`' + objD[i].id + '`|' + objD[i].name + '|`' + objD[i].dataType + '`|   \n');
                }

                retHover = new Hover(md);

                break;

            case "Method":
                let mIdx = -1;
                const methods = documentation[objType]['methods'];

                for (let i = 0; i < methods.length; i++) {

                    if (methodName.match(methods[i]['name'])) {
                        mIdx = i;
                    }
                }

                if (mIdx < 0) {
                    return undefined;
                }

                md.appendCodeblock(objs[objIdx]['type'] + '.' + methods[mIdx]['label']);

                let desc = methods[mIdx]['documentation'];

                for (let j = 0; j < desc.length; j++) {
                    md.appendMarkdown(desc[j] + '  \n   \n');
                }

                retHover = new Hover(md);

                break;

            default:
                return undefined;
        }

        return retHover;
    }

    // hover중인 word
    // word에는 알파벳, 숫자, '_', '(', ')'만 포함 가능
    wordExtract(document: TextDocument, position: Position) {
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
}