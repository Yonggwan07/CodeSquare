'use strict';

import { SignatureHelpProvider, TextDocument, Position, ProviderResult, SignatureHelp, SignatureInformation, ParameterInformation } from 'vscode';
import { getObjectType } from '../util';
import { docObjects, documentation } from '../parser';

// Websquare Signature Help Provider Class
export class WsSignatureHelpProvider implements SignatureHelpProvider {

    provideSignatureHelp(document: TextDocument, position: Position): ProviderResult<SignatureHelp> {

        const retSign = new SignatureHelp();    // return될 Signature Help

        if (docObjects.length <= 0) {
            return undefined;
        }

        // 마지막 입력된 문자가 ')', ';'이면 signature help 종료
        const lastChar = document.lineAt(position.line).text[position.character - 1];
        if (lastChar === ')' || lastChar === ';') {
            return undefined;
        }

        // Object's Type Check
        const objName = getName(document, position, "Object");
        if (!objName || objName === '') {
            return undefined;
        }

        const objType = getObjectType(objName);

        if (!objType) {
            return undefined;
        }

        let mIdx = -1;  // Method Index

        let methods: any = "";

        // Get Methods List
        if (objType.match(/\$w/)) { // $w

            documentation.$w.forEach(element => {

                const type = objType.substring(objType.indexOf('.') + 1);

                if (element['type'] === type) {
                    methods = JSON.parse(element['documentation']);
                }

            });

        } else if (objType.match('WebSquare.')) {   // Websquare
            documentation.WebSquare.forEach(element => {

                const type = objType.substring(objType.indexOf('.') + 1);

                if (element['type'] === type) {
                    methods = JSON.parse(element['documentation']);
                }

            });
        } else {    // Page's Object
            documentation.components.forEach(element => {

                if (element['type'] === objType) {
                    methods = JSON.parse(element['documentation']);
                }

            });
        }

        // Method Name 추출
        const methodName = getName(document, position, "Method");

        // Method 목록에서 해당되는 Method를 검색
        for (let i = 0; i < methods.length; i++) {

            if (methodName === methods[i]['label'].substring(0, methods[i]['label'].indexOf('('))) {
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
            if (docs[i].match("@param")) {
                params.push(docs[i].substring(docs[i].indexOf('`') + 1, docs[i].lastIndexOf('`')));
                paramDocs.push(docs[i].substring(
                    docs[i].indexOf("&mdash; ") + new String("&mdash; ").length, docs[i].length));
            }
        }

        for (let i = 0; i < params.length; i++) {
            signInfo.parameters.push(new ParameterInformation(params[i], paramDocs[i]));
        }

        // get active parameter
        const caller = objName + '.' + methodName;
        let lineText = document.lineAt(position.line).text;
        lineText = lineText.substring(
            lineText.lastIndexOf(caller) + caller.length, position.character);

        let bracket = false;
        let bracketCnt = 0;
        let commaCnt = 0;

        for (let i = 1; i < lineText.length; i++) {
            if (lineText.charAt(i) === '(') {
                bracket = true;
                bracketCnt++;
            }

            if (bracket && lineText.charAt(i) === ')' && bracketCnt > 0) {
                bracket = false;
                bracketCnt--;
            }

            if (!bracket && lineText.charAt(i) === ',') {
                commaCnt++;
            }
        }

        retSign.activeParameter = commaCnt;
        retSign.activeSignature = 0;
        retSign.signatures = [
            signInfo
        ];

        return retSign;
    }
}

/**
 * Signature Help를 띄울 Object와 Method의 이름을 반환
 * 
 * @param type 이름을 반환할 대상 ('Object' 또는 'Method')
 */
function getName(document: TextDocument, position: Position, type: String) {
    const line = position.line;
    let lineText = document.lineAt(line).text.substring(0, position.character);

    let bracketCnt = 0;

    let idx = -1;

    for (let i = lineText.length - 1; i >= 0; i--) {
        if (lineText.charAt(i) === ')') {
            bracketCnt++;
        }

        if (lineText.charAt(i) === '(' && bracketCnt > 0) {
            bracketCnt--;
        } else if (lineText.charAt(i) === '(' && bracketCnt === 0) {
            idx = i;
            break;
        }
    }

    lineText = lineText.substring(0, idx);

    const matchList = lineText.match(/([A-Za-z_\$][A-Za-z0-9_]+\.)?([A-Za-z_\$][A-Za-z0-9_]+\.([A-Za-z_][A-Za-z0-9_]+)?)/g);

    if (matchList && matchList.length > 0) {
        const elements = matchList[matchList.length - 1].split('.');

        if (elements.length === 3) {
            if (type === 'Object') {
                return elements[0] + '.' + elements[1];
            } else {
                return elements[2];
            }
        } else {
            if (type === 'Object') {
                return elements[0];
            } else {
                return elements[1];
            }
        }
    }
}