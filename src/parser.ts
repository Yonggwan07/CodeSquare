import { window, TextDocument } from "vscode";
import { IObject, IObjectDetail, IDoc } from './structure';

import * as xml2js from 'xml2js';
import fs = require('fs');
import os = require('os');

// API Documentation
let doc$w: IDoc[] = [];
let docWebSquare: IDoc[] = [];
let docComponents: IDoc[] = [];

export let documentation = {
    $w: doc$w,
    WebSquare: docWebSquare,
    components: docComponents
};

export let docObjects: IObject[] = [];   // Websquare Objects (ex. dataMap, dataList...)
export let originDocs: TextDocument[] = []; // 원본 xml 파일

export const startWords: string[] = ["<script type=\"javascript\"><![CDATA[",
    "<script type=\"text/javascript\"><![CDATA["];
export const endWord = "]]></script>";

// 파싱하고자 하는 Websquare Component List
const ws = require('../wsComponent.json');
const wsComponents = ws['components'];

let searchedObj: any[] = [];    // Websquare Page Xml 파일로부터 Key 값을 통해 검색된 Object 배열

/**
 * Websquare Page Xml 문서로부터 JavaScript 부분만 Parsing
 */
export function wsParseJavascript(): string {
    if (!window.activeTextEditor) {
        return '';
    }

    let originDoc = window.activeTextEditor.document;

    originDocs.push(originDoc);
    let pickedDoc = originDoc.getText();

    let startIdx = -1;

    if (pickedDoc.indexOf(startWords[0]) !== -1 ||
        pickedDoc.indexOf(startWords[1]) !== -1) {

        if (pickedDoc.indexOf(startWords[0]) > -1) {
            startIdx = pickedDoc.indexOf(startWords[0])	// javascript
                + new String(startWords[0]).length;
        } else {
            startIdx = pickedDoc.indexOf(startWords[1])	// text/javascript
                + new String(startWords[1]).length;
        }

    }
    let endIdx = pickedDoc.indexOf(endWord, startIdx);

    if (startIdx === -1) {
        window.showErrorMessage("This is not Websquare Format document.");
        return '';
    }

    let pickedJS = pickedDoc.substring(startIdx, endIdx);
    pickedJS = pickedJS.trimRight();

    if (pickedJS === null) {
        return '';
    }

    // vscode extension 폴더에 임시 파일 생성
    let jsFilePath = "C:\\Users\\" + os.userInfo().username + "\\.vscode\\extensions\\";

    let dirList = fs.readdirSync(jsFilePath);

    for (let i = 0; i < dirList.length; i++) {
        if (dirList[i].includes("yonggwan.codesquare-") === true) {
            jsFilePath += dirList[i];
            break;
        }
    }

    // 파싱된 데이터를 통해 임시파일 생성
    let originName = originDoc.fileName;
    let jsFile = originName.replace(/.xml/, ".js");
    jsFile = [jsFile.slice(0, jsFile.length - 3), " (CodeSquare)", jsFile.slice(jsFile.length - 3)].join('');
    jsFile = jsFile.substring(jsFile.lastIndexOf("\\"), jsFile.length);

    jsFilePath += jsFile;

    fs.writeFile(jsFilePath, pickedJS, (err) => {
        if (err) {
            throw err;
        }
    });

    return jsFilePath;
}

/**
 * Websquare Page Xml 문서로부터 Object 정보를 Parsing  
 * 새로운 CodeSquare 페이지를 열 때마다 호출되며  
 * 해당 페이지의 Object 정보를 docObjects에 추가
 */
export function wsParseObjectInfo() {

    if (!window.activeTextEditor) {
        return [];
    }

    docObjects = [];

    const fileName = window.activeTextEditor.document.fileName;
    const parser = new xml2js.Parser({ explicitArray: false });
    const xml = fs.readFileSync(fileName, 'utf-8');

    let objects: IObject[] = [];

    parser.parseString(xml, function (err: string, result: string) {

        let parsedJson = JSON.parse(JSON.stringify(result));

        for (let i = 0; i < wsComponents.length; i++) {

            // 매 반복마다 searchedObj 초기화
            searchedObj = [];

            let resultObj = [];

            // Key 값에 따른 Object 검색
            searchByKey(parsedJson, wsComponents[i]['Tag']);

            for (let j = 0; j < searchedObj.length; j++) {
                if (getNodeType(searchedObj[j][0]) === 'String') {
                    if (getNodeType(searchedObj[j][1]) !== 'Array') {
                        resultObj.push(searchedObj[j][1]);
                    }
                    else {
                        for (let k = 0; k < searchedObj[j][1].length; k++) {
                            resultObj.push(searchedObj[j][1][k]);
                        }
                    }
                }
            }

            let objs = resultObj;

            if (objs.length === 0) {
                continue;
            }

            for (var obj of objs) {

                if (obj['$'] === undefined) {
                    continue;
                }

                if (obj['$']['id'] === undefined || obj['$']['id'] === '') {
                    continue;
                }

                let objDetails = undefined;

                if (wsComponents[i]['Name'] === 'dataList') {
                    let dtlCols = obj['w2:columnInfo']['w2:column'];

                    if (typeof dtlCols === 'undefined') {    // comlumn이 없는 경우
                        dtlCols = [];
                    } else if (dtlCols.constructor !== [].constructor) {    // comlumn이 1개인 경우
                        dtlCols = [dtlCols];
                    }

                    let colInfo: IObjectDetail[] = [];

                    for (let k = 0; k < dtlCols.length; k++) {
                        colInfo[k] = {
                            id: dtlCols[k]['$']['id'],
                            name: dtlCols[k]['$']['name'],
                            dataType: dtlCols[k]['$']['dataType'],
                        };
                    }

                    objDetails = colInfo;

                } else if (wsComponents[i]['Name'] === 'dataMap') {
                    let dtmKeys = obj['w2:keyInfo']['w2:key'];

                    if (typeof dtmKeys === 'undefined') {    // key가 없는 경우
                        dtmKeys = [];
                    } else if (dtmKeys.constructor !== [].constructor) {    // key가 1개인 경우
                        dtmKeys = [dtmKeys];
                    }

                    let keyInfo: IObjectDetail[] = [];

                    for (let k = 0; k < dtmKeys.length; k++) {
                        keyInfo[k] = {
                            id: dtmKeys[k]['$']['id'],
                            name: dtmKeys[k]['$']['name'],
                            dataType: dtmKeys[k]['$']['dataType'],
                        };
                    }

                    objDetails = keyInfo;
                }

                // 같은 xf:select1 태그를 사용하는 radio, selectbox에 대한 구분 처리
                if (wsComponents[i]['Name'] === 'radio') {

                    switch (obj['$']['appearance']) {
                        case "full":
                            objects.push({ type: 'radio', id: obj['$']['id'], objDetail: objDetails });
                            break;

                        case "minimal":
                            objects.push({ type: 'selectbox', id: obj['$']['id'], objDetail: objDetails });
                            break;
                    }

                } else {
                    objects.push({ type: wsComponents[i]['Name'], id: obj['$']['id'], objDetail: objDetails });
                }
            }
        }

        docObjects = objects;
    });
}

/**
 * 현재 활성화된 Document가 WebSquare Document 인지 확인
 */
export function isWsDocument(): Boolean {

    let retVal = false;

    if (!window.activeTextEditor) {
        return retVal;
    }

    const fileName = window.activeTextEditor.document.fileName;
    const parser = new xml2js.Parser({ explicitArray: false });
    const xml = fs.readFileSync(fileName, 'utf-8');

    parser.parseString(xml, function (err: string, result: string) {

        let parsedJson = JSON.parse(JSON.stringify(result));

        try {

            if (parsedJson['html']['$']['xmlns:w2'] === 'http://www.inswave.com/websquare') {
                retVal = true;
            }

        } catch (error) {
            return retVal;
        }

    });

    return retVal;
}

/**
 * get API Documentation
 */
export function getDocumentation() {

    // $w
    fs.readdirSync(__dirname + '/../documentation/$w/').forEach(element => {
        
        const json = fs.readFileSync(__dirname + '/../documentation/$w/' + element).toString();

        doc$w.push({
            type: element.substring(0, element.length - 5),
            documentation: json
        });

    });

    // WebSquare
    fs.readdirSync(__dirname + '/../documentation/WebSquare').forEach(element => {

        const json = fs.readFileSync(__dirname + '/../documentation/WebSquare/' + element).toString();

        docWebSquare.push({
            type: element.substring(0, element.length - 5),
            documentation: json
        });

    });

    // components
    fs.readdirSync(__dirname + '/../documentation/components').forEach(element => {

        const json = fs.readFileSync(__dirname + '/../documentation/components/' + element).toString();

        docComponents.push({
            type: element.substring(0, element.length - 5),
            documentation: json
        });

    });
}

/**
 * JSON Object 내에서 특정 Key의 Object를 반환
 * 
 * @param jsonObj JSON Object
 * @param k 검색할 Key Name
 */
function searchByKey(jsonObj: any, k: string): any {
    for (var key of Object.keys(jsonObj)) {

        let value = jsonObj[key];

        if (k === key) {
            // key 값과 일치하는 Object (검색결과)
            searchedObj.push([k, value]);
        }

        // 일치하는 Object가 나올 때까지 하위 Node를 검색
        if (getNodeType(value) === "Object") {

            var y = getSubNode(searchByKey(value, k));

            if (y && y[0] === k) {
                searchByKey(y, k);  // 한번 더 searchByKey를 호출하여 searchedObj에 push
            }

        } else if (getNodeType(value) === "Array") {

            for (var i = 0; i < value.length; ++i) {

                var x = getSubNode(searchByKey(value[i], k));

                if (x && x[0] === k) {
                    searchByKey(x, k);
                }
            }

        } else {
            continue;   // 검색되지 않은 경우 다음 Node로 이동
        }
    }
}

/**
 * [0] : Key Name (string)
 * 
 * [1] : Object Value Array
 * 
 * component Object 배열을 입력받아 위 구조의 배열이 나올 때 까지 하위 원소들을 검색하고
 * 
 * 위 구조의 배열이 검색되면 Object Value Array만 return
 */
function getSubNode(value: any): any {

    if (value === undefined) {
        return undefined;
    }

    if (getNodeType(value) === 'Array' && value.length > 0 && getNodeType(value[0]) === 'String') {

        // value[0]이 string인 경우 검색하고자 한 Object
        return value;

    } else {
        if (getNodeType(value) === 'Array' && value.length < 1) {
            return undefined;
        }
        else {
            // value[0]이 string인 경우 검색하고자 한 Object가
            // 아닌 경우 하위 원소에서 다시 검색
            return getSubNode(value[0]);
        }
    }
}

function getNodeType(object: any) {
    var stringConstructor = "test".constructor;
    var arrayConstructor = [].constructor;
    var objectConstructor = {}.constructor;

    if (object === null) {
        return "null";
    } else if (object === undefined) {
        return "undefined";
    } else if (object.constructor === stringConstructor) {
        return "String";
    } else if (object.constructor === arrayConstructor) {
        return "Array";
    } else if (object.constructor === objectConstructor) {
        return "Object";
    } else {
        return "null";
    }
}