import {PerfRenderFromJson, transforms, mergeActions} from 'proskomma-json-tools';



class Ptxhandler {
    constructor(PTX) {
        this.PTX = JSON.parse(JSON.stringify(PTX));
        this.nbChapters = 0;
        this.versesInchapters = [];
        this.wordstotal = 0;
        this.arrayPtx = [];
    }
    getPTX() {
        return this.PTX;
    }

    getArrayPtx() {
        return this.arrayPtx;
    }

    startParsing() {
        let target = null;
        let source = null;
        let chapter = null;
        let verse = null;
        let wordInt = null;
        let txtWord = "";
        let strong = "";
        for (let metaWord of this.PTX) {
            target = metaWord["target"];
            source = metaWord["source"];
            chapter = source["chapter"];
            verse = source["verse"];
            wordInt = target["word"];
            txtWord = source["glWord"];
            strong = source["strong"];

            if(this.arrayPtx[chapter] == undefined) {
                this.arrayPtx[chapter] = [];
                this.nbChapters += 1;
            }
            if(this.arrayPtx[chapter][verse] == undefined) {
                this.versesInchapters[chapter-1] = 1;
                this.arrayPtx[chapter][verse] = [];
            } else {
                this.versesInchapters[chapter-1] += 1;
            }

            this.arrayPtx[chapter][verse][wordInt] = {
                "chapter" : chapter,
                "verse" : verse,
                "word" : txtWord,
                "pos" : wordInt,
                "segment" : target["segment"],
                "strong" : strong+"0",
                "targetLinkValue" : target["targetLinkValue"],
            };
            this.wordstotal++;
        }
    }

    /**
     * 
     * @param {Integer} chapter wanted chapter
     * @param {Integer} verse wanted verse
     * @param {Integer} word wanted word
     * @returns if the chapter, verse and word exist, return True, else False
     */
    checkAllDimensions(chapter, verse, word) {
        return this.arrayPtx[chapter] !== undefined
            && this.arrayPtx[chapter][verse] !== undefined
            && this.arrayPtx[chapter][verse][word] !== undefined;
    }

    /**
     * 
     * @param {string(int)} chapter 
     * @param {string} verse 
     * @returns {[string]}
     */
    getAllWordsFromChapterVerse(chapter, verse) {
        let words = [];
        for (let metaWord of this.arrayPtx[chapter][verse]) {
            words.push(metaWord);
        }
        return words;
    }

    /**
     * 
     * @param {string(int)} chapter 
     * @param {string} verse 
     * @returns {[string]}
     */
     getRawWordsFromChapterVerse(chapter, verse) {
        let words = [];
        for (let metaWord of this.arrayPtx[chapter][verse]) {
            words.push(metaWord["word"]);
        }
        return words;
    }

    /**
     * 
     * @param {string(int)} chapter 
     * @param {string} verse 
     * @returns {string}
     */
     getRawStringFromChapterVerse(chapter, verse) {
        let words = "";
        for (let i = 1; i <= this.versesInchapters[chapter]; i++) {
            words = words + " " + this.arrayPtx[chapter][verse][i]["word"];
        }
        return words;
    }

    getSingleWordFromChapterVerse(chapter, verse, word) {
        if(this.checkAllDimensions(chapter, verse, word)) {
            return this.arrayPtx[chapter][verse][word];
        }
        return {};
    }

    getStrong(chapter, verse, word) {
        if(this.checkAllDimensions(chapter, verse, word)) {
            let cWord = this.arrayPtx[chapter][verse][word];
            if(cWord === undefined) {
                return "";
            }
            return cWord["strong"];            
        }
        return "";
    }

    getTargetLinkValue(chapter, verse, word) {
        if(this.checkAllDimensions(chapter, verse, word)) {
            return this.arrayPtx[chapter][verse][word]["targetLinkValue"] ?? null;
        }
        return null;
    }

    addInfosToWord(chapter, verse, word, key, info) {
        if(this.checkAllDimensions(chapter, verse, word)) {
            if(this.arrayPtx[chapter][verse][word] === undefined) {
                this.addWord(chapter, verse, word);
            }
            this.arrayPtx[chapter][verse][word][key] = info;
        }
    }

    addWord(chapter, verse, wordInt, infos=null) {
        if(this.checkAllDimensions(chapter, verse, wordInt)) {
            this.arrayPtx[chapter][verse][wordInt] = {
                ...infos,
                "chapter" : parseInt(chapter),
                "verse" : parseInt(verse),
                "pos" : wordInt
            };
        }
    }

    getFrenchWord(chapter, verse, word) {
        if(this.checkAllDimensions(chapter, verse, word)) {
            return this.arrayPtx[chapter][verse][word]["word"] ?? "";
        }
        return "";
    }
}

const handleOccurences = function (arrayWords) {
    let len = arrayWords.length;
    let occurences = new Map();
    let posOccurence = [...arrayWords];
    for(let i = 0; i < len; i++) {
        if(occurences.has(arrayWords[i]) && arrayWords[i] !== "") {
            occurences.set(arrayWords[i], occurences.get(arrayWords[i]) + 1);
        } else {
            occurences.set(arrayWords[i], 1);
        }
        posOccurence[i] = occurences.get(arrayWords[i]);
    };
    return [occurences, posOccurence];
}

const generateReport = {
    startDocument: [
        {
            description: "Set up state variables and output",
            test: () => true,
            action: ({config, workspace, output}) => {
                const { PTX } = config;
                workspace.handler = new Ptxhandler(PTX);
                workspace.handler.startParsing();
                workspace.chapter = 1;
                workspace.verses = 1;
                workspace.wordPos = 1;
                workspace.greekWordsInVerse = [];
                workspace.frenchWordsInVerse = [];
                workspace.greekTextPosition = 1;
                workspace.greekText = "";
                workspace.frenchText = "";
                workspace.inwrap = true;
                output.report = [];
            }
        },
    ],
    startWrapper: [
        {
            description: "Getting the greek content on wrapper event",
            test: ({ context }) => context.sequences[0].element.subType === "usfm:w",
            action: ({ context, workspace }) => {
                workspace.inwrap = true;
                let elem = context.sequences[0].element;
                let lemma = elem.atts.lemma[0];
                let morph = elem.atts["x-morph"];
                let strong = elem.atts.strong[0];
                let strongPTX = workspace.handler.getStrong(workspace.chapter, workspace.verses, workspace.wordPos);
                if(!strongPTX) {
                    const infos = {
                        "strong" : strong,
                        "lemma" : lemma,
                        "morph" : morph,
                        "content" : "",
                        "word" : ""
                    };
                    workspace.handler.addWord(workspace.chapter, workspace.verses, workspace.wordPos, infos);
                } else if(strongPTX == strong) {
                    workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, workspace.wordPos, "lemma", lemma);
                    workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, workspace.wordPos, "morph", morph);
                } else {
                    // TODO : manage when a word is missing in the PTX file
                    workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, workspace.wordPos, "lemma", lemma);
                    workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, workspace.wordPos, "morph", morph);
                }
            },
        },
    ],
    endWrapper: [
        {
            description: "Getting the french content on wrapper event",
            test: ({ context }) => context.sequences[0].element.subType === "usfm:w",
            action: ({ workspace }) => {
                // we get the greek text from the workspace because it is the only one we have access to ... => elem.content === undefined
                let greekWord = workspace.greekText;
                workspace.greekWordsInVerse.push(greekWord);
                workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, workspace.wordPos, "content", greekWord);
                
                let frenchWord = workspace.handler.getFrenchWord(workspace.chapter, workspace.verses, workspace.wordPos);
                workspace.frenchWordsInVerse.push(frenchWord);
                workspace.greekTextPosition += 1;
                workspace.wordPos += 1;
                workspace.inwrap = false;
                
                // let elem = context.sequences[0].element;
                // console.log("endWrapper", elem);
            }
        }
    ],
    mark: [
        {
            description: "Ignore mark events, except for chapter and verses",
            test: ({context}) => {
                return ["chapter", "verses"].includes(context.sequences[0].element.subType);
            },
            action: ({context, workspace}) => {
                const element = context.sequences[0].element;
                if (element.subType === "chapter") {
                    workspace.chapter = element.atts["number"];
                    workspace.verses = 0;
                } else if (element.subType === "verses") {
                    let occurences = null;
                    let posOccurence = null;
                    if(workspace.greekWordsInVerse[0] !== undefined && workspace.verses !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.greekWordsInVerse);
                        for(let i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            let occs = occurences.get(workspace.greekWordsInVerse[i]);
                            // think about i+1 because the first word is 1 and not 0
                            workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, i+1, "greekoccurences", occs);
                            workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, i+1, "greekoccurence", posOccurence[i]);
                        }
                    }
                    if(workspace.frenchWordsInVerse[0] !== undefined && workspace.verses !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.frenchWordsInVerse);
                        for(let i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            let occs = occurences.get(workspace.frenchWordsInVerse[i]);
                            // think about i+1 because the first word is 1 and not 0
                            workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, i+1, "frenchoccurences", occs);
                            workspace.handler.addInfosToWord(workspace.chapter, workspace.verses, i+1, "frenchoccurence", posOccurence[i]);
                        }
                    }
                    workspace.verses = element.atts["number"];
                    workspace.greekWordsInVerse = [];
                    workspace.frenchWordsInVerse = [];
                    workspace.wordPos = 1;
                    workspace.greekTextPosition = 1;
                }
            }
        },
    ],
    text: [
        {
            description: "Process ONLY greek texts events",
            test: () => true,
            action: ({context, workspace}) => {
                if(workspace.inwrap) {
                    workspace.greekText = context.sequences[0].element.text;
                }
            }
        }
    ],
    endDocument: [
        {
            description: "Build output",
            test: () => true,
            action: ({workspace, output}) => {
                output.report = workspace.handler.getArrayPtx();
            }
        },
    ],
};

const makeReportCode = function ({PTX, lsgjson, perf}) {
    // console.log("getRawStringFromChapterVerse(1, 1) : ", handler.getRawStringFromChapterVerse(1, 1));
    const cl = new PerfRenderFromJson(
        {
            srcJson: perf,
            actions: generateReport
        }
    );
    const output = {};
    cl.renderDocument({docId: "", config: { PTX, lsgjson }, output});
    return {report: output.report};
}

const getReportFromGreekAndPTX = {
    name: "getReportFromGreekAndPTX",
    type: "Transform",
    description: "PERF=>JSON: Generates alignment report",
    inputs: [
        {
            name: "perf",
            type: "json",
            source: ""
        },
        {
            name: "PTX",
            type: "text",
            source: ""
        },
        {
            name: "lsgjson",
            type: "json",
            source: ""
        }
    ],
    outputs: [
        {
            name: "report",
            type: "json",
        }
    ],
    code: makeReportCode
}

export default getReportFromGreekAndPTX;
