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
 * ModelBuilder module
 */
var FlowNode = require('../../esgraph/flownode'),
	Def = require('./../def-use/def'),
	modelCtrl = require('./modelctrl'),
	cfgBuilder = require('./../cfg/cfgbuilder'),
	scopeCtrl = require('./../scope/scopectrl'),
    factoryFlowNode = require('../../esgraph/flownodefactory'),
	factoryModel = require('./modelfactory');

var varDefFactory = require('./../def-use/vardeffactory');
var defFactory = require('./../def-use/deffactory');
var escodegen = require('escodegen');

var esprimaParser = require('./../parser/jsparser');

var	Map = require('core-js/es6/map'),
    Set = require('../../analyses/set'),
    walkes = require('walkes');

/**
 * ModelBuilder
 * @constructor
 */
function ModelBuilder() {
    "use strict";

    /* start-test-block */
    this._testonly_ = {
        _connectCallerCalleeScopeRelatedModelsAtCallSite: connectCallerCalleeScopeRelatedModelsAtCallSite,
		_getInterProceduralModelStartFromTheScope: getInterProceduralModelStartFromTheScope,
		_connectLoopNodeToPageGraph: connectLoopNodeToPageGraph,
		_connectPageAndEventHandlers: connectPageAndEventHandlers,
		_getRegisteredEventHandlerCallback: getRegisteredEventHandlerCallback,
        _findEventHandlerModelsFromAModel: findEventHandlerModelsFromAModel,
		_getNodesWhereDefiningLocalStorageObject: getNodesWhereDefiningLocalStorageObject,
		_connectDomainScopeGraphToModelOfPages: connectDomainScopeGraphToModelOfPages,
        _setScopeOfGraphNodes: setScopeOfGraphNodes
    };
    /* end-test-block */
}

/**
 * Set the scope of graph nodes
 * @param {Array} graph
 * @param {Scope} scope
 */
function setScopeOfGraphNodes(graph, scope) {
    "use strict";
    graph[2].forEach(function (node) {
        node.scope = scope;
    });
}

/**
 * Produce collection of Model for intra-procedural dataflow
 */
ModelBuilder.prototype.buildIntraProceduralModels = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		scopeTree.scopes.forEach(function (scope) {
			var model = factoryModel.create();
            try{
                if (scope.ast.type === 'FunctionDeclaration' || scope.ast.type === 'FunctionExpression' || scope.ast.type === 'ArrowFunctionExpression') {
                    
                    model.graph = cfgBuilder.getCFG(scope.ast.body);
                    if(model.graph && model.graph.length){ // ensure CFG construction succeeds
                        // generate definitions for the function nodes on the entry `BlockStatement`
                        var generatedVarDef = new Set();
                        // console.log(model.graph[0], scope.ast.type)
                        let scopeEntryNode = model.graph[0]; // the entry `BlockStatement` node
                        let node = scope.ast;
                        if(node.params && node.params.length){
                            for(var i=0; i< node.params.length; i++){
                                var param = node.params[i];
                                if(param && param.name){
                                    var definedVar = scope.getVariable(param.name);
                                    if(!!definedVar){
                                        generatedVarDef.add(varDefFactory.create(definedVar, defFactory.createLiteralDef(scopeEntryNode, node.range)));
                                    }
                                }
                            }
                        }

                        if(!scopeEntryNode.generate){
                             scopeEntryNode.generate = generatedVarDef;
                        }else{
                             scopeEntryNode.generate = Set.union(scopeEntryNode.generate, generatedVarDef);
                        }
                    }

                } else {
                    // console.log('cfgBuilder:', model.graph);
                    model.graph = cfgBuilder.getCFG(scope.ast);
                }
            }catch(e){
                console.log(e);
                // PASS
                // CFG Generation Error.
                model.graph = null;
            }

    		if(model.graph){
    			setScopeOfGraphNodes(model.graph, scope);
            }

            model.addRelatedScope(scope);
            modelCtrl.addIntraProceduralModelToAPage(scopeTree, model);

		});
	});
};

/**
 * Connect the related model of caller and callee at the call-site
 * @param {Model} callerModel
 * @param {Model} calleeModel
 * @param {FlowNode} callSite
 * @returns {Model|null} Connected model or null
 * @memberof ModelBuilder.prototype
 * @private
 */
function connectCallerCalleeScopeRelatedModelsAtCallSite(callerModel, calleeModel, callSite) {
    "use strict";
	var callerRelatedModelGraph = callerModel.graph,
		calleeRelatedModelGraph = calleeModel.graph;
    var connectedGraph = [],
		connectedNodes = [],
		connectedModel = null;
    if (callerRelatedModelGraph && callerRelatedModelGraph.length > 0 && callerRelatedModelGraph[2].indexOf(callSite) !== -1 && FlowNode.isFlowNode(callSite)) {

        var nodesBeforeCall = callerRelatedModelGraph[2].slice(0, callerRelatedModelGraph[2].indexOf(callSite)+1),
            nodesAfterCall = callerRelatedModelGraph[2].slice(callerRelatedModelGraph[2].indexOf(callSite)+1),
            callReturnNode = factoryFlowNode.createCallReturnNode();

		callReturnNode.scope = callerModel.mainlyRelatedScope;

		/// set entry and exit nodes of connected graph
        connectedGraph.push(callerRelatedModelGraph[0]);
        connectedGraph.push(callerRelatedModelGraph[1]);

		/// let call-site to be type of CALL NODE
        callSite.type = FlowNode.CALL_NODE_TYPE;

		/// move def-use analysis artifacts at call-site to CALL RETURN NODE, expect for the USE set
        callReturnNode.generate = callSite.generate;
        callReturnNode.kill = callSite.kill;
		callSite.clearGENSet();
		callSite.clearKILLSet();

		/// set the line and column label of the CALL RETURN NODE to be same as call-site
		callReturnNode.line = callSite.line;
        callReturnNode.col = callSite.col;
        callReturnNode.scope = callSite.scope;

		/// disconnect call-site with its descending nodes, which to be connected with CALL RETURN NODE
        FlowNode.CONNECTION_TYPES.forEach(function (connection) {
            if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(connection) !== -1) {
                callSite[connection].forEach(function (node) {
                    callSite.disconnect(node);
                    callReturnNode.connect(node, connection);
                });
            } else {
                var node = callSite[connection];
                callSite.disconnect(node);
                callReturnNode.connect(node, connection);
            }
        });
        if(calleeRelatedModelGraph && calleeRelatedModelGraph.length > 0){
              callSite.connect(calleeRelatedModelGraph[0], FlowNode.CALL_CONNECTION_TYPE);
        }
      
        connectedNodes = connectedNodes.concat(nodesBeforeCall);

        if(calleeRelatedModelGraph && calleeRelatedModelGraph.length > 0){
            calleeRelatedModelGraph[1].connect(callReturnNode, FlowNode.RETURN_CONNECTION_TYPE);
            calleeRelatedModelGraph[2].forEach(function (node) {
                if (connectedNodes.indexOf(node) === -1) {
                    connectedNodes.push(node);
                }
            });
        }

        connectedNodes.push(callReturnNode);
        connectedNodes = connectedNodes.concat(nodesAfterCall);
        connectedGraph.push(connectedNodes);

		/// create the connected model
		connectedModel = factoryModel.create();
		connectedModel.addRelatedScope(callerModel.mainlyRelatedScope);
		callerModel.relatedScopes.forEach(function (scope) {
			connectedModel.addRelatedScope(scope);
		});
		calleeModel.relatedScopes.forEach(function (scope) {
			connectedModel.addRelatedScope(scope);
		});
		connectedModel.graph = connectedGraph;
    }
	return connectedModel;
}

/**
 * Find the definition of a named function from a ReachIn set in a scope
 * @param {Set} reachIns
 * @param {Scope} scope
 * @param {string}calleeName
 * @returns {Set}
 */
function findFunctionDefinitionFromReachInSet(reachIns, scope, calleeName, flag) {
    "use strict";
    var functionDef = new Set();
    reachIns.values().forEach(function (vardef) {

    	if(flag){
	        if (vardef.variable.name === calleeName && vardef.definition.type === Def.FUNCTION_TYPE) {
	            functionDef = vardef.definition;
	        }
    	}else{
	        if (vardef.variable === scope.getVariable(calleeName) && vardef.definition.type === Def.FUNCTION_TYPE) {
	            functionDef = vardef.definition;
	        }   		
    	}

    });
    return functionDef;
}

/**
 * Get inter-procedural model start from the scope related to the input model
 * @param {Scope} scope
 * @param {ScopeTree} scopeTree
 * @returns {Model}
 * @memberof ModelBuilder.prototype
 * @private
 */
function getInterProceduralModelStartFromTheScope(scope, scopeTree) {
    "use strict";
	var scopeModel = modelCtrl.getIntraProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, scope);
	var resultModel = null;
	var callSiteMapCalleeScope = new Map();
	if (!!scopeModel && scopeModel.graph) {
        for(let node of scopeModel.graph[2]){

        	//// handle setTimeout function calls;
            // this block of code addresses function argument to parameter binding for calls like setTimeout('functionName()', ms) c
        	if(node.astNode && node.astNode.type === 'AssignmentExpression' && node.astNode.right.type === 'CallExpression'){

            	var n = node.astNode.right;
            	var flag = false;
            	var fn_name = '';
                // setTimeout() or window.setTimeout()
            	if((n.callee && n.callee.type === 'Identifier' && n.callee.name === "setTimeout") || (n.callee && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier' && n.callee.object.name === "window" && n.callee.property.name == "setTimeout")){
            		var fn_call = n.arguments[0];
            		if(fn_call.type === 'Literal'){
        				fn_name = fn_call.value;
                        if(fn_name){
                            fn_name = '' + fn_name
            				fn_name = fn_name.replace(/;/g, ' ');   // make sure that the setTimeout only contain a function call, no more.
            				if(fn_name.includes(')') && !fn_name.includes(' ')){

            					fn_name = fn_name.substring(0, fn_name.indexOf('('))
            					flag = true;
            				}
                        }
            		}
            	}
                var reachIns = node.reachIns || new Set(),
                    calleeScope = null;

                var callee_name = (flag)?  fn_name : node.astNode.right.callee.name;
                var calleeDefinition = findFunctionDefinitionFromReachInSet(reachIns, node.scope, callee_name, flag);
                if (!!calleeDefinition) {
                    calleeScope = scopeTree.getScopeByRange(calleeDefinition.range);
                }
                if (!!calleeScope) {
                    callSiteMapCalleeScope.set(node, calleeScope);
                }

        	}
        	else if(node.astNode && node.astNode.type === 'VariableDeclaration' && node.astNode.declarations.length){

        		for(var i=0; i< node.astNode.declarations.length; i++){
        			var declaration = node.astNode.declarations[i];
        			if(declaration && declaration.type === 'VariableDeclarator' && declaration.init && declaration.init.type === 'CallExpression'){


		            	var n = declaration.init;
		            	var flag = false;
		            	var fn_name = '';
		            	if((n.callee && n.callee.type === 'Identifier' && n.callee.name === "setTimeout") || (n.callee && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier' && n.callee.object.name === "window" && n.callee.property.name == "setTimeout")){
		            		var fn_call = n.arguments[0];
		            		if(fn_call.type === 'Literal'){
		        				fn_name = fn_call.value;
                                if(fn_name){
                                    fn_name = '' + fn_name
    		        				fn_name = fn_name.replace(/;/g, ' ');   // make sure that the setTimeout only contain a function call, no more.
    		        				if(fn_name.includes(')') && !fn_name.includes(' ')){
    		        					fn_name = fn_name.substring(0, fn_name.indexOf('('))
    		        					flag = true;
    		        				}
                                }
		            		}
		            	}
		                var reachIns = node.reachIns || new Set(),
		                    calleeScope = null;

		                var callee_name = (flag)?  fn_name : declaration.init.callee.name;
		                var calleeDefinition = findFunctionDefinitionFromReachInSet(reachIns, node.scope, callee_name, flag);
		                if (!!calleeDefinition) {
		                    calleeScope = scopeTree.getScopeByRange(calleeDefinition.range);
		                }
		                if (!!calleeScope) {
		                    callSiteMapCalleeScope.set(node, calleeScope);
		                }	
        			}
        		}
        	}
            else if (!!node.astNode && node.astNode.type === 'CallExpression') {
                // console.log("INTER", escodegen.generate(node.astNode));
            	var n = node.astNode;
            	var function_name_flag = false;
            	var function_name = '';

                // setTimeout() or window.setTimeout()
            	if((n.callee && n.callee.type === 'Identifier' && n.callee.name === "setTimeout") || (n.callee && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier' && n.callee.object.name === "window" && n.callee.property.name == "setTimeout")){
            		let function_call_string_node = n.arguments[0];
            		if(function_call_string_node.type === 'Literal'){
   
                        let function_call_program_node = esprimaParser.parseAST(function_call_string_node.value);
                        let expr_stmt_node = function_call_program_node.body && function_call_program_node.body.length >0? function_call_program_node.body[0]: null;
                        if(expr_stmt_node && expr_stmt_node.expression && expr_stmt_node.expression.type === 'CallExpression'){
                            let call_expression = expr_stmt_node.expression;
                            function_name = call_expression.callee && call_expression.callee.type === 'Identifier'? call_expression.callee.name: escodegen.generate(call_expression.callee);
                            function_name_flag = true;
                        }
            		}
            	}
                // obj.call(optional_this_arg, arg1, arg2); OR obj.apply(optional_this_arg, list_args); 
                else if(n.callee.type === "MemberExpression" && n.callee.property.type === "Identifier" && (n.callee.property.name === 'call' || n.callee.property.name === 'apply' )){                    
                    function_name = escodegen.generate(n.callee.object);
                    function_name_flag = true;
                    
                }

                var reachIns = node.reachIns || new Set(),
                    calleeScope = null;

                var callee_name = (function_name_flag)?  function_name : node.astNode.callee.name;
                var calleeDefinition = findFunctionDefinitionFromReachInSet(reachIns, node.scope, callee_name, function_name_flag);
                if (!!calleeDefinition) {
                    calleeScope = scopeTree.getScopeByRange(calleeDefinition.range);
                }
                if (!!calleeScope) {
                    callSiteMapCalleeScope.set(node, calleeScope);
                }
            } /// end else-if the node is a call-site

        }; 
    } /// end for each node in the graph of scopeModel


	if (callSiteMapCalleeScope.size > 0) {
		callSiteMapCalleeScope.forEach(function (callee, callSite) {
			var connectedModel =
				modelCtrl.getInterProceduralModelByMainlyRelatedScopeFromAPageModels(scopeTree, callee) ||
				getInterProceduralModelStartFromTheScope(callee, scopeTree);
			resultModel = connectCallerCalleeScopeRelatedModelsAtCallSite(resultModel || scopeModel, connectedModel, callSite);
		});
	} else {
		resultModel = scopeModel;
	}
	if (!!resultModel && resultModel.relatedScopes.length > 1) {
		modelCtrl.addInterProceduralModelToAPage(scopeTree, resultModel);
	}
	return resultModel;
}

/**
 * Build inter-procedural models
 */
ModelBuilder.prototype.buildInterProceduralModels = function () {
    "use strict";

    for(let scopeTree of scopeCtrl.pageScopeTrees){
		var scopesToSearch = scopeTree.scopes, searchedScopes = new Set();
		for (var searchIndex = 0; searchIndex < scopesToSearch.length; ++searchIndex) {
            if (searchedScopes.has(scopesToSearch[searchIndex])) {
                continue;
            }
			var currentScope = scopesToSearch[searchIndex];
			var interProceduralModel = getInterProceduralModelStartFromTheScope(currentScope, scopeTree);
			if (interProceduralModel.relatedScopes.length > 1) {
                var relatedScopes = [].concat(interProceduralModel.relatedScopes);
                while (relatedScopes.length > 0) {
                    searchedScopes.add(relatedScopes.pop());
                }
			}
		}
	};
};

/**
 * Connect the LOOP NODE and the related model graph of a page
 * @param {Model} modelForPage
 * @returns {Model}
 * @memberof ModelBuilder.prototype
 * @private
 */
function connectLoopNodeToPageGraph(modelForPage) {
	"use strict";
	var loopNode = factoryFlowNode.createLoopNode();
	loopNode.scope = modelForPage.mainlyRelatedScope;
	var exitNode = modelForPage.graph[1];
	var previousNodes = [].concat(exitNode.prev);
	previousNodes.forEach(function (node) {
		if (node.normal === exitNode) {
			node.connect(loopNode);
		} else if (node.exception === exitNode) {
			node.connect(loopNode, FlowNode.EXCEPTION_CONNECTION_TYPE);
		} else if (node.true === exitNode) {
			node.connect(loopNode, FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
		} else if (node.false === exitNode) {
			node.connect(loopNode, FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
		}
		node.disconnect(exitNode);
	});
	loopNode.connect(exitNode);
	var nodes = [].concat(modelForPage.graph[2]);
	nodes.splice(nodes.indexOf(exitNode), 0, loopNode);
	return [modelForPage.graph[0], exitNode, nodes];
}

/**
 * Connect pageModel to each model in the eventHandlerModels array with LOOP NODE and LOOP RETURN NODE
 * @param {Model} pageModel
 * @param {Array} eventHandlerModels
 * @returns {Model}
 */
function connectPageAndEventHandlers(pageModel, eventHandlerModels) {
    "use strict";
	var pageModelGraph = connectLoopNodeToPageGraph(pageModel);
	var pageLoopNode = pageModelGraph[1].prev[0];
	var loopReturnNode = factoryFlowNode.createLoopReturnNode();
	loopReturnNode.scope = pageModel.mainlyRelatedScope;
	var resultGraphNodes = [].concat(pageModelGraph[2]);
    loopReturnNode.connect(pageLoopNode, FlowNode.RETURN_CONNECTION_TYPE);
    if (eventHandlerModels.length > 0 ) {
        eventHandlerModels.forEach(function (model, index) {
            pageLoopNode.connect(model.graph[0], FlowNode.ON_EVENT_CONNECTION_TYPE);
            model.graph[1].connect(loopReturnNode);
            resultGraphNodes = resultGraphNodes.concat(model.graph[2]);
            if (index === 0) {
                resultGraphNodes.push(loopReturnNode);
            }
        });
    } else {
        pageLoopNode.connect(loopReturnNode, FlowNode.ON_EVENT_CONNECTION_TYPE);
        resultGraphNodes.push(loopReturnNode);
    }
	var resultModel = factoryModel.create();
	resultModel.graph = [pageModelGraph[0], pageModelGraph[1], resultGraphNodes];
	resultModel.addRelatedScope(pageModel.mainlyRelatedScope);
	pageModel.relatedScopes.forEach(function (scope) {
		resultModel.addRelatedScope(scope);
	});
    return resultModel;
}

/**
 * Find scope of an event handler at the node
 * @param {FlowNode} graphNode
 * @param {ScopeTree} scopeTree
 * @returns {null|Scope}
 */
function getRegisteredEventHandlerCallback(graphNode, scopeTree) {
	"use strict";
	var foundHandlerScope = null;
	if (graphNode.astNode.callee.type === 'MemberExpression' && graphNode.astNode.callee.property.name === 'addEventListener') {
		walkes(graphNode.astNode["arguments"][1], {
			FunctionDeclaration: function () {},
			Identifier: function (node) {
				var handler = graphNode.scope.getVariable(node.name);
				graphNode.reachIns.some(function (vardef) {
					if (vardef.variable === handler && vardef.definition.type === Def.FUNCTION_TYPE) {
						foundHandlerScope = scopeTree.getScopeByRange(vardef.definition.range) || null;
					}
					if (!!foundHandlerScope) {
						return true;
					}
				});
			},
			FunctionExpression: function (node) {
				foundHandlerScope = scopeTree.getScopeByRange(node.range) || null;
			}
		});
	}
	return foundHandlerScope;
}

/**
 * Find models mainly related to event handlers from a model
 * @param {Model} model
 * @param {ScopeTree} scopeTree
 * @returns {Array} Models of event handlers
 */
function findEventHandlerModelsFromAModel(model, scopeTree) {
	"use strict";
	var modelGraph = model.graph;
	var eventHandlers = [];
	modelGraph[2].forEach(function (graphNode) {
		if (!!graphNode.astNode && graphNode.astNode.type === 'CallExpression') {
            var handlerScope = getRegisteredEventHandlerCallback(graphNode, scopeTree);
            var handlerModel = null;
            if (!!handlerScope) {
                handlerModel = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, handlerScope);
            }
            if (!!handlerModel && eventHandlers.indexOf(handlerModel) === -1) {
                eventHandlers.push(handlerModel);
               
                // console.log(graphNode.astNode); // dispatch edge from here
                // console.log(handlerScope.ast); // to here
            }
        }
	});
	return eventHandlers;
}

/**
 * Build intra-page model
 */
ModelBuilder.prototype.buildIntraPageModel = function () {
    "use strict";
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {

		var modelForPage = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root);
		var searchingEventHandlerModels = [];
		var eventHandlerModels = [];
		var intraPageModel = null;
		if (!!modelForPage) {
			searchingEventHandlerModels.push(modelForPage);
			for (var index = 0; index < searchingEventHandlerModels.length; ++index) {
				var searchingModel = searchingEventHandlerModels[index];
				var foundEventHandlerModels = findEventHandlerModelsFromAModel(searchingModel, scopeTree);
				eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
				searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
			}
			intraPageModel = connectPageAndEventHandlers(modelForPage, eventHandlerModels);
        // end    

		}
        modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);
	});
};

/**
 * Get graph nodes from a model where defining the local storage object
 * @param {Model} model
 * @returns {Array}
 */
function getNodesWhereDefiningLocalStorageObject(model) {
	"use strict";
	var foundNodes = [];
	var modelGraph = model.graph;
	modelGraph[2].forEach(function (graphNode) {
		walkes(graphNode.astNode, {
            Program: function () {},
			FunctionExpression: function () {},
			FunctionDeclaration: function () {},
			AssignmentExpression: function (node) {
				if (node.left.type === 'MemberExpression' &&
					graphNode.scope.getScopeWhereTheVariableDeclared(node.left.object.name) === scopeCtrl.domainScope) {
					foundNodes.push(graphNode);
				}
			}
		});
	});
	return foundNodes;
}

/**
 * Connect the graph of domain scope to graphs of each page
 * @param {Array} modelOfPages
 * @returns {Array} Node of connected graph
 */
function connectDomainScopeGraphToModelOfPages(modelOfPages) {
	"use strict";
	var domainScope = scopeCtrl.domainScope;
	var domainScopeGraph = cfgBuilder.getDomainScopeGraph();
	domainScopeGraph[0].scope = domainScope;
	var nodes = [].concat(domainScopeGraph[2]);
	modelOfPages.forEach(function (model) {
		var modelGraph = model.graph;
		domainScopeGraph[0].connect(modelGraph[0], FlowNode.LOAD_STROAGE_CONNECTION_TYPE);
		var definingNode = getNodesWhereDefiningLocalStorageObject(model);
		definingNode.forEach(function (defineNode) {
			defineNode.connect(domainScopeGraph[0], FlowNode.SAVE_STORAGE_CONNECTION_TYPE);
		});
        nodes = nodes.concat(model.graph[2]);
	});
	return [domainScopeGraph[0], domainScopeGraph[1], nodes];
}

/**
 * Build the inter-page model
 */
ModelBuilder.prototype.buildInterPageModel = function () {
    "use strict";
	var modelOfPages = [];
	scopeCtrl.pageScopeTrees.forEach(function (scopeTree) {
		var intraPageModel = modelCtrl.getIntraPageModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root);
		if (!!intraPageModel) {
			modelOfPages.push(intraPageModel);
		}
	});
	var connectedGraph = connectDomainScopeGraphToModelOfPages(modelOfPages);
	var interPageModel = factoryModel.create();
	interPageModel.graph = connectedGraph;
	interPageModel.addRelatedScope(scopeCtrl.domainScope);
	modelOfPages.forEach(function (model) {
		model.relatedScopes.forEach(function (scope) {
			interPageModel.addRelatedScope(scope);
		});
	});
	modelCtrl.interPageModel = interPageModel;
};

var builder = new ModelBuilder();
module.exports = builder;