'use strict';

import { SignatureHelpProvider, TextDocument, Position, ProviderResult, SignatureHelp, SignatureInformation } from 'vscode';
import { IObject } from '../structure';
import { getObjectsByDocName, getObjectType } from '../util';

// Websquare Signature Help Provider Class
export class WsSignatureHelpProvider implements SignatureHelpProvider {

    provideSignatureHelp(document: TextDocument, position: Position): ProviderResult<SignatureHelp> {

        const documentation = require('../../documentation.json');
        const retSign = new SignatureHelp();    // return될 Signature Help
        const objs: IObject[] = getObjectsByDocName(document);   // 해당 파일의 Objects

        if (objs.length <= 0)
            return undefined;

        // Object's Type Check
        const objType = getObjectType(document, position, objs);

        if (!objType) {
            return undefined;
        }

        let mIdx = -1;  // Method Index
        const methods = documentation[objType]['methods'];
        const linePrefix = document.lineAt(position).text.substr(0, position.character);

        // Method 목록에서 해당되는 Method를 검색
        for (let i = 0; i < methods.length; i++) {

            if (linePrefix.match(methods[i]['name'])) {
                mIdx = i;
            }
        }

        if (mIdx < 0) {
            return undefined;
        }

        let signInfo = new SignatureInformation(methods[mIdx]['label'],
            methods[mIdx]['documentation'][0]);

        const params = methods[mIdx]['params'];     // Method의 Parameter 목록

        for (let i = 0; i < params.length; i++) {
            signInfo.parameters.push(params[i]['label']);
        }

        retSign.activeParameter = params.length;
        retSign.activeSignature = 0;
        retSign.signatures = [
            signInfo
        ];

        return retSign;
    }
}