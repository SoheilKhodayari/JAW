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
  Runs the test files for the detection of DOM Clobbering sources
  Note that input test files are under /tests/source-detection/

  Usage:
  ------------
  node static_detector_tests.js

*/



const fs = require('fs')
const pathModule = require('path');

const DOMClobberingSourceSinkAnalyzerModule = require('./domc_traversals.js');
const DOMClobberingSourceSinkAnalyzer = DOMClobberingSourceSinkAnalyzerModule.DOMClobberingSourceSinkAnalyzer;

const DEBUG = true;
const BASE_PATH_INPUT_SCRIPTS = __dirname + '/../../tests/source-detection/';

function read_file(file_path_name){
	try {
	  const data = fs.readFileSync(file_path_name, 'utf8')
	  return data;
	} catch (err) {
	  console.error(err)
	  return -1;
	}
}


async function run_test(test_obj){

	let test_name = test_obj.test_name;
	let test_scripts = test_obj.test_scripts;

	DEBUG && console.log('[StaticAnalysis] started static model construction.');
	let domcSourceSinkAnalyzer = new DOMClobberingSourceSinkAnalyzer();

	let scriptsCode = '';
	let parsingErrors = [];
	for(let [idx, script_path] of test_scripts.entries()){
		let code = await read_file(script_path);
		if(code === -1){
			console.error('[-] Error: cannnot read the input file.');
			return;
		}
		// let scriptName = '' + idx + '.js';
		let scriptName = script_path.substring(script_path.lastIndexOf('/') + 1);;
		let parsingError = await domcSourceSinkAnalyzer.domcModelBuilder.initializeModelsFromSource(scriptName, code);
		if(parsingError && parsingError === scriptName){
			parsingErrors.push(parsingError);
		}
	}


	await domcSourceSinkAnalyzer.domcModelBuilder.buildInitializedModels();
	DEBUG && console.log('[StaticAnalysis] static model construction finished.')


	/** 
	* 1: Traversals
	*/
	DEBUG && console.log('[StaticAnalysis] querying DOMC sources');
	const domcSources = await domcSourceSinkAnalyzer.run_domc_source_traversals();
	DEBUG && console.log('[StaticAnalysis] DOMC source queries completed');

	DEBUG && console.log('[StaticAnalysis] started saving DOMC sources.');
	const domcSourcesWithUrl = {
		"test_name": test_name,
		"sources": domcSources,
		"parsing_errors": parsingErrors,
	}
	const domcSourcesWithUrlJson = JSON.stringify(domcSourcesWithUrl, null, 2);
	const outputDirectory = pathModule.join(BASE_PATH_INPUT_SCRIPTS, test_name);
	const domcSourceOutputFileName =  pathModule.join(outputDirectory, "sources.out.json");
	await fs.writeFileSync(domcSourceOutputFileName, domcSourcesWithUrlJson); 

	DEBUG && console.log('[StaticAnalysis] finished saving DOMC sources.');



	DEBUG && console.log('[StaticAnalysis] querying DOMC sinks');
	const domcSinks = await domcSourceSinkAnalyzer.run_domc_sink_traversals();
	DEBUG && console.log('[StaticAnalysis] DOMC sink queries completed');

	DEBUG && console.log('[StaticAnalysis] started saving DOMC sinks.');
	const domcSinksWithUrl = {
		"test_name": test_name,
		"sinks": domcSinks,
		"parsing_errors": parsingErrors,
	}
	const domcSinksWithUrlJson = JSON.stringify(domcSinksWithUrl, null, 2);
	const domcSinksOutputFileName =  pathModule.join(outputDirectory, "sinks.out.json");
	await fs.writeFileSync(domcSinksOutputFileName, domcSinksWithUrlJson); 
	DEBUG && console.log('[StaticAnalysis] finished saving DOMC sinks.');


}


/*
* entry point of exec
*/
(async function(){

	const tests = [];
	
	// which files belong to the same web page (i.e., should be modeled together)?
	const test_name = "test_1";
	const test_scripts = [BASE_PATH_INPUT_SCRIPTS + test_name + "/file1.js", BASE_PATH_INPUT_SCRIPTS + test_name + "/file2.js"];

	tests.push({
		"test_name": test_name,
		"test_scripts": test_scripts
	});

	for(let test_obj of tests){
		await run_test(test_obj)
	}

})();