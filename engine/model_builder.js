
/*
    Copyright (C) 2020  Soheil Khodayari, CISPA
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
    Interface to build HPG intermediate models 


	Exports:
	------------
  	> initializeModelsFromSource(),
  	> createASTFromSource(),
  	> buildInitializedModels(),
 	> buildHPG()

*/



const fs = require('fs');
const pathModule = require('path');
const CLIModule = require('./core/cli/cli');
const IOModule = require('./core/io/sourcereader');

// const CFGBuilder = require('./lib/jaw/cfg/cfgbuilder'); // CFGBuilder.getCFG(ast);

const constantsModule = require('./lib/jaw/constants');

var scopeCtrl = require('./lib/jaw/scope/scopectrl'),
	modelCtrl = require('./lib/jaw/model/modelctrl'),
	modelBuilder = require('./lib/jaw/model/modelbuilder'),
	GraphAnalyzer = require('./lib/jaw/def-use/defuseanalysisexecutor'),
	variableAnalyzer = require('./lib/jaw/def-use/variableanalyzer'),
  flownodeFactory = require('./lib/esgraph/flownodefactory'),
  graphBuilder = require('./lib/jaw/graphbuilder');

 var codeProcessor = require('./core/transformation/preprecessor');

// const uastMapper = require('./core/uast/mapper');

/**
 * Get parser for a given language
 * @param {String} language
 */
async function getParser(language){
	"use strict";
	var parser;
	if(language == constantsModule.LANG.js || language == constantsModule.LANG.nodejs){
		parser =  require('./lib/jaw/parser/jsparser');
	} 
	else {
		parser = null;
	}
	return parser;

}


/**
 * Creates an abstract syntax tree from code string
 * @param {String} code (string of the code)
 * @param {String} language (options: js | nodejs)
 * @param {Object} [options] Option object
 * @returns {Object} AST
 */
async function createASTFromSource(code, language, options){

	try {
		var parser = await getParser(language);
		if(parser) {
			return await parser.parseAST(code, options);
		}
		console.log("[-] parser not found.");
		return null;
	}
	catch(err){
		console.log("[-] parser error.");
		constantsModule.verboseMode && console.log(err);
		return null;
	}

}


/**
 * Initializes the parse tree with unique node IDs
 * @param {String} scriptName (unique path name of the script)
 * @param {String} code (string of the code)
 * @param {String} language (options: js | nodejs)
 * @param {Bool} preprocessing: whether to do code preprocessing and transformation before analysis
 * @returns {void}
 */
async function initializeModelsFromSource(scriptName, code, language, preprocessing){
	"use strict";
	var lang = language || constantsModule.LANG.js;
	var parser = await getParser(lang);
	var options = null; // fall back to default parser options
	console.log('[-] parsing script: '+ scriptName);
	var ast = await createASTFromSource(code, lang, options);
	if( !ast )
	{
		console.log("[-] exiting CPG generation, as parser error occured.");
		return scriptName;
	}

	if(typeof preprocessing === 'undefined'){
		// do the code preprocessing by default
		preprocessing = true;
	}

	if(preprocessing){
		let inputScript = scriptName;
		let outputScript = inputScript.replace(/\.js$/, "") + '.prep.js';
		
		let result = await codeProcessor.startPasses(inputScript, ast, outputScript);
		
		if(result && result.success){

			// change the input to the new processed script
			ast = result.ast;	
			scriptName = outputScript;

		}

	}


	if(ast && ast.type == "Program"){
		ast.value = scriptName;
		ast.kind = lang; // store the lang
 	}
    await parser.traverseAST(ast, function(node){
        if(node && node.type){
            let _id = flownodeFactory.count;
            if(_id in flownodeFactory.generatedExitsDict){
                 flownodeFactory.count= flownodeFactory.count + 1; 
                 _id = flownodeFactory.count    
            }
            node._id = _id;
            flownodeFactory.count= flownodeFactory.count + 1;           
        }
    });
    // add ast to scope
	await scopeCtrl.addPageScopeTree(ast);

	console.log('[-] finished adding node ids to AST');

}


function wait(ms) {
  return new Promise(function(resolve, reject) { 
    setTimeout(resolve, ms, 'HASH_TIMED_OUT');
  });
}


/**
 * Build the CPG models for the initialized ASTs constructed with `initializeModels()`
 * @returns NULL
 */
async function buildInitializedModels(){

	// analyze existing vars in scope
	await modelCtrl.initializePageModels();
	// variableAnalyzer.setLocalVariables(scopeCtrl.domainScope);
	await scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
	    pageScopeTree.scopes.forEach(function (scope) {
	        variableAnalyzer.setLocalVariables(scope);
	    });
	});

	// build CFG and PDG
	await GraphAnalyzer.buildIntraProceduralModelsOfEachPageModels()
	await GraphAnalyzer.buildInterProceduralModelsOfEachPageModels()

}


/**
 * Builds the rest of the HGP models (ERDDG, IPCG, Semantic Types)
 * and returns a graph that is sutiable for exporting the node and relationship 
 * CSV files.
 * @returns {dict} HPG nodes and edges
 */
async function buildHPG(options){

	// ERDDG, IPCG, Semantic Types
	var opts = options || { 'ipcg': true, 'erddg': true };
	var graph =  await graphBuilder.getInterProceduralModelNodesAndEdges({}, opts);

	return graph;
}




module.exports = {
  initializeModelsFromSource: initializeModelsFromSource,
  createASTFromSource: createASTFromSource,
  buildInitializedModels: buildInitializedModels,
  buildHPG: buildHPG,
};
