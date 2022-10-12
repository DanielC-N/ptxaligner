const fse = require('fs-extra');
const path = require('path');
const {DOMParser} = require('@xmldom/xmldom');
const {ptBookArray} = require('proskomma-utils');

module.exports.saveFile = async function saveFile(file, rpath="./output.json") {
    try {
        if(typeof file === "string") {
            let thepath = rpath;
            await fse.outputFile(path.resolve(thepath), file);
        } else {
            await fse.outputJson(path.resolve(rpath), file);
        }
    } catch (err) {
        throw new Error("Failed to save the file", err)
    }
}

module.exports.handleOccurences = function handleOccurences(arrayWords) {
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

module.exports.parseXML = function parseXML(ptxStr, filename="", saveFile=false) {
    const dom = new DOMParser().parseFromString(ptxStr);

    const ret = [];
    const childNodes = dom.documentElement.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
        if (childNodes[i].nodeType !== 1) continue;
        const mapping = childNodes[i].getAttribute('Reference');
        const warning = childNodes[i].getAttribute('Warning');
        const sourceLink = childNodes[i].getElementsByTagName("SourceLink")[0];
        const targetLinkValue = childNodes[i].getElementsByTagName("TargetLink")[0].firstChild.nodeValue;
        const mappingJson = {
            source: {
                glWord: sourceLink.getAttribute("Word"),
                strong: sourceLink.getAttribute("Strong"),
                book: ptBookArray[parseInt(mapping.substring(0, 3)) - 1].code,
                chapter: parseInt(mapping.substring(3, 6)),
                verse: parseInt(mapping.substring(6, 9)),
                segment: parseInt(mapping.substring(9, 11)),
            },
            target: {
                targetLinkValue,
                book: ptBookArray[parseInt(targetLinkValue.substring(0, 3)) - 1].code,
                chapter: parseInt(targetLinkValue.substring(3, 6)),
                verse: parseInt(targetLinkValue.substring(6, 9)),
                segment: parseInt(targetLinkValue.substring(9, 11)),
                word: parseInt(targetLinkValue.substring(11, 14)) / 2,
            }
        };
        mappingJson.warning = (warning === "true");

        ret.push(mappingJson);
    }
    if(saveFile) {
        fse.writeJsonSync(filename + "outputptx.json", ret);
    }

    return ret;
}


module.exports.PtxHandler = class PtxHandler {
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

    getNbChapters() {
        return this.nbChapters;
    }

    getVersesInchapters(iChap) {
        return this.versesInchapters[iChap];
    }

    getNbWordsInVerses(iChap, iVer) {
        return this.arrayPtx[iChap][iVer].length;
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
                this.arrayPtx[chapter][verse] = [null];
                this.versesInchapters[chapter] = 1;
            }

            if(verse > this.versesInchapters[chapter]) {
                this.versesInchapters[chapter] = verse;
            }

            this.arrayPtx[chapter][verse][wordInt] = {
                "chapter" : chapter,
                "verse" : verse,
                "word" : txtWord,
                "normalized" : txtWord.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
                "pos" : wordInt,
                "segment" : target["segment"],
                "strong" : strong,
                "targetLinkValue" : target["targetLinkValue"],
            };

            this.wordstotal++;
        }
        this.countOccurences();
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

    countOccurences() {
        let cnbverses = 0;
        let cWords = [];
        let cRawWords = [];
        let cStrongWords = [];
        let occurences = null;
        let posOccurence = null;
        let occurencesStrong = null;
        let posOccurenceStrong = null;
        for(let chapt = 1; chapt <= this.getNbChapters(); chapt++) {
            cnbverses = this.getVersesInchapters(chapt);
            for(let verse = 1; verse <= cnbverses; verse++) {
                cWords = this.getAllWordsFromChapterVerse(chapt, verse);
                cRawWords = this.getRawWordsFromChapterVerse(chapt, verse);
                cStrongWords = this.getStrongWordsFromChapterVerse(chapt, verse);
                [occurences, posOccurence] = module.exports.handleOccurences(cRawWords);
                [occurencesStrong, posOccurenceStrong] = module.exports.handleOccurences(cStrongWords);
                for(let i = 0; i <= cWords.length; i++) {
                    if(cWords[i]) {
                        cWords[i]["occurence"] = posOccurence[i];
                        cWords[i]["occurences"] = occurences.get(cRawWords[i]);
                        cWords[i]["occurenceStrong"] = posOccurenceStrong[i];
                        cWords[i]["occurencesStrong"] = occurencesStrong.get(cStrongWords[i]);
                    }
                }
                this.arrayPtx[chapt][verse] = cWords;
            }
        }
    }

    /**
     * Get all the words from a verse but puts "null" values where there's no informations to keep the position of the words
     * @param {string(int)} chapter 
     * @param {string} verse
     * @returns {Object[]}
     */
    getAllWordsFromChapterVerse(chapter, verse) {
        let words = [];
        if(!this.arrayPtx[chapter][verse]) {
            return words;
        }
        for (let metaWord of this.arrayPtx[chapter][verse]) {
            if(metaWord) {
                words.push(metaWord);
            } else {
                words.push(null);
            }
        }
        return words;
    }

    /**
     * Get all the strongs from a verse but puts empty strings where there's no informations
     * @param {string(int)} chapter 
     * @param {string} verse
     * @returns {Object[]}
     */
     getStrongWordsFromChapterVerse(chapter, verse) {
        let words = [];
        if(!this.arrayPtx[chapter][verse]) {
            return words;
        }
        for (let metaWord of this.arrayPtx[chapter][verse]) {
            if(metaWord) {
                words.push(metaWord["strong"]);
            } else {
                words.push("");
            }
        }
        return words;
    }

    /**
     * Get all the words from a verse but puts empty strings where there's no informations
     * @param {string(int)} chapter 
     * @param {string} verse 
     * @returns {[string]}
     */
     getRawWordsFromChapterVerse(chapter, verse) {
        let words = [];
        if(!this.arrayPtx[chapter][verse]) {
            return words;
        }
        for (let metaWord of this.arrayPtx[chapter][verse]) {
            if(metaWord) {
                words.push(metaWord["word"]);
            } else {
                words.push("");
            }
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
        if(!this.arrayPtx[chapter][verse]) {
            return words;
        }
        for (let i = 1; i < this.arrayPtx[chapter][verse].length; i++) {
            if(this.arrayPtx[chapter][verse][i]) {
                words = words + " " + this.arrayPtx[chapter][verse][i]["word"];
            }
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