'use strict';

import { CompletionItemProvider, TextDocument, ProviderResult, CompletionItem, CompletionList, Position, CompletionItemKind, MarkdownString } from "vscode";
import { getObjectType } from "../util";
import { docObjects, documentation, docLink, docPrefix } from "../parser";

// Websquare Object's Method Completion Provider Class
export class WsMethodCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(document: TextDocument, position: Position): ProviderResult<CompletionItem[] | CompletionList> {

        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열

        if (docObjects.length <= 0)
            return undefined;

        // Object's Type Check
        const objType = getObjectType(document, position);

        if (!objType) {
            return undefined;
        }

        // Method 목록
        const methods = documentation[objType];

        for (let i = 0; i < methods.length; i++) {
            const methodName = methods[i]['label'].substring(0, methods[i]['label'].indexOf('('));
            let comItem = new CompletionItem(methodName, CompletionItemKind.Method);
            let md = new MarkdownString();
            const desc = methods[i]['documentation'];
            
            for (let j = 0; j < desc.length; j++) {
                md.appendMarkdown(desc[j] + '  \n   \n');
            }

            md.appendMarkdown("@Link &mdash; [" + methodName + "]("
                + docLink + docPrefix + objType + "/" + docPrefix + objType + ".html#" + methodName + ")");

            comItem.documentation = md;
            comItem.detail = "(method) " + methods[i]['label'];

            retCompletionItems.push(comItem);
        }

        return retCompletionItems;
    }
}