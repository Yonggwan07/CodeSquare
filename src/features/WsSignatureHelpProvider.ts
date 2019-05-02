'use strict';

import { SignatureHelpProvider, TextDocument, Position, ProviderResult, SignatureHelp, SignatureInformation, ParameterInformation } from 'vscode';
import { IObject } from '../structure';
import { getObjectsByDocName, getObjectType } from '../util';

const documentation = require('../../documentation.json');

// Websquare Signature Help Provider Class
export class WsSignatureHelpProvider implements SignatureHelpProvider {

    provideSignatureHelp(document: TextDocument, position: Position): ProviderResult<SignatureHelp> {

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
        const methods = documentation[objType];
        const linePrefix = document.lineAt(position).text.substr(0, position.character);

        // Method 목록에서 해당되는 Method를 검색
        for (let i = 0; i < methods.length; i++) {

            if (linePrefix.match(methods[i]['label'].substring(0, methods[i]['label'].indexOf('(')))) {
                mIdx = i;
            }
        }

        if (mIdx < 0) {
            return undefined;
        }

        let docs = methods[mIdx]['documentation'];
        let signInfo = new SignatureInformation(methods[mIdx]['label'], docs[0]);

        // Method의 Parameter 목록
        let params: string[] = [];
        let paramDocs: string[] = [];

        for (let i = 1; i < docs.length; i++) {
            if(docs[i].match("@param")) {
                params.push(docs[i].substring(docs[i].indexOf('`') + 1, docs[i].lastIndexOf('`')));
                paramDocs.push(docs[i].substring(
                    docs[i].indexOf("&mdash; ") + new String("&mdash; ").length, docs[i].length));
            }
        }

        for (let i = 0; i < params.length; i++) {
            signInfo.parameters.push(new ParameterInformation(params[i], paramDocs[i]));
        }

        retSign.activeParameter = params.length;
        retSign.activeSignature = 0;
        retSign.signatures = [
            signInfo
        ];

        return retSign;
    }
}