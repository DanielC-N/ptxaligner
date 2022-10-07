#!/usr/bin/env node

const ptxaligner = require('../dist/main.js');
const { program } = require('commander');

program
    .version("1.3.0")
    .option('-c, --config <path...>', 'paths to the config files')
    .option('-p, --perf', 'output a perf file instead of an usfm file')
    .option('-h, --hashbylemma <path>', 'output a perf file instead of an usfm file')
    .option('-v, --verbose', 'verbose')

program.parse();

const options = program.opts();
const args = program.args;
const la = args.length;

let getHash = options.hashbylemma !== undefined;
if(la === 1) {
    ptxaligner(args[0], options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? options.hashbylemma: "");
} else if(options.config && options.config.length > 0) {
    options.config.forEach((path, i) => {
        ptxaligner(path, options.perf !== undefined, options.verbose !== undefined, getHash, getHash ? i + options.hashbylemma: "");
    });
}