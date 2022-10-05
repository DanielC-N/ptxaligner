import PipelineHandler from './classes/PipelineHandler';
import ProskommaInterface from './classes/ProskommaInterface';
import Axios from "axios";
import pipelines from '../data/pipelines';
import saveFile from "./utils/utils";
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
    const filename = `./better_alignedtext_${nameFile}`;

    const pipeline = new PipelineHandler(pk.getInstance(), pipelines);

    verbose && console.log("running parseGreekTESTS... ");
    let output = await pipeline.runPipeline("parseGreekTESTS", {
        greek_usfm: pk.getUsfm("gre_ugnt"),
        selectors_greek: selectors_greek,
    });
    verbose && console.log("Done");

    await saveFile(output.perf, filename + ".json");

    console.log("File saved as " + filename);
}
