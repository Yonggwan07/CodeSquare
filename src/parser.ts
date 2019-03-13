import { window, TextDocument } from "vscode";
import { IDocObject, IObject, IObjectDetail } from './structure'

import * as xml2js from 'xml2js';
import fs = require('fs');
import os = require('os');

export let docObjects: IDocObject[] = [];   // Websquare Objects (ex. dataMap, dataList...)
export let originDocs: TextDocument[] = []; // 원본 xml 파일

export const startWords: string[] = ["<script type=\"javascript\"><![CDATA[",
    "<script type=\"text/javascript\"><![CDATA["];
export const endWord = "]]></script>";

/**
 * Websquare Page Xml 문서로부터 JavaScript 부분만 Parsing
 */
export function wsParseJavascript(): string {
    if (!window.activeTextEditor)
        return '';

    let originDoc = window.activeTextEditor.document;

    originDocs.push(originDoc);
    let pickedDoc = originDoc.getText();

    let startIdx = -1;

    if (pickedDoc.indexOf(startWords[0]) > -1) {
        startIdx = pickedDoc.indexOf(startWords[0])	// javascript
            + new String(startWords[0]).length;
    } else {
        startIdx = pickedDoc.indexOf(startWords[1])	// text/javascript
            + new String(startWords[1]).length;
    }
    let endIdx = pickedDoc.indexOf(endWord);

    let pickedJS = pickedDoc.substring(startIdx, endIdx);
    pickedJS = pickedJS.substring(0, pickedJS.lastIndexOf("\n"));

    if (pickedJS == null)
        return '';

    // vscode extension 폴더에 임시 파일 생성
    let jsFilePath = "C:\\Users\\" + os.userInfo().username + "\\.vscode\\extensions\\";

    let dirList = fs.readdirSync(jsFilePath);

    for (let i = 0; i < dirList.length; i++) {
        if (dirList[i].includes("yonggwan.codesquare-") == true) {
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
        if (err) throw err;
    });

    return jsFilePath;
}

/**
 * Websquare Page Xml 문서로부터 Object 정보를 Parsing  
 * 새로운 CodeSquare 페이지를 열 때마다 호출되며  
 * 해당 페이지의 Object 정보를 docObjects에 추가
 */
export function wsParseObjectInfo() {

    if (!window.activeTextEditor)
        return [];

    const fileName = window.activeTextEditor.document.fileName;
    const parser = new xml2js.Parser();
    const xml = fs.readFileSync(fileName, 'utf-8');

    let objects: IObject[] = [];

    parser.parseString(xml, function (err: Object, result: string) {

        let parsedJson = JSON.parse(JSON.stringify(result));

        // parse datalist
        parseDataList(parsedJson, objects);

        // parse datamap
        parseDataMap(parsedJson, objects);

        // parse ....


        // Create DocObject
        let docObj: IDocObject = {
            docName: fileName,
            objects: objects
        }

        docObjects.push(docObj);
    });
}

function parseDataList(json: any, objects: IObject[]) {

    let dtl = json['html']['head'][0]['xf:model'][0]['w2:dataCollection'][0]['w2:dataList'];

    for (let i = 0; i < dtl.length; i++) {

        let dtlCols = dtl[i]['w2:columnInfo'][0]['w2:column'];

        let objDetails: IObjectDetail[] = [];

        for (let i = 0; i < dtlCols.length; i++) {
            objDetails[i] = {
                id: dtlCols[i]['$']['id'],
                name: dtlCols[i]['$']['name'],
                dataType: dtlCols[i]['$']['dataType'],
            }
        }

        let obj: IObject = {
            type: "DataList",
            id: dtl[i]['$']['id'],
            objDetail: objDetails
        };

        objects.push(obj);
    }
}

function parseDataMap(json: any, objects:IObject[]) {
    let dtm = json['html']['head'][0]['xf:model'][0]['w2:dataCollection'][0]['w2:dataMap'];

    for (let i = 0; i < dtm.length; i++) {

        let dtmKeys = dtm[i]['w2:keyInfo'][0]['w2:key'];

        let objDetails: IObjectDetail[] = [];

        for (let i = 0; i < dtmKeys.length; i++) {
            objDetails[i] = {
                id: dtmKeys[i]['$']['id'],
                name: dtmKeys[i]['$']['name'],
                dataType: dtmKeys[i]['$']['dataType'],
            }
        }

        let obj: IObject = {
            type: "DataMap",
            id: dtm[i]['$']['id'],
            objDetail: objDetails
        };

        objects.push(obj);
    }
}