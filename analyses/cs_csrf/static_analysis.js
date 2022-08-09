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
		Static analysis main for clien-side CSRF
*/


/**
 * ------------------------------------------------
 *   			third-party imports
 * ------------------------------------------------
**/
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");
const elapsed = require("elapsed-time-logger");

/**
 * ------------------------------------------------
 *   				module imports
 * ------------------------------------------------
**/
const SourceSinkAnalyzerModule = require('./cs_csrf_traversals.js');
const SourceSinkAnalyzer = SourceSinkAnalyzerModule.CSCSRFSourceSinkAnalyzer;


const GraphExporter = require('./../../engine/core/io/graphexporter');

/**
 * ------------------------------------------------
 *  			constants and globals
 * ------------------------------------------------
**/

// directory where the data of the crawling will be saved
const BASE_DIR = pathModule.resolve(__dirname, '../..')
const dataStorageDirectory = pathModule.join(BASE_DIR, 'data');

// when true, nodejs will log the current step for each webpage to the console 
const DEBUG = true; 		




var libraryHeuristics = []


/**
 * ------------------------------------------------
 *  			utility functions
 * ------------------------------------------------
**/


function isLibraryScript(scriptContent){
	let flag = false;
	for(let h of libraryHeuristics){
		if(scriptContent.includes(h)){
			flag = true;
			break;
		}
	}
	return flag;
}

const withTimeout = (millis, promise) => {
    const timeout = new Promise((resolve, reject) =>
        setTimeout(
            () => reject(`Timed out after ${millis} ms.`),
            millis));
    return Promise.race([
        promise,
        timeout
    ]);
};


/** 
 * @function readFile 
 * @param file_path_name: absolute path of a file.
 * @return the text content of the given file if it exists, otherwise -1.
**/
function readFile(file_path_name){
	try {
		const data = fs.readFileSync(file_path_name, 'utf8')
		return data;
	} catch (err) {
		// console.error(err);
		return -1;
	}
}


/** 
 * @function getNameFromURL 
 * @param url: eTLD+1 domain name
 * @return converts the url to a string name suitable for a directory by removing the colon and slash symbols
**/
function getNameFromURL(url){
	return url.replace(/\:/g, '-').replace(/\//g, '');
}


/** 
 * @function hashURL 
 * @param url: string
 * @return returns the SHA256 hash of the given input in hexa-decimal format
**/
function hashURL(url){
	const hash = crypto.createHash('sha256').update(url, 'utf8').digest('hex');
	return hash;
}


/** 
 * @function getOrCreateDataDirectoryForWebsite 
 * @param url: string
 * @return creates a directory to store the data of the input url and returns the directory name.
**/
function getOrCreateDataDirectoryForWebsite(url){
	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
	return folderPath;
}


/**
 * ------------------------------------------------
 *  		Main Static Analysis Thread
 * ------------------------------------------------
**/


async function staticallyAnalyzeWebpage(url, webpageFolder){

	let results_timing_file = pathModule.join(webpageFolder, "time.static_analysis.out");
	if(fs.existsSync(results_timing_file)){
		DEBUG && console.log('[skipping] results already exists for: '+ webpageFolder)
		return 1;
	}


	// read the crawled scripts from disk
	let scripts = [];
	let dirContent = fs.readdirSync( webpageFolder );
	let scriptFiles = dirContent.filter(function( elm ) {return elm.match(/.*\.(js$)/ig);});
	for(let i=0; i<scriptFiles.length; i++){
		let scriptName = pathModule.join(webpageFolder, '' + i + '.js');
		let scriptContent = await readFile(scriptName);
		if(scriptContent != -1 && !isLibraryScript(scriptContent)){
			scripts.push({
				scriptId: i,
				source: scriptContent,
				name: scriptName,
			})
		}
	}
	
	/*
	*  ----------------------------------------------
	*  [START] 
	*  ----------------------------------------------
	*  0: building the static model
	*  1: querying the model to find the sources 
	*/

	/** 
	* 0: Building the static model
	*/
	const totalTimer = elapsed.start('total_static_timer');
	const hpgConstructionTimer = elapsed.start('hpg_construction_timer');
	DEBUG && console.log('[StaticAnalysis] started static model construction.');
	let SourceSinkAnalyzerInstance = new SourceSinkAnalyzer();

	DEBUG && console.log('[StaticAnalysis] AST parsing.');

	let scriptsCode = '';
	let parsingErrors = [];
	for(let [idx, script] of scripts.entries()){
		let scriptName = script.name; // '' + idx + '.js';
		let parsingError = await SourceSinkAnalyzerInstance.api.initializeModelsFromSource(scriptName, script.source)
		if(parsingError && parsingError === scriptName){
			parsingErrors.push(parsingError);
		}
		scriptsCode = scriptsCode + script.source + '\n\n';
	}

	DEBUG && console.log('[StaticAnalysis] HPG construction.');
	await SourceSinkAnalyzerInstance.api.buildInitializedModels();
	DEBUG && console.log('[StaticAnalysis] AST/CFG/PDG done.')

	const basicHpgConstructionTime = hpgConstructionTimer.get(); // AST, CFG, PDG
	hpgConstructionTimer.end();



	const CsvHpgConstructionTimer = elapsed.start('csv_hpg_construction_timer');
	DEBUG && console.log('[StaticAnalysis] started HPG export: IPCG/ERDDG/SemTypes.')
	const graph = await SourceSinkAnalyzerInstance.api.buildHPG({ 'ipcg': true, 'erddg': true }); // IPCG, ERDDG + SemanticTypes + node/edge format
	const graphid = hashURL(url);
	GraphExporter.exportToCSV(graph, graphid, webpageFolder);
	DEBUG && console.log('[StaticAnalysis] finished HPG export: IPCG/ERDDG/SemTypes.')
	DEBUG && console.log('[StaticAnalysis] started compressing HPG.')
	GraphExporter.compressGraph(webpageFolder);
	DEBUG && console.log('[StaticAnalysis] finished compressing HPG.')
	const CsvHpgConstructionTime = CsvHpgConstructionTimer.get();
	CsvHpgConstructionTimer.end();


	const totalTime = totalTimer.get();
	totalTimer.end();


	const pdgMarker =  pathModule.join(webpageFolder, "pdg.tmp");
	await fs.writeFileSync(pdgMarker, JSON.stringify({"pdg": 0}));


	// store elapsed time to disk
	fs.writeFileSync(pathModule.join(webpageFolder, "time.static_analysis.out"), JSON.stringify({
		"total_static_timer": totalTime,
		"csv_hpg_construction_timer": CsvHpgConstructionTime,
		"in_memory_hpg_construction_timer": basicHpgConstructionTime,
	}));



}


/*
* entry point of exec
*/
(async function(){

    var processArgv = argv(process.argv.slice(2));
    var config = processArgv({}) || {};
    const seedurl = config.seedurl;
    const singleFolder = config.singlefolder;


	if(singleFolder && singleFolder.length > 10){

		if(fs.existsSync(singleFolder)){
				var urlContent = readFile(pathModule.join(singleFolder, "url.out"));
				if(urlContent != -1){
					var webpageUrl = urlContent.trim();
					await staticallyAnalyzeWebpage(webpageUrl, singleFolder);				
				}
		}else{
			console.log('[Warning] the following directory does not exists, but was marked for static analysis: '+ webpageFolder +'\n url is: '+ webpageUrl);
		}	

	}else{

	    const dataDirectory = getOrCreateDataDirectoryForWebsite(seedurl);
		const urlsFile = pathModule.join(dataDirectory, "urls.out");
		const urlsFileContent = readFile(urlsFile);

		if(urlsFileContent != -1){
			
			const globalTimer = elapsed.start('global_static_timer');
			
			const urls = new Set(urlsFileContent.split("\n")); // do not consider duplicate urls

			for(let webpageUrl of urls.values()){
				
				if(webpageUrl.trim().length > 1 ){ // eliminate empty strings
					let _hash = hashURL(webpageUrl);
					let webpageFolder = pathModule.join(dataDirectory, _hash);
					if(fs.existsSync(webpageFolder)){
							await staticallyAnalyzeWebpage(webpageUrl, webpageFolder);		

					}else{
						console.log('[Warning] the following directory does not exists, but was marked for static analysis: '+ webpageFolder +'\n url is: '+ webpageUrl);
					}			
				}	
			}

			const globalTime = globalTimer.get();
			globalTimer.end();
			fs.writeFileSync(pathModule.join(dataDirectory, "time.static_analysis.out"), JSON.stringify({
				"total_static_timer": globalTime,
			}));

		}
		else{
			console.log('[Warning] urls.out is empty for website: '+ seedurl +', thus exiting static-analysis pass.')
		}
	}

})();






