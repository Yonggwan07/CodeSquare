import { window, TextDocument } from "vscode";
import { IObject, IObjectDetail, IDoc } from './structure';

import * as xml2js from 'xml2js';
import fs = require('fs');
import os = require('os');

// API Documentation
const doc$w: IDoc[] = [];
const docWebSquare: IDoc[] = [];
const docComponents: IDoc[] = [];

export const documentation = {
    $w: doc$w,
    WebSquare: docWebSquare,
    components: docComponents
};

export let docObjects: IObject[] = [];   // Websquare Objects (ex. dataMap, dataList...)
export let originDocs: TextDocument[] = []; // 원본 xml 파일

const isWsRegex = /xmlns:w2.*inswave.*websquare/;
const regex = /<(script)\s+type=[\"\'](text\/)?javascript[\"\']>\s*<!\[CDATA\[([\s\S]*)(\]\]>\s*<\/\1>)/i;

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
    if (!originDoc.getText().match(isWsRegex)) {
        window.showErrorMessage("This is not Websquare Format document.");
        return '';
    } else {
        originDocs.push(originDoc);
    }

    const matches = originDoc.getText().match(regex);
    if (!matches) {
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
    let jsFile = originDoc.fileName.replace(/.xml/, ".js");
    jsFile = jsFile.slice(0, jsFile.length - 3) + " (CodeSquare)" + jsFile.slice(jsFile.length - 3);
    jsFile = jsFile.substring(jsFile.lastIndexOf("\\"), jsFile.length);

    jsFilePath += jsFile;

    fs.writeFile(jsFilePath, matches[3], (err) => {
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
        return;
    }

    docObjects = [];

    const docText = window.activeTextEditor.document.getText();

    let objects: IObject[] = [];

    for (let i = 0; i < wsComponents.length; i++) {
        let resultObj: string[] = [];

        const regex1 = "<";
        const regex2 = "[^<]*?id=[\"\']([a-zA-Z0-9_]+)[\"\'][^>]*?>";

        const reg = new RegExp(regex1 + wsComponents[i]['Tag'] + regex2, 'g');

        if (!window.activeTextEditor) {
            return;
        }

        let matches;

        while ((matches = reg.exec(docText)) !== null) {
            for (let i = 1; i < matches.length; i++) {
                resultObj.push(matches[i]);
            }
        }

        let objs = resultObj;

        if (objs.length === 0) {
            continue;
        }

        for (let obj of objs) {

            let objDetails = undefined;

            if (wsComponents[i]['Name'] === 'dataList') {
                const dtlRegex = new RegExp("<(w2:dataList).*?" + obj + "[\\s\\S]*?<\\/\\1>");
                const idRegex = /<w2:column [^<]*?id=[\"\']([a-zA-Z0-9_]+?)[\"\'][^>]*?>/g;
                const nameRegex = /<w2:column [^<]*?name=[\"\'](.+?)[\"\'][^>]*?>/g;

                const colInfo: IObjectDetail[] = [];

                let id;
                let name;
                let dtlMatch;
                if ((dtlMatch = dtlRegex.exec(docText)) !== null) {
                    const ids: string[] = [];
                    const names: string[] = [];

                    while ((id = idRegex.exec(dtlMatch[0])) !== null) {
                        ids.push(id[1]);
                    }
                    while ((name = nameRegex.exec(dtlMatch[0])) !== null) {
                        names.push(name[1]);
                    }

                    for (let i = 0; i < ids.length; i++) {
                        colInfo[i] = {
                            id: ids[i],
                            name: names[i]
                        };
                    }

                    objDetails = colInfo;

                    objects.push({ type: wsComponents[i]['Name'], id: obj, objDetail: objDetails });
                }

                continue;

            } else if (wsComponents[i]['Name'] === 'dataMap') {
                const dtmRegex = new RegExp("<(w2:dataMap).*?" + obj + "[\\s\\S]*?<\\/\\1>");
                const idRegex = /<w2:key [^<]*?id=[\"\']([a-zA-Z0-9_]+?)[\"\'][^>]*?>/g;
                const nameRegex = /<w2:key [^<]*?name=[\"\'](.+?)[\"\'][^>]*?>/g;

                const keyInfo: IObjectDetail[] = [];

                let id;
                let name;
                let dtmMatch;
                if ((dtmMatch = dtmRegex.exec(docText)) !== null) {
                    const ids: string[] = [];
                    const names: string[] = [];

                    while ((id = idRegex.exec(dtmMatch[0])) !== null) {
                        ids.push(id[1]);
                    }
                    while ((name = nameRegex.exec(dtmMatch[0])) !== null) {
                        names.push(name[1]);
                    }

                    for (let i = 0; i < ids.length; i++) {
                        keyInfo[i] = {
                            id: ids[i],
                            name: names[i]
                        };
                    }

                    objDetails = keyInfo;

                    objects.push({ type: wsComponents[i]['Name'], id: obj, objDetail: objDetails });
                }

                continue;
            }

            // 같은 xf:select1 태그를 사용하는 radio, selectbox에 대한 구분 처리
            if (wsComponents[i]['Name'] === 'radio') {
                const radioRegex = /<(xf:select1)[\s\S]*?id=\"([a-zA-Z0-9_]+)\"[\s\S]*?<\/\1>/g;
                const apRegex = /<xf:select1.*appearance=[\"\']([^\"\']+)[\"\'][\s\S]*?>/;    // appearance tag

                let radioMatch;
                let apMatch;
                while ((radioMatch = radioRegex.exec(docText)) !== null) {
                    if (radioMatch[2] === obj && (apMatch = apRegex.exec(radioMatch[0])) !== null) {
                        switch (apMatch[1]) {
                            case "full":
                                objects.push({ type: 'radio', id: obj, objDetail: objDetails });
                                break;

                            case "minimal":
                                objects.push({ type: 'selectbox', id: obj, objDetail: objDetails });
                                break;
                        }
                    }
                }

            } else {
                objects.push({ type: wsComponents[i]['Name'], id: obj, objDetail: objDetails });
            }
        }
    }

    docObjects = objects;
}

/**
 * 현재 활성화된 Document가 WebSquare Document 인지 확인
 */
export function isWsDocument(): Boolean {

    if (!window.activeTextEditor) {
        return false;
    }

    return window.activeTextEditor.document.getText().match(isWsRegex) ? true : false;
}

/**
 * load API Documentation
 */
export function loadDocumentation() {

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