import PipelineHandler from './classes/PipelineHandler';
import ProskommaInterface from './classes/ProskommaInterface';
import Axios from "axios";
import pipelines from '../data/pipelines';

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

module.exports = async function ptxaligner(rpath, outputperf=false, verbose=false) {
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
    const ptx_titus = await getDocumentHttp(addr_ptx);
    verbose && console.log("Done");

    const pipeline = new PipelineHandler(pk.getInstance(), pipelines);
    if(outputperf) {
        verbose && console.log("running alignmentPipeline... ");
        let output = await pipeline.runPipeline("alignmentPipeline", {
            greek_usfm: pk.getUsfm("gre_ugnt"),
            target_lang_usfm: pk.getUsfm("fra_ust"),
            ptx: ptx_titus,
            selectors_greek: selectors_greek,
            selectors_target_lang: selectors_target_lang
        });
        verbose && console.log("Done");
        await pk.saveFile(output.perf, filename + ".json");
    } else {
        verbose && console.log("running alignmentPipelineUSFMOutput... ");
        let output = await pipeline.runPipeline("alignmentPipelineUSFMOutput", {
            greek_usfm: pk.getUsfm("gre_ugnt"),
            target_lang_usfm: pk.getUsfm("fra_ust"),
            ptx: ptx_titus,
            selectors_greek: selectors_greek,
            selectors_target_lang: selectors_target_lang
        });
        verbose && console.log("Done");
        await pk.saveFile(output.usfm, filename + ".usfm");
    }

    console.log("File saved as " + filename);
}
