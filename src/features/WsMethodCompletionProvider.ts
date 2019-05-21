'use strict';

import { CompletionItemProvider, TextDocument, ProviderResult, CompletionItem, CompletionList, Position, CompletionItemKind, MarkdownString } from "vscode";
import { getObjectName, getObjectType, utils_WebSquare, utils_w, docLink, docPrefix } from "../util";
import { docObjects, documentation } from "../parser";

// Websquare Object's Method Completion Provider Class
export class WsMethodCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(document: TextDocument, position: Position): ProviderResult<CompletionItem[] | CompletionList> {

        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열

        // triggerCharacter가 제대로 작동하지 않음
        // '.'이외의 입력으로 호출되는 경우 return
        if (document.lineAt(position.line).text[position.character - 1] !== '.') {
            return undefined;
        }

        if (docObjects.length <= 0) {
            return undefined;
        }

        // Object's Type Check
        const objName = getObjectName(document, position);
        if (!objName || objName === '') {
            return undefined;
        }

        const objType = getObjectType(objName);
        if (!objType) {
            return undefined;
        }

        // Method 목록 가져오기
        if (objType === '$w') {  // $w

            utils_w.forEach(util => {
                const comItem = new CompletionItem(util, CompletionItemKind.Class);
                comItem.detail = "$w." + util;

                retCompletionItems.push(comItem);
            });

            let methods: any[] = [];

            documentation.$w.forEach(element => {
                if (element['type'] === '$w') {
                    methods = JSON.parse(element['documentation']);
                }
            });

            appendToCompletionItem(methods, retCompletionItems, '$w');

        } else if (objType === 'WebSquare' && !objType.match(/\./)) {    // WebSquare Utils
            utils_WebSquare.forEach(util => {
                const comItem = new CompletionItem(util, CompletionItemKind.Class);
                comItem.detail = "WebSquare." + util;

                retCompletionItems.push(comItem);
            });

        } else {    // Object Method 목록

            let methods: any = undefined;

            if (objType.match(/\$w/)) { // $w
                const type = objType.substring(objType.indexOf('.') + 1);

                documentation.$w.forEach(element => {
                    if (element['type'] === type) {
                        methods = JSON.parse(element['documentation']);
                    }
                });
            } else if (objType.match('WebSquare.')) {  // WebSquare Utils 인 경우
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

            // methods 목록의 데이터를 Completion Item으로 추가
            appendToCompletionItem(methods, retCompletionItems, objType);
        }

        return retCompletionItems;
    }
}

function appendToCompletionItem(list: any[], completionItem: CompletionItem[], objType: String) {
    for (let i = 0; i < list.length; i++) {
        const methodName = list[i]['label'].substring(0, list[i]['label'].indexOf('('));
        const comItem = new CompletionItem(methodName, CompletionItemKind.Method);
        const md = new MarkdownString();
        const desc = list[i]['documentation'];

        for (let j = 0; j < desc.length; j++) {
            md.appendMarkdown(desc[j] + '  \n   \n');
        }

        // WebSquare API 문서 Link
        if (objType.match('WebSquare.') || objType.match(/\$w/)) {
            md.appendMarkdown("@Link &mdash; [" + methodName + "]("
                + docLink + objType + "/" + objType + ".html#" + methodName + ")");
        } else {
            md.appendMarkdown("@Link &mdash; [" + methodName + "]("
                + docLink + docPrefix + objType + "/" + docPrefix + objType + ".html#" + methodName + ")");
        }

        comItem.documentation = md;
        comItem.detail = "(method) " + list[i]['label'];

        completionItem.push(comItem);
    }

    return completionItem;
}