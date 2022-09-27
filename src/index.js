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

module.exports = async function ptxaligner(args) {
    const lena = args.length;
    if(lena < 1 || lena > 1) {
        throw Error("invalid number of arguments. Given : " + lena + ". Expected : exactly 1");
    }

    const pk = new ProskommaInterface();
    const config = JSON.parse(fse.readFileSync(path.resolve(args[0])).toString());

    const addr_greek = config.greek_usfm_path;
    const selectors_greek = config.greek_selectors;
    const addr_french = config.raw_usfm_path;
    const selectors_french = config.raw_usfm_selectors;
    const addr_ptx = config.ptx_path;

    await pk.addDocumentHttp(addr_greek, "gre", "ugnt");
    await pk.addDocumentHttp(addr_french);
    const ptx_titus = await getDocumentHttp(addr_ptx);

    const pipeline = new PipelineHandler(pk.getInstance(), pipelines);
    const output = await pipeline.runPipeline("alignmentPipeline", {
        greek_usfm: pk.getUsfm("gre_ugnt"),
        french_usfm: pk.getUsfm("fra_ust"),
        ptx: ptx_titus,
        selectors_greek: selectors_greek,
        selectors_french: selectors_french
    });

    await pk.saveFile(output.perf, "./alignedtext.json");

}
