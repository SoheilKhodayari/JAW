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
    constantsModule = require('./../constants');

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
                    if(flownodefactory.generatedExits.some(e => e.id == _id)){
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
	modelBuilder.buildIntraProceduralModels();

    defuseAnalyzer.initiallyAnalyzeIntraProceduralModels();
    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraProceduralModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildInterProceduralModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildInterProceduralModels();

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.interProceduralModels.forEach(function (model) {

            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildIntraPageModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildIntraPageModel();

    modelCtrl.collectionOfPageModels.forEach(function (pageModels) {
        pageModels.intraPageModels.forEach(function (model) {
            defuseAnalyzer.doAnalysis(model);
            defuseAnalyzer.findDUPairs(model);
        });
    });
};

DefUseAnalysisExecutor.prototype.buildInterPageModelsOfEachPageModels = function () {
    "use strict";
    modelBuilder.buildInterPageModel();
    defuseAnalyzer.doAnalysis(modelCtrl.interPageModel);
    defuseAnalyzer.findDUPairs(modelCtrl.interPageModel);
};
/* start-public-methods */

var analysisExecutor = new DefUseAnalysisExecutor();
module.exports = analysisExecutor;