import PipelineHandler from "pipeline-handler";
import ProskommaInterface from "./classes/ProskommaInterface";
import Axios from "axios";
import pipelines from "../data/pipelines";
import transforms from "../data/transforms";
import utils from "./utils/utils";
import glWordsForLemma from "./utils/gl_words_for_lemma";

const path = require("path");
const fse = require("fs-extra");

async function getDocumentHttp(addr) {
    try {
        const response = await Axios.get(addr);
        if (response.status !== 200) {
            console.log(`Status code ${response.status} when fetching content by HTTP(S) for Source : ${addr}`);
        } else {
            return response.data;
        }
    } catch (err) {
        console.log(`Exception when fetching content by HTTP(S) for Source lsg_tit.usfm: \n${err}`);
    }
}

module.exports = async function ptxaligner(rpath, outputperf=false, verbose=false, hashByLemma=false, pathhash="") {
    const pk = new ProskommaInterface();
    const resolvedPath = path.resolve(rpath);
    const config = JSON.parse(fse.readFileSync(resolvedPath).toString());
    const nameFile = resolvedPath.split("/").pop().split(".")[0];
    const filename = `alignedtext_${nameFile}`;

    const addr_greek = config.greek_usfm_path;
    const greek_selectors = config.greek_selectors;
    const addr_target_lang = config.raw_usfm_path;
    const target_lang_selectors = config.raw_usfm_selectors;
    const addr_ptx = config.ptx_path;
    const numbook = config.numbook;

    verbose && console.log("Retrieving greek usfm... ");
    await pk.addDocumentHttp(addr_greek, greek_selectors.lang, greek_selectors.abbr);
    verbose && console.log("Done");

    verbose && console.log("Retrieving target lang usfm... ", target_lang_selectors.lang);
    await pk.addDocumentHttp(addr_target_lang, target_lang_selectors.lang, target_lang_selectors.abbr);
    verbose && console.log("Done");

    verbose && console.log("Retrieving ptx... ");
    const ptx = await getDocumentHttp(addr_ptx);
    verbose && console.log("Done");

    const pipeline = new PipelineHandler(pipelines, transforms, pk.getInstance(), verbose);
    const jsonlsg = JSON.parse(fse.readFileSync("../data/LSG1910_bible_strongs/bible_LSGS.json").toString());

    verbose && console.log("running alignmentPipeline... ");
    let output = await pipeline.runPipeline("alignmentPipeline_LSG1910", {
        greek_usfm: pk.getUsfm(greek_selectors.lang + "_" + greek_selectors.abbr),
        target_lang_usfm: pk.getUsfm(target_lang_selectors.lang + "_" + target_lang_selectors.abbr),
        ptx: ptx_titus,
        selectors_greek: greek_selectors,
        selectors_target_lang: target_lang_selectors,
        numbook: numbook,
        jsonlsg: jsonlsg
    });
    verbose && console.log("Done");

    if(outputperf) {
        await utils.saveFile(output.perf, filename + ".json");
    }

    if(output.reportgreekptx) {
        await utils.saveFile(JSON.stringify(output.reportgreekptx,null, "  "), "Report_greekptx_merge_" + filename + ".json");
    }

    if(output.issues) {
        await utils.saveFile(JSON.stringify(output.issues,null, "  "), "Issues_report_" + filename + ".json");
    }

    if(hashByLemma || !outputperf) {
        verbose && console.log("transforming the perf to usfm... ");
        let outputusfm = await pipeline.runPipeline("perf2usfmPipeline", {
            perf: output.perf,
        });
        verbose && console.log("Done");
        if(hashByLemma) {
            verbose && console.log("Hashing the ufsm ");
            // TODO do stuff...
            let realpath = pathhash.toLowerCase();
            let isjson = pathhash.split(".").at(-1);
            if(isjson !== "json") {
                realpath = realpath + ".json";
            }
            await glWordsForLemma(pk.getInstance(), outputusfm.usfm, realpath);
            verbose && console.log("hashing done. Saved here :", realpath);
        }
        if(!outputperf) {
            await utils.saveFile(outputusfm.usfm, filename + ".usfm");
        }
    }

    console.log("File saved as " + filename);
}
