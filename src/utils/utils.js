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