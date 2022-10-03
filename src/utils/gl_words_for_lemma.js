const fse = require('fs-extra');

/**
 * Hash the usfm to generate a lemma occurences and translation report
 * @param {Proskomma} pk the proskomma instance
 * @param {string} usfm the input usfm
 * @param {string} outPath the path you want to save the output
 */
module.exports = async function glWordsForLemma(pk, usfm, outPath) {
    // Load USFM
    pk.importDocuments({
            lang: 'abc',
            abbr: 'uvw',
        },
        'usfm',
        [usfm],
    );

    // Run query
    const result =
        await pk.gqlQuery(
            `{
                    scripture: docSet(id:"abc_uvw") {
                        documents {
                            cvIndexes {
                                chapter
                                verses {
                                    verse {
                                        verseRange
                                        items {
                                            type
                                            subType
                                            payload
                                    }
                                }
                            }
                        }
                    }
                }
            }`
        );

    // Get alignment info from USFM
    const lemmaTranslations = {};
    for (const cvIndex of result.data.scripture.documents[0].cvIndexes) {
        for (
            const verseItems of cvIndex.verses
            .map(
                v => v.verse
                    .map(v => v.items)
                    .reduce((a, b) => [...a, ...b], [])
            )
            ) {
            let wrappers = [];
            let currentWrapped = null;
            for (const item of verseItems) {
                if (item.type === "scope") {
                    if (item.payload.startsWith("milestone/zaln") && item.subType === "start") {
                        if (currentWrapped) {
                            currentWrapped.wrappers.push({});
                        } else {
                            currentWrapped = {wrappers: [{}], wrapped: []};
                        }
                        wrappers.push({});
                    }
                    if (item.payload.startsWith("milestone/zaln") && item.subType === "end") {
                        wrappers.pop();
                        if (wrappers.length === 0) {
                            for (const wrapper of currentWrapped.wrappers) {
                                if (!lemmaTranslations[wrapper["x-lemma"]]) {
                                    lemmaTranslations[wrapper["x-lemma"]] = {};
                                }
                                const content = currentWrapped.wrapped.join(' ');
                                if (!lemmaTranslations[wrapper["x-lemma"]][content]) {
                                    lemmaTranslations[wrapper["x-lemma"]][content] = 0;
                                }
                                lemmaTranslations[wrapper["x-lemma"]][content]++;
                            }
                            currentWrapped = null;
                        }
                    }
                    if (
                        item.payload.startsWith("attribute/milestone/zaln") &&
                        item.subType === 'start' &&
                        ["x-lemma"].includes(item.payload.split("/")[3])
                    ) {
                        currentWrapped.wrappers[currentWrapped.wrappers.length - 1][item.payload.split("/")[3]] = item.payload.split("/")[5];
                    }
                }
                if (item.subType === 'wordLike' && currentWrapped) {
                    currentWrapped.wrapped.push(item.payload);
                }
            }
        }
    }
    
    // Rework lemma info
    const lemmaReport =
        Object.entries(lemmaTranslations)
            .sort((a, b) => a[0].toLocaleLowerCase().localeCompare(b[0].toLocaleLowerCase()))
            .map(
                lem => [
                    lem[0],
                    Object.entries(lem[1])
                        .sort((a, b) => b[1] - a[1])
                        .map(e => `${e[0]}: ${e[1]}`)
                ]
            )
    
    await fse.writeFile(outPath, JSON.stringify(lemmaReport, null, 2));
}


/**
 * Proskomma instance
 * @typedef Proskomma
 * @see {@link https://github.com/mvahowe/proskomma-js}
 */