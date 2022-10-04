import PipelineHandler from './classes/PipelineHandler';
import ProskommaInterface from './classes/ProskommaInterface';
import Axios from "axios";
import pipelines from '../data/pipelines';
import utils from "./utils/utils";
import glWordsForLemma from './utils/gl_words_for_lemma';

const path = require("path");
const fse = require("fs-extra");


module.exports = async function ptxaligner(rpath, outputperf=false, verbose=false, hashByLemma=false, pathhash="") {
    const pk = new ProskommaInterface();
    const resolvedPath = path.resolve(rpath);
    const perf = JSON.parse(fse.readFileSync(resolvedPath).toString());
    const nameFile = resolvedPath.split("/").pop().split(".")[0];
    const filename = `./usfmtext_${nameFile}`;

    const pipeline = new PipelineHandler(pk.getInstance(), pipelines);

    verbose && console.log("running perf2usfmPipeline... ");
    let output = await pipeline.runPipeline("perf2usfmPipeline", {
        perf: perf
    });
    verbose && console.log("Done");

    await utils.saveFile(output.usfm, filename + ".usfm");

    console.log("File saved as " + filename);
}
