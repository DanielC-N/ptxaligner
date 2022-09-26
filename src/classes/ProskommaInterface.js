import { Proskomma } from 'proskomma';
import Axios from "axios";
const path = require("path");
const fse = require("fs-extra");

class ProskommaInterface {

    constructor(verbose=false) {
        let proskomma = new Proskomma();
        const query = `{ id }`;
        const content = proskomma.gqlQuerySync(query) || {};

        if (!content || !content.data.id) {
            throw new Error("Failed to instantiate Proskomma");
        }

        this.proskomma = proskomma;
        this.usfms = {};
        this.verbose = verbose;
    }

    getInstance() {
        return this.proskomma;
    }

    getUsfms() {
        return this.usfms;
    }

    getIdsUsfms() {
        return Object.keys(this.usfms);
    }

    getUsfm(docSetId) {
        return this.usfms[docSetId];
    }

    async getIds() {
        let listIds = await this.queryPk("{ documents { id } }");
        let arrayIds = [];
        listIds.data.documents.forEach(element => {
            arrayIds.push(element.id);
        });
        let getSpecificId = await this.queryPk(`{ documents(ids:"${arrayIds[0]}") { docSetId } }`);
        // let getSpecificId = await this.queryPk(`{ documents { id docSetId headers { key value } } }`);
        // let getSpecificId = await this.queryPk(`{ documents { docSetId } }`);
        let myKeyUsfm = getSpecificId.data.documents[0].docSetId;
        let theUsfm = this.usfms[myKeyUsfm];
        // console.log(JSON.stringify(getSpecificId, null, 2));
        console.log(theUsfm);
    }

    /**
     * Add a document to the Proskomma instance
     * @param {string} rpath the relative path to the document
     * @param {string} codeLang the code of the language ["eng", "fra", "grk"]
     */
    async addDocument(rpath, codeLang="fra", abbr="ust") {
        let content = fse.readFileSync(path.resolve(__dirname, rpath)).toString();
        const mutation = `mutation { addDocument(` +
            `selectors: [{key: "lang", value: "${codeLang}"}, {key: "abbr", value: "${abbr}"}], ` +
            `contentType: "usfm", ` +
            `content: """${content}""") }`;
        const docSetId = codeLang + "_" + abbr;
        let res = await this.queryPk(mutation);
        // does the mutation worked ?
        if(res.data.addDocument) {
            this.usfms[docSetId] = content;
        }
    }

    async testDocument(docSetId) {
        let test = await this.queryPk(`{ documents(docSetId:\"${docSetId}\") { id } }`);
        console.log("test docSetId :",test);
    }

    async addRawDocument(fullText, codeLang="fra", abbr="ust") {
        const mutation = `mutation { addDocument(` +
            `selectors: [{key: "lang", value: "${codeLang}"}, {key: "abbr", value: "${abbr}"}], ` +
            `contentType: "usfm", ` +
            `content: """${fullText}""") }`;
        const docSetId = codeLang + "_" + abbr;
        let res = await this.queryPk(mutation);
        // does the mutation worked ?
        if(res.data.addDocument) {
            this.usfms[docSetId] = fullText;
        }
    }

    /**
     * Fetch the document via a http address and add it to the Proskomma instance
     * @param {string} addr the http address where to find the document
     */
    async addDocumentHttp(addr, codeLang="fra", abbr="ust") {
        try {
            this.verbose && console.log(`Fetching HTTP content for Source lsg_tit.usfm`);
            const response = await Axios.get(addr);
            if (response.status !== 200) {
                console.log(`Status code ${response.status} when fetching content by HTTP(S) for Source : ${addr}`);
            } else {
                await this.addRawDocument(response.data, codeLang, abbr);
            }
        } catch (err) {
            console.log(`Exception when fetching content by HTTP(S) for Source lsg_tit.usfm: \n${err}`);
        }
    }

    async queryPk(query) {
        const result = await this.proskomma.gqlQuery(query);
        return result;
    }

    async testQueryPk(query) {
        const result = await this.proskomma.gqlQuery(query);
        console.log(JSON.stringify(result.data.documents[0].mainBlocksText[0], null, 2));
    }

    async getBookCode() {
        const res = await this.queryPk("{ documents { bookCode: header(id:\"bookCode\") } }");
        return res.data.documents[0].bookCode;
    }

    async saveFile(file, rpath="./output.json") {
        try {
            if(typeof file === "string") {
                let thepath = "./output.usfm";
                await fse.outputFile(path.resolve(thepath), file);
            } else {
                await fse.outputJson(path.resolve(rpath), file);
            }
        } catch (err) {
            throw new Error("Failed to save the file", err)
        }
    }
}

export default ProskommaInterface;