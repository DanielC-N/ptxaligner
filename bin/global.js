#!/usr/bin/env node

var ptxaligner = require('../dist/main.js');
const args = process.argv.splice(process.execArgv.length + 2);

ptxaligner(args);