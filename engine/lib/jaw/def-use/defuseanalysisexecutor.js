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
*/

/*
 * DefUseAnalysisExecutor module
 */
var jsParser = require('../parser/jsparser'),
	scopeCtrl = require('../scope/scopectrl'),
	modelCtrl = require('../model/modelctrl'),
	modelBuilder = require('../model/modelbuilder'),
	defuseAnalyzer = require('./defuseanalyzer'),
	variableAnalyzer = require('./variableanalyzer'),
    flownodefactory = require('./../../esgraph/flownodefactory'), 
    constantsModule = require('./../constants'),
    loggerModule = require('./../../../core/io/logging');

const { performance } = require('perf_hooks');


function DefUseAnalysisExecutor() {
}

/* start-public-methods */
/**
 * Initialize
 * @param {Array} codeOfPages Source code of each page
 */
DefUseAnalysisExecutor.prototype.initialize = function (codeOfPages) {
	"use strict";
	if (codeOfPages instanceof Array) {
		codeOfPages.forEach(function (code) {
			var ast = jsParser.parseAST(code, {range: true, loc: true, tolerant: constantsModule.tolerantMode});
            jsParser.traverseAST(ast, function(node){
                if(node && node.type){
                    let _id = flownodefactory.count;
                    // if(flownodefactory.generatedExits.some(e => e.id == _id)){ // this statement is slow because of some(), replace with dictonary key lookup
                    if(_id in flownodeFactory.generatedExitsDict){
                         flownodefactory.count= flownodefactory.count + 1; 
                         _id = flownodefactory.count    
                    }
                    node._id = _id;
                    flownodefactory.count= flownodefactory.count + 1;           
                }
            });
			scopeCtrl.addPageScopeTree(ast);
		});
		modelCtrl.initializePageModels();
        variableAnalyzer.setLocalVariables(scopeCtrl.domainScope);
        scopeCtrl.pageScopeTrees.forEach(function (pageScopeTree) {
            pageScopeTree.scopes.forEach(function (scope) {
                variableAnalyzer.setLocalVariables(scope);
            });
        });
	}
};


/**
 * Build model graphs for each intra-procedural model in every PageModels
 */
DefUseAnalysisExecutor.prototype.buildIntraProceduralModelsOfEachPageModels = function () {
	"use strict";

	modelBuilder.buildIntraProceduralModels(); // CFG

    constantsModule.staticModelPrintPhases && console.log('PDG start');
    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
    

    // modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
    //     pageModels.intraProceduralModels.forEach(function (model) {
    //         defuseAnalyzer.doAnalysis(model);
    //         defuseAnalyzer.findDUPairs(model);

    //     });
    // });

    var startTime = performance.now();
    var timeout = constantsModule.timeoutPDGGeneration;

    let pageModelsCollection = modelCtrl.collectionOfPageModels; // map
    let pageModelsIterator = pageModelsCollection.values();
    for (let i=0; i< pageModelsCollection.size; i++){
        let models = pageModelsIterator.next().value.intraProceduralModels; // array
        for (let j=0; j< models.length; j++){
            defuseAnalyzer.doAnalysis(models[j]);
            defuseAnalyzer.findDUPairs(models[j]);

            if(performance.now() - startTime > timeout){
                constantsModule.staticModelPrintPhases && console.log('breaking loop');
                return true;
            }

        } 
    }

    constantsModule.staticModelPrintPhases && console.log('PDG end');
    return false;
};

DefUseAnalysisExecutor.prototype.buildInterProceduralModelsOfEachPageModels = function () {
    "use strict";

    
    modelBuilder.buildInterProceduralModels();  // CFG

    // modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
    //     pageModels.interProceduralModels.forEach(function (model) {
    //         defuseAnalyzer.doAnalysis(model);
    //         defuseAnalyzer.findDUPairs(model);
    //     });
    // });

    var startTime = performance.now();
    var timeout = constantsModule.timeoutPDGGeneration;

    let pageModelsCollection = modelCtrl.collectionOfPageModels; // map
    let pageModelsIterator = pageModelsCollection.values();
    for (let i=0; i< pageModelsCollection.size; i++){
        let models = pageModelsIterator.next().value.interProceduralModels; // array
        for (let j=0; j< models.length; j++){
            defuseAnalyzer.doAnalysis(models[j]);
            defuseAnalyzer.findDUPairs(models[j]);

            if(performance.now() - startTime > timeout){
                constantsModule.staticModelPrintPhases && console.log('breaking loop');
                return true;
            }
        } 
    }
    return false;
 
};


/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;