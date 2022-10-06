import PipelineHandler from './classes/PipelineHandler';
import ProskommaInterface from './classes/ProskommaInterface';
import Axios from "axios";
import pipelines from '../data/pipelines';
import utils from "./utils/utils";
import glWordsForLemma from './utils/gl_words_for_lemma';

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
    const filename = `./alignedtext_${nameFile}`;

    const addr_greek = config.greek_usfm_path;
    const selectors_greek = config.greek_selectors;
    const addr_target_lang = config.raw_usfm_path;
    const selectors_target_lang = config.raw_usfm_selectors;
    const addr_ptx = config.ptx_path;

    verbose && console.log("Retrieving greek usfm... ");
    await pk.addDocumentHttp(addr_greek, "gre", "ugnt");
    verbose && console.log("Done");

    verbose && console.log("Retrieving target lang usfm... ");
    await pk.addDocumentHttp(addr_target_lang);
    verbose && console.log("Done");

    verbose && console.log("Retrieving ptx... ");
    const ptx = await getDocumentHttp(addr_ptx);
    verbose && console.log("Done");

    const pipeline = new PipelineHandler(pk.getInstance(), pipelines);

    verbose && console.log("running alignmentPipeline... ");
    let output = await pipeline.runPipeline("alignmentPipeline", {
        greek_usfm: pk.getUsfm("gre_ugnt"),
        target_lang_usfm: pk.getUsfm("fra_ust"),
        ptx: ptx,
        selectors_greek: selectors_greek,
        selectors_target_lang: selectors_target_lang
    });
    verbose && console.log("Done");

    if(outputperf) {
        await saveFile(output.perf, filename + ".json");
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
            await saveFile(outputusfm.usfm, filename + ".usfm");
        }
    }

    console.log("File saved as " + filename);
}
