import {PerfRenderFromJson, transforms, mergeActions} from 'proskomma-json-tools';


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
                const infos = {
                    "chapter": workspace.chapter,
                    "verse": workspace.verse,
                    "wordPos": workspace.wordPos,
                    "strong" : strong,
                    "lemma" : lemma,
                    "morph" : morph,
                    "word" : workspace.greekText,
                    "occurence": "",
                    "occurences": "",
                    "occurenceLemma": "",
                    "occurencesLemma": ""
                };
                workspace.infosGreekWords.push(infos);
                workspace.greekWordsInVerse.push(workspace.greekText);
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
                    workspace.verse = 0;
                    output.report[workspace.chapter] = [];
                } else if (element.subType === "verses") {
                    let occurences = null;
                    let posOccurence = null;
                    if(workspace.greekWordsInVerse[0] !== undefined && workspace.verse !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.greekWordsInVerse);
                        for(let i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            let occs = occurences.get(workspace.greekWordsInVerse[i]);
                            workspace.infosGreekWords["occurence"] = posOccurence;
                            workspace.infosGreekWords["occurences"] = occs;
                        }
                    }
                    if(workspace.lemmaInVerse[0] !== undefined && workspace.verse !== 0) {
                        [occurences, posOccurence] = handleOccurences(workspace.lemmaInVerse);
                        for(let i = 0; i < workspace.greekWordsInVerse.length; i++) {
                            let occs = occurences.get(workspace.lemmaInVerse[i]);
                            workspace.infosGreekWords["occurenceLemma"] = posOccurence;
                            workspace.infosGreekWords["occurencesLemma"] = occs;
                        }
                    }
                    workspace.verse = element.atts["number"];
                    output.report[workspace.chapter][workspace.verse] = workspace.infosGreekWords;
                    workspace.infosGreekWords = [];
                    workspace.greekWordsInVerse = [];
                    workspace.lemmaInVerse = [];
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

const makeReportGreek = function ({PTX, perf}) {
    // console.log("getRawStringFromChapterVerse(1, 1) : ", handler.getRawStringFromChapterVerse(1, 1));
    const cl = new PerfRenderFromJson(
        {
            srcJson: perf,
            actions: generateGreekReportActions
        }
    );
    const output = {};
    cl.renderDocument({docId: "", config: {PTX}, output});
    // utils(JSON.stringify(output.report,null, " "));
    return {report: output.report};
}

const parseGreekUsfm = {
    name: "parseGreekUsfm",
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
        }
    ],
    outputs: [
        {
            name: "report",
            type: "json",
        }
    ],
    code: makeReportGreek
}

export default parseGreekUsfm;
