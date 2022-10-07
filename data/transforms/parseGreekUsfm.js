import {PerfRenderFromJson, transforms, mergeActions} from 'proskomma-json-tools';
import utils from '../../src/utils/utils';


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

const generateGreekReportActions = {
    startDocument: [
        {
            description: "Set up state variables and output",
            test: () => true,
            action: ({config, workspace, output}) => {
                workspace.chapter = 1;
                workspace.verse = 1;
                workspace.wordPos = 1;
                workspace.infosGreekWords = [];
                workspace.greekWordsInVerse = [];
                workspace.lemmaInVerse = [];
                workspace.greekWordInfos = {};
                workspace.greekText = "";
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
                let strong = elem.atts.strong[0].replace(/0$/,"");
                workspace.greekWordInfos = {
                    "chapter": workspace.chapter,
                    "verse": workspace.verse,
                    "wordPos": workspace.wordPos,
                    "strong" : strong,
                    "lemma" : lemma,
                    "morph" : morph,
                    "word" : "",
                    "occurence": "",
                    "occurences": "",
                    "occurenceLemma": "",
                    "occurencesLemma": ""
                };
                workspace.lemmaInVerse.push(lemma);
            },
        },
    ],
    endWrapper: [
        {
            description: "Getting the french content on wrapper event",
            test: ({ context }) => context.sequences[0].element.subType === "usfm:w",
            action: ({ workspace }) => {
                workspace.wordPos += 1;
                workspace.inwrap = false;
                workspace.greekWordInfos["word"] = workspace.greekText;
                workspace.infosGreekWords.push(workspace.greekWordInfos);
                workspace.greekWordsInVerse.push(workspace.greekText);
                workspace.greekWordInfos = {};
            }
        }
    ],
    mark: [
        {
            description: "Ignore mark events, except for chapter and verses",
            test: ({context}) => {
                return ["chapter", "verses"].includes(context.sequences[0].element.subType);
            },
            action: ({context, workspace, output}) => {
                const element = context.sequences[0].element;
                if (element.subType === "chapter") {
                    if(element.atts["number"] > 1) {
                        let occurences = null;
                        let posOccurence = null;
                        let occs = null
                        let i = 0;
                        if(workspace.greekWordsInVerse[0] !== undefined) {
                            [occurences, posOccurence] = handleOccurences(workspace.greekWordsInVerse);
                            for(i = 0; i < workspace.greekWordsInVerse.length; i++) {
                                occs = occurences.get(workspace.greekWordsInVerse[i]);
                                workspace.infosGreekWords[i]["occurence"] = posOccurence[i];
                                workspace.infosGreekWords[i]["occurences"] = occs;
                            }
                        }
                        if(workspace.lemmaInVerse[0] !== undefined) {
                            [occurences, posOccurence] = handleOccurences(workspace.lemmaInVerse);
                            for(i = 0; i < workspace.lemmaInVerse.length; i++) {
                                occs = occurences.get(workspace.lemmaInVerse[i]);
                                workspace.infosGreekWords[i]["occurenceLemma"] = posOccurence[i];
                                workspace.infosGreekWords[i]["occurencesLemma"] = occs;
                            }
                            output.report[workspace.chapter][workspace.verse] = [null, ...workspace.infosGreekWords];
                            workspace.infosGreekWords = [];
                            workspace.greekWordsInVerse = [];
                            workspace.lemmaInVerse = [];
                            workspace.frenchWordsInVerse = [];
                            workspace.wordPos = 1;
                            workspace.greekTextPosition = 1;
                        }
                    }
                    workspace.chapter = element.atts["number"];
                    workspace.verse = 1;
                    output.report[workspace.chapter] = [];
                } else if (element.subType === "verses") {
                    let occurences = null;
                    let posOccurence = null;
                    let occs = null
                    let i = 0;
                    if(workspace.greekWordsInVerse[0] !== undefined) {
                        [occurences, posOccurence] = handleOccurences(workspace.greekWordsInVerse);
                        for(i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            occs = occurences.get(workspace.greekWordsInVerse[i]);
                            workspace.infosGreekWords[i]["occurence"] = posOccurence[i];
                            workspace.infosGreekWords[i]["occurences"] = occs;
                        }
                    }
                    if(workspace.lemmaInVerse[0] !== undefined) {
                        [occurences, posOccurence] = handleOccurences(workspace.lemmaInVerse);
                        for(i = 0; i < workspace.lemmaInVerse.length; i++) {
                            occs = occurences.get(workspace.lemmaInVerse[i]);
                            workspace.infosGreekWords[i]["occurenceLemma"] = posOccurence[i];
                            workspace.infosGreekWords[i]["occurencesLemma"] = occs;
                        }
                        output.report[workspace.chapter][workspace.verse] = [null, ...workspace.infosGreekWords];
                        workspace.infosGreekWords = [];
                        workspace.greekWordsInVerse = [];
                        workspace.lemmaInVerse = [];
                        workspace.frenchWordsInVerse = [];
                        workspace.wordPos = 1;
                        workspace.greekTextPosition = 1;
                        workspace.verse = element.atts["number"];
                    }
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
                if(workspace.infosGreekWords[0]) {
                    let occurences = null;
                    let posOccurence = null;
                    let occs = null;
                    let i = 0;
                    if(workspace.greekWordsInVerse[0] !== undefined && workspace.verse !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.greekWordsInVerse);
                        for(i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            occs = occurences.get(workspace.greekWordsInVerse[i]);
                            workspace.infosGreekWords[i]["occurence"] = posOccurence[i];
                            workspace.infosGreekWords[i]["occurences"] = occs;
                        }
                    }
                    if(workspace.lemmaInVerse[0] !== undefined && workspace.verse !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.lemmaInVerse);
                        for(i = 0; i < workspace.lemmaInVerse.length; i++) {
                            occs = occurences.get(workspace.lemmaInVerse[i]);
                            workspace.infosGreekWords[i]["occurenceLemma"] = posOccurence[i];
                            workspace.infosGreekWords[i]["occurencesLemma"] = occs;
                        }
                    }
                    if(workspace.verse !== 0) output.report[workspace.chapter][workspace.verse] = [null, ...workspace.infosGreekWords];
                }
            }
        },
    ],
};

const makeReportGreek = function ({perf}) {
    // console.log("getRawStringFromChapterVerse(1, 1) : ", handler.getRawStringFromChapterVerse(1, 1));
    const cl = new PerfRenderFromJson(
        {
            srcJson: perf,
            actions: generateGreekReportActions
        }
    );
    const output = {};
    cl.renderDocument({docId: "", config: {}, output});
    return {report: output.report};
}

const parseGreekUsfm = {
    name: "parseGreekUsfm",
    type: "Transform",
    description: "Generate report from greek perf informations",
    inputs: [
        {
            name: "perf",
            type: "json",
            source: ""
        }
    ],
    outputs: [
        {
            name: "report",
            type: "json"
        }
    ],
    code: makeReportGreek
}

export default parseGreekUsfm;
