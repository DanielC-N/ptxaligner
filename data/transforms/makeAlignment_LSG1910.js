import { PerfRenderFromJson, transforms, mergeActions } from 'proskomma-json-tools';

/**
 * 
 * @param {Array} report 
 * @param {String} chapter 
 * @param {String} verses 
 * @returns {Array}
 */
const reportRecordsForCV = function (report, chapter, verses) {
    return report.filter(
        (record) => record.chapter === chapter && record.verses === verses
    ) ?? [];
}

/**
 * 
 * @param {string} word word to search in
 * @param {boolean} end if true the fucntion wil search at the end of the word
 * @returns {boolean}
 */
const endOrBeginPunctuation = function (word, end=false) {
    let startPunctuation = /^[.,:!?;]/;
    let endPunctuation = /[.,:!?;]$/;
    if(!end) {
        return startPunctuation.test(word);
    }
    return endPunctuation.test(word);
}

/**
 * Start a new milestone
 * @param {string} strong code of the greek lemma
 * @param {string} lemma root of the greek word
 * @param {string} content greek word
 * @param {string[]} morph array(8) of the description of the nature and function of the greek word
 * @param {string} occ position of the word through all his occurences in the verse
 * @param {string} occs number of occurences in the verse
 * @returns {Object}
 */
const buildANewStartMilestone = function (strong, lemma, content, morph, occ, occs) {
    const ms = {
        "type": "start_milestone",
        "subtype": "usfm:zaln",
        "atts": {
            "x-strong": [
                strong
            ],
            "x-lemma": [
                lemma
            ],
            "x-morph": morph,
            "x-occurrence": [
                occ
            ],
            "x-occurrences": [
                occs
            ],
            "x-content": [
                content
            ]
        }
    };
    return ms;
}

/**
 * 
 * @param {string} content the word
 * @param {string} occ 
 * @param {string} occs 
 * @returns 
 */
const buildWrapper = function (content, occ, occs) {
    const w = {
        "type": "wrapper",
        "subtype": "usfm:w",
        "content": [
            content
        ],
        "atts": {
            "x-occurrence": [
                occ
            ],
            "x-occurrences": [
                occs
            ]
        }
    };
    return w;
}

/**
 * 
 * @param {string} content the content of the block
 * @returns 
 */
 const buildParagraphWJ = function (content) {
    const w = {
        "type": "paragraph",
        "subtype": "usfm:wj",
        "content": [
            content
        ]
    };
    return w;
}

const buildnewEndMileStone = function() {
    const em = {
        "type": "end_milestone",
        "subtype": "usfm:zaln"
    };
    return em;
}

const stringifyRef = function(ref) {
    let strRef = "";
    if(ref < 10) {
        strRef = "00" + ref;
    } else if (ref < 100) {
        strRef = "0" + ref;
    } else {
        strRef = "" + ref;
    }
    return strRef;
}

const getverse = function(jsonlsg, book, chapter, verse) {
    let fullref = book + stringifyRef(chapter) + stringifyRef(verse);
    return jsonlsg[fullref];
}

const makeAlignmentActions = {
    startDocument: [
        {
            description: "setup",
            test: () => true,
            action: ({ workspace, config }) => {
                workspace.book = config.numbook;
                workspace.chapter = null;
                workspace.verses = null;
                workspace.arrayWords = [];
                workspace.arraytext = [];
                workspace.isInVerse = false;
                workspace.beginRealtext = false;
                workspace.doNotCareAboutText = false;
                workspace.jsonlsg = config.jsonlsg;
                return true;
            }
        }
    ],
    text: [
        {
            description: "Output text",
            test: ({ workspace }) => !workspace.doNotCareAboutText && workspace.isInVerse && workspace.arrayWords !== undefined && workspace.arrayWords.length > 0,
            action: ({ context, workspace, config }) => {
                // start milestone
                // wrapper
                // end milestone
                // text
                let verse = getverse(workspace.jsonlsg, workspace.book, workspace.chapter, workspace.verse);
                let text = context.sequences[0].element.text;
                if(text.slice(-1) !== " ") {
                    text = text + " ";
                }
                let elem = structuredClone(context.sequences[0].element);
                workspace.arraytext = text.split(/([\s’'.,:!?;-])/g);

                // console.log("text == ", text);
                // console.log("workspace.arraytext == ", workspace.arraytext);
                // console.log("workspace.arrayWords == ", workspace.arrayWords);
                // console.log("text == ", context.sequences[654].element.text);


                let lenWords = workspace.arrayWords.length;
                let lenArrText = workspace.arraytext.length;
                let currentWord = "";
                let currentStrong = "";
                let tempPunctuation = "";
                let lastPushed = null;

                let found = false;
                let foundStrong = false;
                let i = 1;
                workspace.arraytext.forEach((word, index) => {
                    lastPushed = workspace.outputContentStack[0].at(-1);
                    if(word === '') return;
                    if(/([\s’'.,:!?;-])/.test(word)) {
                        // if(typeof lastPushed === "string" && lastPushed.slice(-1) === " ") {
                        workspace.outputContentStack[0].push(word);
                        // }
                        return;
                    }
                    // let lenW = word.length;
                    // let charLast = word.charAt(lenW-1);

                    // if the word ends by a punctuation we remove it
                    
                    // let punct = false;
                    // if(endOrBeginPunctuation(word, true)) {
                    //     let realW = word.trim().substring(0, lenW-1);
                    //     tempPunctuation = charLast;
                    //     elem.text = realW;
                    //     punct = true;
                    // } else {
                    // }
                    elem.text = word.toLowerCase();
                    
                    found = false;
                    foundStrong = false;
                    i = 1;
                    
                    while(i < lenWords) {
                        if(workspace.arrayWords[i] !== undefined) {
                            currentStrong = workspace.arrayWords[i]["strong"];
                            if(currentStrong && verse[currentStrong]) {
                                foundStrong = true;
                                break;
                            }
                        }
                        i++;
                    }
                    
                    if(!foundStrong) {
                        i = 1;
                        while(i < lenWords) {
                            if(workspace.arrayWords[i] !== undefined && "word" in workspace.arrayWords[i]) {
                                currentWord = workspace.arrayWords[i]["word"];
                                if(currentWord && currentWord.toLowerCase() === elem.text) {
                                    found = true;
                                    break;
                                }
                            }
                            i++;
                        }
                    }

                    if(foundStrong) {
                        let expr = workspace.arraytext = text.split(/([\s’'.,:!?;-])/g);
                        let theWrapper = workspace.arrayWords[i];
                        let startM = buildANewStartMilestone(theWrapper["strong"], theWrapper["lemma"], theWrapper["content"], theWrapper["morph"], theWrapper["greekoccurence"] ?? 1, theWrapper["greekoccurences"] ?? 1);
                        workspace.outputContentStack[0].push(startM);
                        expr.forEach(w => {
                            if(/([\s’'.,:!?;-])/.test(w)) {
                                workspace.outputContentStack[0].push(w);
                                return;
                            }
                            let wrapper = buildWrapper(w, theWrapper["frenchoccurence"] ?? 1, theWrapper["frenchoccurences"] ?? 1);
                            workspace.outputContentStack[0].push(wrapper);
                        });
                        let endM = buildnewEndMileStone();
                        workspace.outputContentStack[0].push(endM);
                    } else if (found) {
                        // startmilestone etc ...
                        let theWrapper = workspace.arrayWords[i];
                        let startM = buildANewStartMilestone(theWrapper["strong"], theWrapper["lemma"], theWrapper["content"], theWrapper["morph"],
                        theWrapper["greekoccurence"] ?? 1, theWrapper["greekoccurences"] ?? 1);

                        workspace.outputContentStack[0].push(startM);

                        let wrapper = buildWrapper(elem.text, theWrapper["frenchoccurence"] ?? 1, theWrapper["frenchoccurences"] ?? 1);

                        workspace.outputContentStack[0].push(wrapper);
                        
                        let endM = buildnewEndMileStone();
                        
                        workspace.outputContentStack[0].push(endM);

                        // if(punct) {
                        //     workspace.outputContentStack[0].push(tempPunctuation + " ");
                        // } else {
                        //     workspace.outputContentStack[0].push(" ");
                        // }
                    } else {
                        workspace.outputContentStack[0].push(elem.text);
                    }

                    if(lenArrText === index - 1) {
                        workspace.isInVerse = false;
                    }
                });

                return false;
            }
        },
    ],
    startSequence: [
        {
            description: "identity startSequence",
            test: () => true,
            action: ({context, workspace}) => {
                if(context.sequences[0].type === "main") {
                    workspace.doNotCareAboutText = false;
                } else {
                    workspace.doNotCareAboutText = true;
                }
                return true;
            }
        }
    ],
    endSequence: [
        {
            description: "identity endSequence",
            test: () => true,
            action: ({context, workspace}) => {
                if(context.sequences[1] && context.sequences[1].type === "main") {
                    workspace.doNotCareAboutText = false;
                } else {
                    workspace.doNotCareAboutText = true;
                }
                return true;
            }
        }
    ],
    mark: [
        {
            description: "mark-chapters",
            test: ({ context }) => context.sequences[0].element.subType === 'chapter',
            action: ({ context, workspace }) => {
                const element = context.sequences[0].element;
                workspace.chapter = element.atts['number'];
                workspace.verses = 0;
                workspace.isInVerse = false;
                return true;
            }
        },
        {
            description: "mark-verses",
            test: ({ context }) => context.sequences[0].element.subType === 'verses',
            action: ({ config, context, workspace, output }) => {
                const element = context.sequences[0].element;
                workspace.verses = element.atts['number'];
                workspace.isInVerse = true;
                workspace.beginRealtext = true;
                const markRecord = {
                    type: element.type,
                    subtype: element.subType,
                };
                
                const verseRecords = reportRecordsForCV(config.report, workspace.chapter, workspace.verses);
                if (verseRecords.length > 0) {
                    markRecord.metaContent = [];
                    for (const vr of verseRecords) {
                        for (const payloadContent of vr.payload) {
                            markRecord.metaContent.push(payloadContent);
                        }
                    }
                }
                if (element.atts) {
                    markRecord.atts = element.atts;
                }
                workspace.arrayWords = config.report[workspace.chapter][workspace.verses];
                workspace.outputContentStack[0].push(markRecord);
                return false;
            }
        }
    ],
    startWrapper: [
        {
            // description: "Transform all the wrappers into paragraphs",
            description: "Ignore startWrapper events",
            // test: ({ context }) => context.sequences[0].element.subType === "usfm:wj",
            test: () => true,
            action: ({config, context, workspace, output}) => {
                // const currentBlock = context.sequences[0].block;
                // const paraRecord = {
                //     type: "paragraph",
                //     subtype: context.sequences[0].element.subType,
                //     content: [],
                // };
                // workspace.outputSequence.blocks.push(paraRecord);
                // workspace.currentContent = paraRecord.content;
                // workspace.outputBlock = workspace.outputSequence.blocks[workspace.outputSequence.blocks.length - 1];
                // workspace.outputContentStack = [workspace.outputBlock.content];
                // return false;
            }
        },
    ],
    endWrapper: [
        {
            description: "Ignore endWrapper events",
            // test: ({ context }) => context.sequences[0].element.subType === "usfm:wj",
            test: () => true,
            action: () => {
                // return false;
            }
        },
    ],
    blockGraft: [
        {
            description: "Ignore blockGraft events, except for title (\\mt)",
            test: (environment) => environment.context.sequences[0].block.subType !== 'title',
            action: (environment) => {
            }
        },
    ],
    inlineGraft: [
        {
            description: "Ignore inlineGraft events",
            test: () => true,
            action: () => {
            }
        },
    ],
    // startParagraph: [
    //     {
    //         description: "transform badly handled \\q into real paragraphs",
    //         test: ({ context }) => context.sequences[0].block.subType === "usfm:q",
    //         action: ({ context, workspace }) => {
    //             const currentBlock = context.sequences[0].block;
    //             const paraRecord = {
    //                 type: currentBlock.type,
    //                 subtype: "usfm:p",
    //                 content: []
    //             };
    //             workspace.outputSequence.blocks.push(paraRecord);
    //             workspace.currentContent = paraRecord.content;
    //             workspace.outputBlock = workspace.outputSequence.blocks[workspace.outputSequence.blocks.length - 1];
    //             workspace.outputContentStack = [workspace.outputBlock.content];
    //             return false;
    //         }
    //     }
    // ]
};

const mergeReportCode = function ({ perf, report, jsonlsg, numbook }) {
    
    const actions = mergeActions(
        [
            makeAlignmentActions,
            transforms.perf2perf.identityActions
        ]
    );
    const cl = new PerfRenderFromJson(
        {
            srcJson: perf,
            actions
        }
    );
    const output = {};
    cl.renderDocument({ docId: "", config: { report, jsonlsg, numbook }, output });
    return { perf: output.perf }; // identityActions currently put PERF directly in output
}

const mergeReport = {
    name: "mergeReport",
    type: "Transform",
    description: "PERF=>PERF adds report to verses",
    inputs: [
        {
            name: "perf",
            type: "json",
            source: ""
        },
        {
            name: "report",
            type: "json",
            source: ""
        },
        {
            name: "jsonlsg",
            type: "json",
            source: "Input jsonlsg"
        },
        {
            name: "numbook",
            type: "string",
            source: "Input numbook"
        }
    ],
    outputs: [
        {
            name: "perf",
            type: "json",
        },
        {
            name: "issues",
            type: "json"
        }
    ],
    code: mergeReportCode
}
export default mergeReport;
