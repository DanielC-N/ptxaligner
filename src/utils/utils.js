const fse = require('fs-extra');
const path = require('path');

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

const dictbib = {
    "01" : "GEN",
    "02" : "EXO",
    "03" : "LEV",
    "04" : "NUM",
    "05" : "DEU",
    "06" : "JOS",
    "07" : "JDG",
    "08" : "RUT",
    "09" : "1SA",
    "10" : "2SA",
    "11" : "1KI",
    "12" : "2KI",
    "13" : "1CH",
    "14" : "2CH",
    "15" : "EZR",
    "16" : "NEH",
    "17" : "EST",
    "18" : "JOB",
    "19" : "PSA",
    "20" : "PRO",
    "21" : "ECC",
    "22" : "SNG",
    "23" : "ISA",
    "24" : "JER",
    "25" : "LAM",
    "26" : "EZK",
    "27" : "DAN",
    "28" : "HOS",
    "29" : "JOL",
    "30" : "AMO",
    "31" : "OBA",
    "32" : "JON",
    "33" : "MIC",
    "34" : "NAM",
    "35" : "HAB",
    "36" : "ZEP",
    "37" : "HAG",
    "38" : "ZEC",
    "39" : "MAL",
    "40" : "MAT",
    "41" : "MRK",
    "42" : "LUK",
    "43" : "JHN",
    "44" : "ACT",
    "45" : "ROM",
    "46" : "1CO",
    "47" : "2CO",
    "48" : "GAL",
    "49" : "EPH",
    "50" : "PHP",
    "51" : "COL",
    "52" : "1TH",
    "53" : "2TH",
    "54" : "1TI",
    "55" : "2TI",
    "56" : "TIT",
    "57" : "PHM",
    "58" : "HEB",
    "59" : "JAS",
    "60" : "1PE",
    "61" : "2PE",
    "62" : "1JN",
    "63" : "2JN",
    "64" : "3JN",
    "65" : "JUD",
    "66" : "REV",
}

module.exports.parseLSG = function parseLSG(rpath) {
    try {
        const resolvedPath = path.resolve(rpath);
        const bibleLSG = fse.readFileSync(resolvedPath).toString();
        let arrBible = bibleLSG.split("\n");
        let outputJson = {};
        let arrLine = [];
        let code = "";
        let bookCode = "";
        let sent = "";
        // let book = dictbib[bookCode];
        let words = [];

        let even = "";
        let newTab = {};
        // const punct = new RegExp("[\w\d\s]+");

        arrBible.forEach(line => {
            arrLine = line.split("|");
            code = arrLine[0];
            bookCode = code.substring(0,2);
            sent = arrLine[1];
            words = sent.split(/(<em>\d+<\/em>)/g);

            words.forEach((word, i) => {
                if(i%2 === 0){
                    even = word.replace(/([\s’'.,:!?; -]+)$|^([\s’'.,:!?; -]+)|([’'.,:!?;-]+)/g, "");
                } else {
                    if(even !== "") newTab[word.match(/\d+/)[0]] = even;
                }
            });

            outputJson[code.slice(0,-1)] = newTab;
            newTab = {};
            even = "";
        });

        // console.log(outputJson["56003007"]);
        
        fse.outputFile(path.resolve("./bible_LSG.json"), JSON.stringify(outputJson));
    } catch (err) {
        throw new Error("Failed to load the file", err)
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