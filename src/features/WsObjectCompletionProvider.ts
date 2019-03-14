'use strict';

import { TextDocument, ProviderResult, CompletionItem, CompletionItemProvider, CompletionItemKind, MarkdownString } from "vscode";
import { IObject } from '../structure';
import { getObjectsByDocName } from '../util';

// Websquare Object Completion Provider Class
export class WsObjectCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(document: TextDocument): ProviderResult<CompletionItem[]> {

        const retCompletionItems: CompletionItem[] = [];   // return될 completion item 배열
        const objs: IObject[] = getObjectsByDocName(document);   // 해당 파일의 Objects

        if (objs.length <= 0)
            return undefined;

        for (let i = 0; i < objs.length; i++) {
            let comItem = new CompletionItem(objs[i]['id'], CompletionItemKind.Variable);

            comItem.detail = '(' + objs[i]['type'] + ') ' + objs[i]['id'];

            // DataList, DataMap인 경우 ID, NAME, DataType을 표 형태로 출력
            let objD = objs[i]['objDetail'];

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