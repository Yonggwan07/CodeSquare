'use strict';

import { HoverProvider, TextDocument, Position, ProviderResult, Hover, MarkdownString } from "vscode";
import { docObjects, documentation } from "../parser";
import { utils_w, utils_WebSquare, docLink, docPrefix } from "../util";

// Websquare Hover Provider Class
export class WsHoverProvider implements HoverProvider {

    provideHover(document: TextDocument, position: Position): ProviderResult<Hover> {

        let retHover = undefined;      // return될 Hover

        if (docObjects.length <= 0) {
            return undefined;
        }

        const hoveredWordRange = document.getWordRangeAtPosition(position); // Hover중인 문구의 Range
        if (!hoveredWordRange) {
            return undefined;
        }

        const hoveredWord = document.getText(hoveredWordRange);  // Hover 중인 문구

        let wordType = '';   // Hover중인 word가 Object인지 Method인지 구분
        let objName = '';
        let objType = '';
        let objIdx = -1;
        let methodName = '';

        if (!hoveredWord) {
            return undefined;
        }

        // Hover중인 word가 Object인지 Method인지 구분
        // Hover 중인 문구 다음 문자
        const suffix = document.lineAt(position.line).text.charAt(hoveredWordRange.end.character);
        if (suffix === '(') {
            wordType = "Method";

            methodName = hoveredWord;  // Hover중인 Method 명

            objName = document.getText(document.getWordRangeAtPosition(
                new Position(position.line, hoveredWordRange.start.character - 2), /[A-Za-z0-9_\$]+/)); // Hover중인 Method를 호출한 Object 명

            // WebSquare Utils ('$w', 'WebSquare') 인 경우
            if (utils_w.includes(objName) || utils_WebSquare.includes(objName)) {

                const preword = document.getText(document.getWordRangeAtPosition(
                    new Position(position.line, document.lineAt(position.line).text.lastIndexOf(objName) - 1), /[A-Za-z0-9_\$]+/));

                objName = preword + '.' + objName;
                objType = objName;
                objIdx = 1;
            } else if (objName === '$w') {
               objType = objName;
               objIdx = 1;
            }

        } else {
            wordType = "Object";
            objName = hoveredWord;
        }

        // WebSquare Utils ('$w', 'WebSquare')이 아닌 경우 Object의 Type과 Index를 확인
        if (objType === '') {
            for (let i = 0; i < docObjects.length; i++) {

                if (objName === docObjects[i]['id']) {
                    objType = docObjects[i]['type'];
                    objIdx = i;

                    break;
                }
            }
        }

        if (objType === '' || objIdx < 0) {
            return undefined;
        }

        let md = new MarkdownString();

        switch (wordType) {
            case "Object":
                md.appendCodeblock('(' + docObjects[objIdx]['type'] + ') ' + docObjects[objIdx]['id'] + '  \n  \n');

                let objD = docObjects[objIdx]['objDetail'];

                if (objD !== undefined) {
                    md.appendMarkdown("|id|name|  \n");
                    md.appendMarkdown("|---|---|  \n");

                    for (let i = 0; i < objD.length; i++) {
                        md.appendMarkdown('|`' + objD[i].id + '`|' + objD[i].name + '|   \n');
                    }
                }

                retHover = new Hover(md);

                break;

            case "Method":
                let mIdx = -1;

                let methods: any = "";

                if (objType.match(/\$w/)) { // '$w'
                    const type = objType.substring(objType.indexOf('.') + 1);

                    documentation.$w.forEach(element => {
                        if (element['type'] === type) {
                            methods = JSON.parse(element['documentation']);
                        }
                    });
                } else if (objType.match('WebSquare.')) {  // 'WebSquare'
                    const type = objType.substring(objType.indexOf('.') + 1);

                    documentation.WebSquare.forEach(element => {
                        if (element['type'] === type) {
                            methods = JSON.parse(element['documentation']);
                        }
                    });
                } else {    // 해당 Page의 Object인 경우
                    documentation.components.forEach(element => {
                        if (element['type'] === objType) {
                            methods = JSON.parse(element['documentation']);
                        }
                    });
                }

                if (methods === undefined || methods === "") {
                    return undefined;
                }

                for (let i = 0; i < methods.length; i++) {
                    if (methodName === methods[i]['label'].substring(0, methods[i]['label'].indexOf('('))) {
                        mIdx = i;
                        break;
                    }
                }

                if (mIdx < 0) {
                    return undefined;
                }

                if (objType.match(/\$w/) || objType.match('WebSquare.')) {  // $w 또는 WebSquare
                    md.appendCodeblock("(method) " + objType + '.' + methods[mIdx]['label'], 'javascript');
                } else {    // Object
                    md.appendCodeblock("(method) " + docObjects[objIdx]['type'] + '.' + methods[mIdx]['label'], 'javascript');
                }

                const desc = methods[mIdx]['documentation'];

                for (let j = 0; j < desc.length; j++) {
                    md.appendMarkdown(desc[j] + '  \n   \n');
                }

                // WebSquare API 문서 Link
                if (objType.match(/\$w/) || objType.match('WebSquare.')) {
                    md.appendMarkdown("@Link &mdash; [" + methodName + "]("
                        + docLink + objType + "/" + objType + ".html#" + methodName + ")");
                } else {
                    md.appendMarkdown("@Link &mdash; [" + methodName + "]("
                        + docLink + docPrefix + objType + "/" + docPrefix + objType + ".html#" + methodName + ")");
                }

                retHover = new Hover(md);

                break;

            default:
                return undefined;
        }

        return retHover;
    }
}