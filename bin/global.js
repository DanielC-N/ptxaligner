#!/usr/bin/env node

const ptxaligner = require('../dist/main.js');
const { program } = require('commander');

program
    .version("1.4.0")
    .option('-c, --config <path...>', 'paths to the config files')
    .option('-p, --perf', 'output a perf file instead of an usfm file')
    .option('-l, --hashbylemma <path>', 'generate a report that link the lemmas with their translation')
    .option('-v, --verbose', 'verbose')
    .option('-x, --save-xml', 'save the parsed xml into a json file')

program.parse();

const options = program.opts();
const args = program.args;
const la = args.length;

let getHash = options.hashbylemma !== undefined;
if(la === 1) {
    ptxaligner(args[0], options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? options.hashbylemma: "", options.saveXml !== undefined);
} else if(options.config && options.config.length > 0) {
    options.config.forEach((path, i) => {
        ptxaligner(path, options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? i + options.hashbylemma: "", options.saveXml !== undefined);
    });
}