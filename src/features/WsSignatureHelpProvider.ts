'use strict';

import { SignatureHelpProvider, TextDocument, Position, ProviderResult, SignatureHelp, SignatureInformation, ParameterInformation, Range } from 'vscode';
import { getObjectType } from '../util';
import { docObjects } from '../parser';

const documentation = require('../../documentation.json');

// Websquare Signature Help Provider Class
export class WsSignatureHelpProvider implements SignatureHelpProvider {

    provideSignatureHelp(document: TextDocument, position: Position): ProviderResult<SignatureHelp> {

        const retSign = new SignatureHelp();    // return될 Signature Help

        if (docObjects.length <= 0)
            return undefined;

        const txt = document.getText(new Range(new Position(0, 0), position));
        const nowChar = txt.substring(txt.length - 1);

        if (nowChar === ')' || nowChar === ';') {
            return undefined;
        }

        // Object's Type Check
        const objType = getObjectType(document, position);

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

        // get active parameter
        let lineText = document.lineAt(position.line).text;
        lineText = lineText.substring(lineText.substring(0, position.character).lastIndexOf('('), lineText.length);
        
        retSign.activeParameter = (lineText.match(/,/g) || []).length;
        retSign.activeSignature = 0;
        retSign.signatures = [
            signInfo
        ];

        return retSign;
    }
}