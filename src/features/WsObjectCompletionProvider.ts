'use strict';

import { TextDocument, ProviderResult, CompletionItem, CompletionItemProvider, CompletionItemKind, MarkdownString } from "vscode";
import { docObjects } from '../parser';

// Websquare Object Completion Provider Class
export class WsObjectCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(document: TextDocument): ProviderResult<CompletionItem[]> {

        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열

        if (docObjects.length <= 0)
            return undefined;

        for (let i = 0; i < docObjects.length; i++) {
            let comItem = new CompletionItem(docObjects[i]['id'], CompletionItemKind.Variable);

            comItem.detail = '(' + docObjects[i]['type'] + ') ' + docObjects[i]['id'];

            // DataList, DataMap인 경우 ID, NAME, DataType을 표 형태로 출력
            let objD = docObjects[i]['objDetail'];

            if (objD != undefined && objD.length > 0) {
                let md = new MarkdownString();
                md.appendMarkdown("|id|name|DataType|  \n");
                md.appendMarkdown("|---|---|---|  \n");

                for (let i = 0; i < objD.length; i++) {
                    md.appendMarkdown('|`' + objD[i].id + '`|' + objD[i].name + '|`' + objD[i].dataType + '`|   \n');
                }

                comItem.documentation = md;
            }

            retCompletionItems.push(comItem);
        }

        return retCompletionItems;
    }
}