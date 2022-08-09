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
	    This is the main node.js program for creating an HPG, i.e., node.csv, rels.csv files.

	    Usage:
	    ------------
	    node engine/cli.js  --lang=js --graphid=graph1 --input=/in/file1.js --input=/in/file2.js --output=/out/dir/ --mode=csv --preprocess=true

		OPTIONS
	    --lang: 	language of the input program
	    --graphid:  an identifier for the generated HPG
	    --input: 	path of the input program(s)
	    --output: 	path of the output HPG
	    --mode: 	determines the output format (csv or graphML)
	    --preprocess: run AST preprocessing passes over code before analysis

*/


const constantsModule = require('./lib/jaw/constants');
const GraphExporter = require('./core/io/graphexporter');
const CLIModule = require('./core/cli/cli');
const SourceReader = require('./core/io/sourcereader');
const fs = require("fs");

function requireUncached(module) {
		delete require.cache[require.resolve(module)];
		return require(module);
}

/**
 * HPGContainer
 * @constructor
 */
function HPGContainer() {
	"use strict";
	// re-instantiate every time
	this.api = require('./model_builder');
	this.scopeCtrl = require('./lib/jaw/scope/scopectrl');
	this.modelCtrl = require('./lib/jaw/model/modelctrl');
	this.modelBuilder = require('./lib/jaw/model/modelbuilder');
	this.scopeCtrl.clear();
	this.modelCtrl.clear();
}




/**
 * UUIDv4 generator
 */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


/**
 * main
 */
(async function main(){

	const args = CLIModule.readArgvInput();

	// prepare graph id
	const graphid = (args.graphid === '')? 'graph-' + uuidv4() : args.graphid;

	// do the code preprocessing by default
	const do_preprocessing = (args.preprocess.toLowerCase() === 'false')? false: true;

	// input language
	if(args.lang !== constantsModule.LANG.js && args.lang !== constantsModule.LANG.python && args.lang !== constantsModule.LANG.php){
		console.log("[-] error: unsupported language "+ args.lang);
		process.exit()
	}
	
	// prepare output location
	const outputDirectory = args.output;
	if (!fs.existsSync(outputDirectory)){
		fs.mkdirSync(outputDirectory, {recursive: true});
	}


	// prepare input and initialize models
	const inputFiles = (args.input && Array.isArray(args.input))? args.input: [args.input];

	let hpgContainer = new HPGContainer();
	
	// build the graph
	for(let i=0; i<inputFiles.length; i++){

		let filename = inputFiles[i];
		let code = await SourceReader.getSourceFromFile(filename);
		await hpgContainer.api.initializeModelsFromSource(filename, code, args.lang, do_preprocessing) /* args.lang: only JS is supported at the moment */

		
	}

	await hpgContainer.api.buildInitializedModels();
	const graph = await hpgContainer.api.buildHPG({ 'ipcg': true, 'erddg': true });

	// export to disk
	if(args.mode === 'graphML'){
		await GraphExporter.exportToGraphML(graph, graphid, args.output);
		
	}else{
		await GraphExporter.exportToCSV(graph,graphid, args.output);
	}


})();

