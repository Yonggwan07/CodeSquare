'use strict';

import { CompletionItemProvider, TextDocument, ProviderResult, CompletionItem, CompletionList, Position, CompletionItemKind, MarkdownString } from "vscode";
import { IObject } from '../structure';
import { getObjectsByDocName, getObjectType } from "../util";

// Websquare Object's Method Completion Provider Class
export class WsMethodCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(document: TextDocument, position: Position): ProviderResult<CompletionItem[] | CompletionList> {

        const documentation = require('../../documentation.json');
        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열
        const objs: IObject[] = getObjectsByDocName(document);   // 해당 파일의 Objects

        if (objs.length <= 0)
            return undefined;

        // Object's Type Check
        const objType = getObjectType(document, position, objs);

        if (!objType) {
            return undefined;
        }

        // Method 목록
        const methods = documentation[objType];

        for (let i = 0; i < methods.length; i++) {
            let comItem = new CompletionItem(methods[i]['label'].substring(0, methods[i]['label'].indexOf('(')), CompletionItemKind.Method);
            let mks = new MarkdownString();
            let desc = methods[i]['documentation'];

            for (let j = 0; j < desc.length; j++) {
                mks.appendMarkdown(desc[j] + '  \n   \n');
            }

            comItem.documentation = mks;
            comItem.detail = "(method) " + methods[i]['label'];

            retCompletionItems.push(comItem);
        }

        return retCompletionItems;
    }
}