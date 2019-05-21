'use strict';

import { TextDocument, ProviderResult, CompletionItem, CompletionItemProvider, CompletionItemKind, MarkdownString } from "vscode";
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
        w.documentation = 'WebSquare에서 많이 쓰이는 Util성 API를 제공한다.\n본래는 WebSquare 객체 하위로 패키지 단위로 API가 구성되있으며 개발자의 편의성을 위해 API를 단축하여 제공하고 있다.';
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