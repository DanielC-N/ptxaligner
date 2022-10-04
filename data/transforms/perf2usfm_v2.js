import {usfmHelps, PerfRenderFromJson} from 'proskomma-json-tools';

const oneifyTag = t => {
    if (['toc', 'toca', 'mt', 'imt', 's', 'ms', 'mte', 'sd'].includes(t)) {
        return t + '1';
    }
    return t;
}

const localToUsfmActions = {
    startDocument: [
        {
            description: "Set up environment",
            test: () => true,
            action: ({context, workspace}) => {
                workspace.usfmBits = [''];
                workspace.nestedWrapper = 0;
                for (
                    let [key, value] of
                    Object.entries(context.document.metadata.document)
                        .filter(kv => !['tags', 'properties', 'bookCode', 'cl'].includes(kv[0]))
                    ) {
                    workspace.usfmBits.push(`\\${oneifyTag(key)} ${value}\n`);
                };
            }
        },
    ],
    blockGraft: [
        {
            description: "Follow block grafts",
            test: ({context}) => ['title', 'heading', 'introduction'].includes(context.sequences[0].block.subType),
            action: (environment) => {
                let contextSequence = environment.context.sequences[0];
                let chapterValue = environment.config.report[contextSequence.block.blockN.toString()];
                const target = contextSequence.block.target;
                if(chapterValue && contextSequence.type === "main") {
                    environment.workspace.usfmBits.push(`\n\\c ${chapterValue}\n`);
                }
                if (target) {
                    environment.context.renderer.renderSequenceId(environment, target);
                }
            }
        }
    ],
    inlineGraft: [
        {
            description: "Follow inline grafts",
            test: () => true,
            action: (environment) => {
                const target = environment.context.sequences[0].element.target;
                if (target) {
                    environment.context.renderer.renderSequenceId(environment, target);
                }
            }
        }
    ],
    startParagraph: [
        {
            description: "Output footnote paragraph tag (footnote)",
            test: ({context}) => context.sequences[0].block.subType === "usfm:f" && context.sequences[0].type === "footnote",
            action: ({context, workspace, config}) => {
                workspace.nestedWrapper = 0;
                let contextSequence = context.sequences[0];
                workspace.usfmBits.push(`\\${oneifyTag(contextSequence.block.subType.split(':')[1])} `);
            }
        },
        {
            description: "Output footnote note_caller tag (footnote)",
            test: ({context}) => context.sequences[0].block.subType === "usfm:f",
            action: ({context, workspace, config}) => {
                workspace.nestedWrapper = 0;
            }
        },
        {
            description: "Output paragraph tag (main)",
            test: () => true,
            action: ({context, workspace, config}) => {
                workspace.nestedWrapper = 0;
                let contextSequence = context.sequences[0];
                let chapterValue = config.report[contextSequence.block.blockN.toString()];
                if(chapterValue && contextSequence.type === "main") {
                    workspace.usfmBits.push(`\n\\c ${chapterValue}\n`);
                }
                workspace.usfmBits.push(`\n\\${oneifyTag(contextSequence.block.subType.split(':')[1])}\n`);
            }
        }
    ],
    endParagraph: [
        {
            description: "Output footnote paragraph tag (footnote)",
            test: ({context}) => context.sequences[0].block.subType === "usfm:f" && context.sequences[0].type === "footnote",
            action: ({context, workspace, config}) => {
                let contextSequence = context.sequences[0];
                workspace.usfmBits.push(`\\${oneifyTag(contextSequence.block.subType.split(':')[1])}*`);
            }
        },
        {
            description: "Output footnote note_caller tag (footnote)",
            test: ({context}) => context.sequences[0].block.subType === "usfm:f",
            action: ({context, workspace, config}) => {
            }
        },
        {
            description: "Output nl",
            test: () => true,
            action: ({workspace}) => {
                workspace.usfmBits.push(`\n`);
            }
        }
    ],
    text: [
        {
            description: "Output text",
            test: () => true,
            action: ({context, workspace}) => {
                const text = context.sequences[0].element.text;
                workspace.usfmBits.push(text);
            }
        },
    ],
    mark: [
        {
            description: "Output chapter or verses",
            test: () => true,
            action: ({context, workspace}) => {
                const element = context.sequences[0].element;
                if (element.subType === 'verses') {
                    workspace.usfmBits.push(`\n\\v ${element.atts['number']}\n`);
                }
            }
        },
    ],
    endSequence: [
        {
            description: "Output \\cl",
            test: ({context}) => context.document.metadata.document.cl && context.sequences[0].type === "title",
            action: ({context, workspace}) => {
                workspace.usfmBits.push(`\n\\cl ${context.document.metadata.document.cl}\n`);
            }
        },
    ],
    startWrapper: [
        {
            description: "Output start tag",
            test: () => true,
            action: ({workspace, context}) => {
                let contextSequence = context.sequences[0];
                console.log(contextSequence.element);
                // handle nested wrappers : https://ubsicap.github.io/usfm/characters/nesting.html
                if(workspace.nestedWrapper > 0) {
                    workspace.usfmBits.push(`\\+${oneifyTag(contextSequence.element.subType.split(':')[1])} `);
                } else {
                    workspace.usfmBits.push(`\\${oneifyTag(contextSequence.element.subType.split(':')[1])} `);
                }
                workspace.nestedWrapper += 1;
            }
        },
    ],
    endWrapper: [
        {
            description: "Output end tag",
            test: ({ context }) => !['fr', 'fq','fqa','fk','fl','fw','fp', 'ft', 'xo', 'xk', 'xq', 'xt', 'xta']
                                    .includes(context.sequences[0].element.subType.split(':')[1]),
            action: ({workspace, context}) => {
                workspace.nestedWrapper -= 1;
                let contextSequence = context.sequences[0];
                // handle nested wrappers : https://ubsicap.github.io/usfm/characters/nesting.html
                if(workspace.nestedWrapper > 0) {
                    workspace.usfmBits.push(`\\+${oneifyTag(contextSequence.element.subType.split(':')[1])}*`);
                } else {
                    workspace.usfmBits.push(`\\${oneifyTag(contextSequence.element.subType.split(':')[1])}*`);
                }
            }
        },
        {
            description: "Do NOT output end tag",
            test: () => true,
            action: ({workspace}) => {
                workspace.nestedWrapper -= 1;
            }
        }
    ],
    endDocument: [
        {
            description: "Build output",
            test: () => true,
            action: ({workspace, output}) => {
                output.usfm = workspace.usfmBits.join('').replace(/(\s*)\n(\s*)/gm, "\n");
            }
        },
    ]
};

const perf2usfmCode_v2 = function ({perf, report}) {
    const cl = new PerfRenderFromJson({srcJson: perf, actions: localToUsfmActions});
    const output = {};
    cl.renderDocument({docId: "", config: { report }, output});
        return {usfm: output.usfm};
}

const perf2usfm_v2 = {
    name: "perf2usfm_v2",
    type: "Transform",
    description: "PERF=>USFM",
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
    ],
    outputs: [
        {
            name: "usfm",
            type: "text",
        }
    ],
    code: perf2usfmCode_v2
}
export default perf2usfm_v2;
