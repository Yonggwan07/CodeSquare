import { TextDocument, Position } from "vscode";
import { IObject } from './structure'

// Object의 Type을 확인 (DataList인지 DataMap인지 등등...)
export function getObjectType(document: TextDocument, position: Position, objs: IObject[]): string | undefined {

    let lineText = document.lineAt(position).text.substr(0, position.character);
    let objType = undefined;

    for (let i = 0; i < objs.length; i++) {

        if (lineText.match(objs[i]['id'] + '.')) {
            objType = objs[i]['type'];
        }
    }

    return objType;
}