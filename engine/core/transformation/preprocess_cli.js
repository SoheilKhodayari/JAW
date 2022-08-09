#! /usr/bin/env node

/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.


    Description:
    ------------
    Interface - Preprocess JavaScript Code and Transform


    Usage:
    ------------
    > node preprocess_cli.js --input=/input-file --output=/output-file

    Tests:
    ------------
    > node preprocess_cli.js --input=tests/test_1.js

*/




const esmangle = require('esmangle');
const escodegen = require('escodegen');
const fs = require("fs");

var esprimaParser = require('./../../lib/jaw/parser/jsparser');
var passes = require('./passes').createPipeline;


const argv = require("process.argv");
const processArgv = argv(process.argv.slice(2));
const config = processArgv({}) || {};

if(!config.input){
  console.log('[Error] no input file for preprocessing.');
  process.exit();
}

if(!config.output){
  config.output = config.input.replace(/\.js$/, "") + '.prep.js';
}

if(!config.destructive){
  config.destructive = true;
}

var code;

try {
  code = fs.readFileSync(config.input, 'utf-8');
} catch (e) {
  console.error(e);
  process.exit(1);
}


var ast = esprimaParser.parseAST(code);
try{
	ast = esmangle.optimize(ast, passes(), {
    destructive: config.destructive
  });
}
catch(e){
	console.error("[Error] problem in mangling", e);
}


var processed_code = escodegen.generate(ast, {
  comment: true
});

fs.writeFileSync(config.output, processed_code)
