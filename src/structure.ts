/**
 *      CodeSquare Structure List
 */

// DataList, DataMap 등의 Object 정보를 저장
export interface IDocObject {
    docName: string;        // 문서명
    objects: IObject[];   // 해당 문서의 Objects
}

export interface IObject {
    type: string;   // Object Type (ex. DataList, DataMap, Input...)
    id: string;     // Object ID
    objDetail: IObjectDetail[];     // DataList's Columns, DataMap's Keys
}

// DataList, DataMap의 세부 컬럼, 키 정보를 저장
export interface IObjectDetail {
    id: string;
    name: string;
    dataType: string;
}