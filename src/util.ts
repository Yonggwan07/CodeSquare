import { TextDocument, Position } from "vscode";
import { docObjects } from "./parser";

/**
 * Object의 Type을 확인 (DataList인지 DataMap인지 등등...)
 * 
 * @param document 현재 활성화된 WebSquare Document
 * @param position 문서에서 현재 가리키고 있는 position
 */
export function getObjectType(document: TextDocument, position: Position): string | undefined {

    let lineText = document.lineAt(position).text.substr(0, position.character);
    let objType = undefined;

    for (let i = 0; i < docObjects.length; i++) {

        if (lineText.match(docObjects[i]['id'] + '.')) {
            objType = docObjects[i]['type'];
        }
    }

    return objType;
}