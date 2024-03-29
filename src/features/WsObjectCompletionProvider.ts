'use strict';

import { ProviderResult, CompletionItem, CompletionItemProvider, CompletionItemKind, MarkdownString } from "vscode";
import { docObjects } from '../parser';

// Websquare Object Completion Provider Class
export class WsObjectCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(): ProviderResult<CompletionItem[]> {

        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열

        if (docObjects.length <= 0) {
            return undefined;
        }

        // $w
        const w = new CompletionItem('$w', CompletionItemKind.Class);
        w.detail = '$w';
        retCompletionItems.push(w);

        // WebSquare
        const ws = new CompletionItem('WebSquare', CompletionItemKind.Class);
        ws.detail = 'WebSquare';
        retCompletionItems.push(ws);

        // Page's Objects
        for (let i = 0; i < docObjects.length; i++) {
            const comItem = new CompletionItem(docObjects[i]['id'], CompletionItemKind.Variable);

            comItem.detail = '(' + docObjects[i]['type'] + ') ' + docObjects[i]['id'];

            // DataList, DataMap인 경우 ID, NAME, DataType을 표 형태로 출력
            const objD = docObjects[i]['objDetail'];

            if (objD !== undefined && objD.length > 0) {
                const md = new MarkdownString();
                md.appendMarkdown("|id|name|  \n");
                md.appendMarkdown("|---|---|  \n");

                for (let i = 0; i < objD.length; i++) {
                    md.appendMarkdown('|`' + objD[i].id + '`|' + objD[i].name + '|   \n');
                }

                comItem.documentation = md;
            }

            retCompletionItems.push(comItem);
        }

        return retCompletionItems;
    }
}