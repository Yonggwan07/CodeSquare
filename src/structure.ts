/**
 *      CodeSquare Structure List
 */

// DataList, DataMap 등의 Object 정보를 저장
export interface IObject {
    type: string;   // Object Type (ex. DataList, DataMap, Input...)
    id: string;     // Object ID
    objDetail?: IObjectDetail[];     // DataList's Columns, DataMap's Keys
}

// DataList, DataMap의 세부 컬럼, 키 정보를 저장
export interface IObjectDetail {
    id: string;
    name: string;
}

// API Documentation Structure
export interface IDoc {
    type: string;
    documentation: string;
}