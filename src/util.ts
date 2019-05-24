import { TextDocument, Position } from "vscode";
import { docObjects } from "./parser";

export const utils_w = ['data', 'local', 'top'];
export const utils_WebSquare = [
    'bigDecimal', 'collection', 'cookie', 'date', 'json', 'layer', 'localStorage',
    'logger', 'ModelUtil', 'net', 'session', 'style', 'util', 'xml'];

export const docLink = "https://docs.inswave.com/support/api/w5_sp2/5.0_2.3503B.20190305.163115/";
export const docPrefix = "WebSquare.uiplugin.";

const regex = /([A-Za-z_\$][A-Za-z0-9_]+\.)?([A-Za-z_\$][A-Za-z0-9_]+\.([A-Za-z_][A-Za-z0-9_]+)?)/g;

/**
 * Method가 호출된 Object를 추출.
 */
export function getObjectName(document: TextDocument, position: Position) {
    const line = position.line;
    let documentLine = document.lineAt(line).text.substring(0, position.character);

    const matchList = documentLine.match(regex);

    if (matchList && matchList.length > 0) {
        const elements = matchList[matchList.length - 1].split('.');

        if (elements.length === 3) {
            return elements[0] + '.' + elements[1];
        } else {
            return elements[0];
        }
    }
}

/**
 * Method 명을 추출
 */
export function getMethodName(document: TextDocument, position: Position) {
    const line = position.line;
    let documentLine = document.lineAt(line).text.substring(0, position.character - 1);

    const matchList = documentLine.match(regex);

    if (matchList && matchList.length > 0) {
        const elements = matchList[matchList.length - 1].split('.');

        return elements[elements.length - 1];
    }
}

/**
 * Object의 Type을 확인 (DataList인지 DataMap인지 등등...)
 */
export function getObjectType(word: String) {

    let objType = "";

    if (word.match(/\$w/) || word.match('WebSquare')) {
        return word;
    }

    for (let i = 0; i < docObjects.length; i++) {

        if (word.match(docObjects[i]['id'])) {
            objType = docObjects[i]['type'];
            break;
        }
    }

    return objType;
}