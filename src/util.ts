import { TextDocument, Position } from "vscode";
import { docObjects } from "./parser";

export const utils_w = ['data', 'local', 'top'];
export const utils_WebSquare = [
    'bigDecimal', 'collection', 'cookie', 'date', 'json', 'layer', 'localStorage',
    'logger', 'ModelUtil', 'net', 'session', 'style', 'util', 'xml'];

export const docLink = "https://docs.inswave.com/support/api/w5_sp2/5.0_2.3503B.20190305.163115/";
export const docPrefix = "WebSquare.uiplugin.";

const regex = /([a-z_\$][a-z0-9_]+\.)?([a-z_\$][a-z0-9_]+\.([a-z_][a-z0-9_]+)?)/gi;

/**
 * Method가 호출된 Object를 추출.
 */
export function getObjectName(document: TextDocument, position: Position) {
    const line = position.line;
    let documentLine = document.lineAt(line).text.substring(0, position.character);

    const matches = documentLine.match(regex);

    if (matches) {
        const elements = matches[matches.length - 1].split('.');

        if (elements.length === 3) {
            return elements[0] + '.' + elements[1];
        } else {
            return elements[0];
        }
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