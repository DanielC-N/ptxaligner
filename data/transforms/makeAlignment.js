import { PerfRenderFromJson, transforms, mergeActions } from 'proskomma-json-tools';
import utils from '../../src/utils/utils';

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

/**
 * Merge the two greek report and PTX AND generate an error report of the missing words in the PTX.
 * @param {Object[]} greekReport JSON report of the usfm greek
 * @param {utils.PtxHandler} ptx parsed PTX class
 */
 function mergeGreekReportAndPTX(greekReport, ptx) {
    let cnbverses = 0;
    let cnbwords = 0;
    let merged = [];
    let ptxWords = null;
    let ptxWordStrongs = null;
    let ptxWord = null;
    let errorReport = {};
    greekReport.forEach((chapt, ic) => {
        if(!chapt || ic == 0) return;
        cnbverses = chapt.length;
        merged[ic] = [];
        chapt.forEach((verse, iv) => {
            if(!verse || iv == 0) return;
            merged[ic][iv] = [];
            cnbwords = verse.length;
            ptxWords = ptx.getAllWordsFromChapterVerse(ic, iv);
            ptxWordStrongs = ptx.getStrongWordsFromChapterVerse(ic, iv);
            verse.forEach((w, iw) => {
                if(!w || iw == 0) return;
                ptxWord = null;
                // if there are as many of the same word (strong) in the ptx and the greek so...
                if(ptxWordStrongs && ptxWordStrongs.filter(x => x===w["strong"]).length === w["occurencesLemma"]) {
                    ptxWords.forEach((pw, ipw) => {
                        if(!pw || ipw == 0) return;
                        if(pw["strong"] === w["strong"]
                            && pw["occurenceStrong"] === w["occurenceLemma"]
                            && pw["occurencesStrong"] === w["occurencesLemma"]) {
                            ptxWord = pw;
                            return;
                        }
                    });
                    if(ptxWord) {
                        merged[ic][iv][iw] = w;
                        merged[ic][iv][iw]["tgoccurence"] = ptxWord["occurence"];
                        merged[ic][iv][iw]["tgoccurences"] = ptxWord["occurences"];
                        merged[ic][iv][iw]["targetLinkValue"] = ptxWord["targetLinkValue"];
                        merged[ic][iv][iw]["segment"] = ptxWord["segment"];
                        merged[ic][iv][iw]["targetword"] = ptxWord["word"];
                        merged[ic][iv][iw]["normalized"] = ptxWord["normalized"];
                    }
                } else {
                    // TODO enhance the report
                    errorReport[ic+""+iv+""+iw+""] = greekReport[ic][iv][iw];
                    return;
                }
            });
        });
    });
    errorReport["total"] = Object.keys(errorReport).length;
    return [merged, errorReport];
}

const makeAlignmentActionsv2 = {
    startDocument: [
        {
            description: "setup",
            test: () => true,
            action: ({ workspace, config, output }) => {
                const { report, PTX } = config;
                workspace.handler = new utils.PtxHandler(PTX);
                workspace.handler.startParsing();
                [workspace.merged, output.issues] = mergeGreekReportAndPTX(report, workspace.handler);

                output.reportgreekptx = JSON.parse(JSON.stringify(workspace.merged));

                workspace.chapter = null;
                workspace.verses = null;
                workspace.arrayWords = [];
                workspace.arraytext = [];
                workspace.isInVerse = false;
                workspace.beginRealtext = false;
                workspace.doNotCareAboutText = false;
                return true;
            }
        }
    ],
    text: [
        {
            description: "Output text",
            test: ({ workspace }) => !workspace.doNotCareAboutText && workspace.isInVerse && workspace.arrayWords && workspace.arrayWords.length > 0,
            action: ({ context, workspace, config }) => {
                // start milestone
                // wrapper
                // end milestone
                // text
                let text = context.sequences[0].element.text;
                if(text.slice(-1) !== " ") {
                    text = text + " ";
                }
                let elem = structuredClone(context.sequences[0].element);
                workspace.arraytext = text.split(/([\s’'.,:!?;-])/g);

                let lenWords = workspace.arrayWords.length;
                let lenArrText = workspace.arraytext.length;
                let currentWord = "";
                let lastPushed = null;
                workspace.arraytext.forEach((word, index) => {
                    lastPushed = workspace.outputContentStack[0].at(-1);
                    if(word === '') return;
                    if(/([\s’'.,:!?;-])/.test(word)) {
                        workspace.outputContentStack[0].push(word);
                        return;
                    }

                    elem.text = word;
                    
                    let found = false;
                    let i = 1;
                    
                    while(i < lenWords) {
                        if(workspace.arrayWords[i] !== undefined && "targetword" in workspace.arrayWords[i]) {
                            currentWord = workspace.arrayWords[i]["targetword"];
                            if(currentWord === elem.text) {
                                found = true;
                                break;
                            }
                        }
                        i++;
                    }

                    if(found) {
                        // startmilestone etc ...
                        let theWrapper = workspace.arrayWords[i];
                        let startM = buildANewStartMilestone(theWrapper["strong"], theWrapper["lemma"], theWrapper["word"], theWrapper["morph"],
                        theWrapper["occurence"] ?? 1, theWrapper["occurences"] ?? 1);

                        workspace.outputContentStack[0].push(startM);

                        let wrapper = buildWrapper(elem.text, theWrapper["tgoccurence"] ?? 1, theWrapper["tgoccurences"] ?? 1);

                        workspace.outputContentStack[0].push(wrapper);
                        
                        let endM = buildnewEndMileStone();
                        
                        workspace.outputContentStack[0].push(endM);

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
                
                const verseRecords = reportRecordsForCV(workspace.merged, workspace.chapter, workspace.verses);
                if (verseRecords && verseRecords.length > 0) {
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
                workspace.arrayWords = workspace.merged[workspace.chapter][workspace.verses];
                workspace.outputContentStack[0].push(markRecord);
                return false;
            }
        }
    ],
    startWrapper: [
        {
            description: "Ignore startWrapper events",
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
    ]
};

const mergeReportCodev2 = function ({ perf, report, PTX }) {
    const actions = mergeActions(
        [
            makeAlignmentActionsv2,
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
    cl.renderDocument({ docId: "", config: { report, PTX }, output });
    return { perf: output.perf, reportgreekptx: output.reportgreekptx, issues: output.issues };
}

const makeAlignment = {
    name: "makeAlignment",
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
            name: "PTX",
            type: "text",
            source: ""
        }
    ],
    outputs: [
        {
            name: "perf",
            type: "json"
        },
        {
            name: "reportgreekptx",
            type: "json"
        },
        {
            name: "issues",
            type: "json"
        }
    ],
    code: mergeReportCodev2
}
export default makeAlignment;
