import { TextDocument, Position } from "vscode";
import { IObject } from './structure'
import { docObjects } from "./parser";

export function getObjectsByDocName(document: TextDocument): IObject[] {

    // Websquare Page인지 확인
    if (!document.fileName.match("(CodeSquare)"))
        return [];

    // 현재 페이지 이름에서 파일명만 추출
    const docName = document.fileName.substring(
        document.fileName.lastIndexOf('\\') + 1, document.fileName.length - 16);

    let objs: IObject[] = [];   // 해당 파일의 Objects

    // 현재 페이지의 Objects를 가져옴
    for (let i = 0; i < docObjects.length; i++) {
        if (docObjects[i]['docName'].match(docName))
            objs = docObjects[i]['objects'];
    }

    if (objs.length <= 0)
        return [];
    else
        return objs;
}

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