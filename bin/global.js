#!/usr/bin/env node

const ptxaligner = require('../dist/main.js');
const utils = require("../src/utils/utils");
const { program } = require('commander');

program
    .version("1.2.0")
    .option('-c, --config <path...>', 'paths to the config files')
    .option('-p, --perf', 'output a perf file instead of an usfm file')
    .option('-h, --hashbylemma <path>', 'output a report listing the lemmas with all their translations in the usfm')
    .option('-v, --verbose', 'verbose')
    .option('-s, --segond <path>', 'one time align improve')

program.parse();

const options = program.opts();
const args = program.args;
const la = args.length;

if(options.segond !== undefined) {
    utils.parseLSG(options.segond);
    return;
}

let getHash = options.hashbylemma !== undefined;
if(la === 1) {
    ptxaligner(args[0], options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? options.hashbylemma: "");
} else if(options.config && options.config.length > 0) {
    options.config.forEach((path, i) => {
        ptxaligner(path, options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? i + options.hashbylemma: "");
    });
}