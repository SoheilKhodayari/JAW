
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
    Main Program for Building the Property Graph CSV files
*/


 /*
 * Create output files and directories
 */

var scopeCtrl = require('./scope/scopectrl'),
    modelCtrl = require('./model/modelctrl'),
    Def = require('./def-use/def'),
    walkes = require('walkes');
var esprimaParser = require('./parser/jsparser');
var escodegen = require('escodegen');  // API: escodegen.generate(node);


var constantsModule = require('./constants.js');
var flowNodeFactory = require('./../esgraph/flownodefactory');


 /*
 * Flag to show console messages indicating
 * the different stages of the static analyis
 */
const DEBUG = false;

/**
 * GraphBuilder
 * @constructor
 */
function GraphBuilder() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
    };
    /* end-test-block */
}


/**
 * stores the function map for Call Graph
 */
var functionMap = {};

/**
 * stores the event registrations so that a event dispatched be mapped to it
 * entry format: event_key -> [listener_node_1, ..., listener_node_n]
 */
var eventRegistrationStatements= {};


/**
 * adds functions in variable-length dictionaries to function map for Call Graph
 */
var findCallGraphObjectExpressionFunctions = function(props, current_path){

    for(var pindex=0; pindex<props.length; pindex++){
        var current_prop = props[pindex];
        if(current_prop.value && current_prop.value.type === 'FunctionExpression'){
            
            var key = (current_path === '')? current_prop.key.name : current_path + '.' + current_prop.key.name;
            functionMap[key] = getCallGraphFieldsForASTNode(current_prop.value);

        }else if(current_prop.value && current_prop.value.type === 'ObjectExpression'){
            if(current_path === ''){
                current_path =  current_prop.key.name;
            }else {
                current_path = current_path + '.' + current_prop.key.name;
            }
            findCallGraphObjectExpressionFunctions(current_prop.value.properties, current_path);
        }else{
            // remove the last property when continuing to another branch of dictionary
            // ONLY if already visited a branch
            if(pindex>0 && current_path.indexOf('.') > 0){
                var end = current_path.lastIndexOf('.');
                current_path = current_path.substring(0, end);
            }
            continue;
        }
    }
}

/**
 * returns the MemberExpression Node in the 'code' string format
 */
var getMemberExpressionAsString = function(memberExpressionNode){

    // var key = memberExpressionNode.property.name;
    // var n = memberExpressionNode.object;
    // if(n && n.type === 'Identifier'){
    //      key = n.name + '.'+ key;
    // }
    // while(n && n.type === 'MemberExpression'){
    //     key = n.property.name + '.'+ key;
    //     n = n.object; // loop
    //     if(n.type === 'Identifier'){
    //         key = n.name + '.'+ key;
    //         break;
    //     }
    // }

    // USE escodegen instead?
    var key = escodegen.generate(memberExpressionNode)  
    return key;                       
}

var getCallGraphFieldsForASTNode = function(node){
    var n = { _id: node._id }
    return n;
}
/**
 * considers the case where partialActualName is part of a key in the functionMap
 * this will then create an alias entry for such key pairs with the PartialAliasName replaced
 */
var checkFunctionMapForPartialAliasing = function(pairs){
    for(var i=0; i< pairs.length; i++){
        var partialActualName = pairs[i][0];
        var partialAliasName = pairs[i][1];
        for(var functionName in functionMap){
            if(functionName.includes(partialActualName)){

                // @note: the RegExp is too slow when the number of iterations is a lot
                // Instead, we can just use the .replace() function for more speed!

                // var pattern = new RegExp(partialActualName, "g");
                // var newName = functionName.replace(pattern, partialAliasName);

                var newName = functionName.replace(partialActualName, partialAliasName);
                functionMap[newName] = functionMap[functionName]         
            }
        }
    }
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
                if(graphNode.reachIns){

                    graphNode.reachIns.some(function (vardef) {
                        if (vardef.variable === handler && vardef.definition.type === Def.FUNCTION_TYPE) {
                            foundHandlerScope = scopeTree.getScopeByRange(vardef.definition.range) || null;
                        }
                        if (!!foundHandlerScope) {
                            return true;
                        }
                    });

                }

            },
            FunctionExpression: function (node) {
                foundHandlerScope = scopeTree.getScopeByRange(node.range) || null;
            }
        });
    }
    return foundHandlerScope;
}


/**
 * Gets the VariableDeclaration value in the init part whose id.name is equal to varid 
 * @param {AstNode} varDeclaration
 * @param {string} varid: variable name
 * @returns the value of the variable with the given varid name
 */
function getVariableDeclarationValue(varDeclaration, varid){
    if(varDeclaration.declarations && varDeclaration.declarations.length){
        for(let i=0; i< varDeclaration.declarations.length; i++){
            let declaration = varDeclaration.declarations[i]
            if(declaration.id && declaration.id.name === varid){
                if(declaration.init){
                    return declaration.init.value;
                }else{
                    return null;
                }
            }
        }    
    }
    return null;
}

/**
 * Gets the name of an event at the registration site
 * @param {FlowNode} graphNode: CFG node
 * @param {ScopeTree} scopeTree
 * @returns event name value
 */
function getEventNameAtRegistrationSite(graphNode, scopeTree) {
    "use strict";
    var foundValue = null;
    walkes(graphNode.astNode["arguments"][0], {
        // FunctionDeclaration: function () {},
        Identifier: function (node) {
            var event_variable_to_resolve = graphNode.scope.getVariable(node.name);
            if(graphNode.reachIns){

                graphNode.reachIns.some(function (vardef) {
                    if (vardef.variable === event_variable_to_resolve && vardef.definition.type === Def.LITERAL_TYPE) {
                        let varDeclaration = vardef.definition.fromNode.astNode; // top level
                        foundValue = getVariableDeclarationValue(varDeclaration, event_variable_to_resolve.name) || null;
                    }
                    if (!!foundValue) {
                        return true;
                    }
                });
            }

        },
        // FunctionExpression: function (node) {
        //     foundValue = scopeTree.getScopeByRange(node.range) || null;
        // }
    });
    return foundValue;
}

/**
 * Creates dependency edges for an event handler function
 * @param {AstNode} eventHandler
 * @param {String} eventName
 * @param {String} args
 * @returns the list of dependency edges
 */
function createEventDependencyEdges(eventHandler, eventName, args){
    var edges = [];
    if(eventHandler && (eventHandler.type === 'FunctionDeclaration' || eventHandler.type === 'FunctionExpression')){
        var body = eventHandler.body.body; // get the BlockStatement body
        for(var j=0; j< body.length; j++){
            var cfgLevelNode = body[j];  // each statement of the handler
            edges.push({
                fromId: eventHandler._id, 
                toId: cfgLevelNode._id,
                relationLabel: "ERDDG_Dependency",
                relationType: eventName,
                args: args
            });         
        }
    }
    return edges;
}


GraphBuilder.prototype.getInterProceduralModelNodesAndEdges = async function(semantic_types, options){


    "use strict";
    var theGraphBuilder = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;

    // Add CFG "exit" nodes. 
    // TODO: check if really needed as the exit can be implicity inferred from the ast too
    var exitNodes = flowNodeFactory.generatedExits;
    
    // global nodes/edges to return
    var g_nodes = exitNodes;
    var g_edges = [];


    function appendNode(node){
        g_nodes.push(node);
    }
    function appendEdge(edge){
        g_edges.push(edge);
    }

    // IPCG
    var call_graph_alias_check = [];

    await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {

        var pageModels = modelCtrl.getPageModels(scopeTree);

        var intraProceduralModels = pageModels.intraProceduralModels;

        const mainAST = scopeTree.scopes[0].ast;

        /**
         * Call Graph (CG) Generation
         * Step 1: Function Map Generation + Identification of Function Alias Names
         */
        if(options.ipcg){

            DEBUG && console.log("starting IPCG functionMap generation.")
            walkes(mainAST, {

                FunctionDeclaration: function(node, recurse){
                    // CASE 1: function f(){}
                    if(node.id && node.id.name) {
                        functionMap[node.id.name] = getCallGraphFieldsForASTNode(node);
                        // CASE 5.1: handle the case where the function returns a object-expression (key,value) with values being the functions
                        if(node.body && node.body.type === 'BlockStatement'){
                            var body = node.body.body;
                            for(var q=0; q<body.length; q++){
                                var expr = body[q];
                                if(expr && expr.type === 'ReturnStatement' && expr.argument && expr.argument.type === 'ObjectExpression'){
                                    var props = expr.argument.properties;
                                    findCallGraphObjectExpressionFunctions(props, '' + node.id.name + '(...)'); // TODO: handle better this case
                                }
                            }
                        } // END CASE 5.1
                    }
                    walkes.checkProps(node, recurse);
                },
                VariableDeclaration: function(node, recurse){
                    // CASE 2: var/let/const f = function(){}
                    if(node.declarations && node.declarations.length){
                        for(var z=0; z<node.declarations.length; z++){
                            var variableDeclarator = node.declarations[z];
                            if(variableDeclarator && variableDeclarator.type === 'VariableDeclarator' &&
                            variableDeclarator.id && variableDeclarator.id.name && variableDeclarator.init){
                                
                                if(variableDeclarator.init.type === 'FunctionExpression'){
                                    functionMap[variableDeclarator.id.name] = getCallGraphFieldsForASTNode(variableDeclarator.init); 
                                } // CASE 5.2 var/let/const dict = { k1: { f1: function(){} } }
                                else if(variableDeclarator.init.type == 'ObjectExpression' && variableDeclarator.init.properties && variableDeclarator.init.properties.length){
                                    var props = variableDeclarator.init.properties;
                                    findCallGraphObjectExpressionFunctions(props, variableDeclarator.id.name);

                                } // END CASE 5.2      
                            }
                        } 
                    }
                    walkes.checkProps(node, recurse);
                },
                AssignmentExpression: function(node, recurse){

                    // CASE 4: obj.f = function(){} or f = function(){}
                    if(node.right && node.right.type === 'FunctionExpression'){
                        if(node.left){
                            if(node.left.type === 'Identifier'){
                                functionMap[node.left.name] = getCallGraphFieldsForASTNode(node.right);
                            }
                            else if(node.left.type === 'MemberExpression' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name){
                                // var key = node.left.property.name;
                                // var n = node.left.object;
                                // if(n && n.type == 'Identifier'){
                                //     key = n.name + '.' + key;
                                // }
                                // while(n && n.type === 'MemberExpression'){
                                //     key = n.property.name + '.'+ key;
                                //     n = n.object; // loop
                                //     if(n.type === 'Identifier'){
                                //         key = n.name + '.'+ key;
                                //         break;
                                //     }
                                // }
                                var key = escodegen.generate(node.left);
                                functionMap[key] = getCallGraphFieldsForASTNode(node.right);
                            }
                        }
                    }
                    // CASE 5. obj1.obj2.dict={ k1: { f1: function(){} } } or dict={ k1: { f1: function(){} } }
                    else if(node.right && node.right.type === 'ObjectExpression'){
                        if(node.left && node.right && node.right.properties){
                            if(node.left.type === 'Identifier'){
                                var props = node.right.properties;
                                findCallGraphObjectExpressionFunctions(props, node.left.name);
                            }
                            else if(node.left.type === 'MemberExpression' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name){
                                
                                var key = getMemberExpressionAsString(node.left);
                                var props = node.right.properties;
                                findCallGraphObjectExpressionFunctions(props, key);
                            }
                        }
                    }
                    // Add function aliases to function Map
                    // ALIAS CASE 2: obj1.obj2.alias = func;  or obj1.obj2.alias = a.b.func;
                    else if(node.left && node.left.type === 'MemberExpression' && node.right){
                        if(node.right.type === 'Identifier'){
                            
                            var function_actual_name = node.right.name;
                            var function_alias_name = getMemberExpressionAsString(node.left)
                            
                            if(functionMap &&  functionMap.hasOwnProperty(function_actual_name) && !functionMap.hasOwnProperty(function_alias_name)){
                                functionMap[function_alias_name] = functionMap[function_actual_name];
                            }else{
                                // consider the case where function_actual_name is part of a key in function map
                                // now node.right.name is aliased with the function_alias_name MemberExpression
                                // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name)
                                call_graph_alias_check.push([function_actual_name, function_alias_name]);
                            }
                        }else if(node.right.type === 'MemberExpression'){

                            var function_actual_name = getMemberExpressionAsString(node.right);
                            var function_alias_name = getMemberExpressionAsString(node.left);   

                            if(functionMap && functionMap.hasOwnProperty(function_actual_name) && !functionMap.hasOwnProperty(function_alias_name)){
                                functionMap[function_alias_name] = functionMap[function_actual_name];
                            }else{
                                // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                                call_graph_alias_check.push([function_actual_name, function_alias_name]);
                            } 
                        }
                    }
                    walkes.checkProps(node, recurse);
                },
                // Add function aliases to function Map
                // ALIAS CASE 1: var a = f1; or var a = obj1.f1;
                variableDeclarator: function(node, recurse){

                    if(node && node.id && node.id.name && node.init){
                        var function_alias_name = node.id.name;
                        if(node.init.type === 'Identifier'){
                            var function_actual_name = node.init.name;
                            if(functionMap && functionMap.hasOwnProperty(function_actual_name) && !functionMap.hasOwnProperty(function_alias_name)){
                                functionMap[function_alias_name] = functionMap[function_actual_name];
                            }else{
                                // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name)
                                call_graph_alias_check.push([function_actual_name, function_alias_name]);
                            }
                        }else if(node.init.type === 'MemberExpression'){

                            var function_actual_name = getMemberExpressionAsString(node.init);
                            if(functionMap && functionMap.hasOwnProperty(function_actual_name) && !functionMap.hasOwnProperty(function_alias_name)){
                                functionMap[function_alias_name] = functionMap[function_actual_name];
                            }else{
                                // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                                call_graph_alias_check.push([function_actual_name, function_alias_name]);
                            }
                        }
                    }
                    walkes.checkProps(node, recurse);
                },

            }); // END walkes for Call Graph 
        }
        DEBUG && console.log("finished IPCG functionMap generation.")


        // traverse once only for the whole global scope, rather than each function scope in the AST
        DEBUG && console.log("starting AST unrolling")
        /**
         *  Abstract Syntax Tree (AST)
         *  for each Scope
         *  main Scope has the full AST
         *  (subgoal) find initial function declarations 
         */

        var astRels = [];
        var astNodes = [];
        var preNod = null;

        esprimaParser.traverseAST(mainAST, function(node){
            if(node && node._id){
                
                // @Warning: this check is unneccessary since we iterate only once over the main AST
                // Note that it takes a long time for files larger than 1M LoC to do such a check.
                // if(!astNodes.some(e => e._id == node._id)){   

                    // store new nodes
                    astNodes.push(node);

                // }
            }
            if(preNod){
                Object.keys(preNod).forEach((property) => {
                    let n = preNod[property];
                    if(Array.isArray(n)){
                        for(let j=0; j< n.length; j++){
                            let item = n[j];
                            if(item && item._id) {
                                var record = {'fromId': preNod._id, 'toId': item._id, 'relationLabel': "AST_parentOf", 'relationType': property, 'args': {"arg":j} };
                                astRels.push(record);
                            }
                        }
                    }
                    else if(n && n._id){
                        var record = { 'fromId': preNod._id, 
                                        'toId': n._id, 
                                        'relationLabel': "AST_parentOf", 
                                        'relationType': property, 
                                        'args': {"kwarg": n.name? n.name: n.value} 
                                    };
                        astRels.push(record);
                    }
                });
            }
            preNod = node;

        }); // END esprimaParser.traverseAST
    
        /**
         *  Export AST nodes & rels
         */

        for(var w = 0; w< astNodes.length; w++){
            appendNode(astNodes[w]);
        }
        for(var w = 0; w< astRels.length; w++){
            appendEdge(astRels[w]);
        }
        DEBUG && console.log("finished AST unrolling");
        


        DEBUG && console.log("started CFG/PDG unrolling");
        // await ?
        intraProceduralModels.forEach(async function (model, modelIndex) {
            
            /**
             *  Control Flow Graph (CFG)
             *  for each intra-procedural AST scope
             */

             
            var cfg = model.graph;
            if(cfg){  /* if no errors */

                false && DEBUG && console.log("CFG unrolling started");

                var dpairs = model.dupairs;

                let allCFGNodes = cfg[2];
                for(let index in allCFGNodes){
                   let cfgNode = allCFGNodes[index];
                   let normal_flow = false;
                   if(cfgNode.true){
                       normal_flow = true;
                       let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.true.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_True",
                            args: cfgNode.true.type
                       };
                       appendEdge(record);

                   } if(cfgNode.false){
                        normal_flow = true;
                        let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.false.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_False",
                            args: cfgNode.false.type
                       };
                        appendEdge(record);
                   }
                    if(cfgNode.normal) {
                       /* normal flow */
                        normal_flow = true;
                       if(cfgNode.normal){
                            let record = {
                               fromId: cfgNode.uniqueId,
                               toId: cfgNode.normal.uniqueId,
                               relationLabel: "CFG_parentOf",
                               relationType: "Epsilon",
                               args: cfgNode.normal.type
                           };
                           appendEdge(record);
                       }
                   }
                    else if(cfgNode.exception && !normal_flow){
                        /* only if no normal flow exists*/
                        let record = {
                             fromId: cfgNode.uniqueId,
                             toId: cfgNode.exception.uniqueId,
                             relationLabel: "CFG_parentOf",
                             relationType: "Exit",
                             args: cfgNode.exception.type // can be entry, exit or normal
                        };
                        appendEdge(record);
                    }
                }
                false && DEBUG && console.log("CFG unrolling finished");

                /**
                 *  Program Dependence Graph (PDG)
                 *  Def-Use Analysis for each intra-procedural AST scope
                 */
                false && DEBUG && console.log("PDG unrolling started");
                dpairs.forEach(async (pairs, key)=> {
                    await pairs.forEach(async (pair)=> {


                        if(pair.first.uniqueId != 1) { /* remove DUPairs from Program Node */
                            if(pair.first.uniqueId && pair.second.uniqueId){ 
                            
                                // @CASE 1
                                // pair.first  FlowNode obj
                                // pair.second FlowNode obj
                                // pair.first ------ (Data_key) ----> pair.second
                                let record = {
                                    fromId: pair.first.uniqueId,
                                    toId: pair.second.uniqueId,
                                    relationLabel: "PDG_parentOf",
                                    relationType: "DataFlow",
                                    args: key.toString()
                                };
                                appendEdge(record);               
                            }
                            else{
                                // CASE 2
                                // pair.first FlowNode obj
                                // pair.second [ifstmt, block, condition_str]
                                let record = {
                                    fromId: pair.first.uniqueId,
                                    toId: pair.second[0]._id,
                                    relationLabel: "PDG_parentOf",
                                    relationType: "DataFlow",
                                    args: key.toString()
                                };
                                appendEdge(record);     
                                if(pair.second[1] && pair.second[1]._id){
                                    // CASE 3: for PDG control edges, if consequent of ifstmt is not null
                                    let recordConsequent= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'true', // predicate condition: true for ifStatement.consequent
                                        args: key.toString()
                                    };
                                    appendEdge(recordConsequent);   
                                }
                                if(pair.second[2] && pair.second[2]._id){
                                    // CASE 4: for PDG control edges, if alternate of ifstmt is not null
                                    let recordAlternate= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'false', // predicate condition: false for ifStatement.alternate
                                        args: key.toString()
                                    };
                                    appendEdge(recordAlternate);   

                                }
                            }
                        } // end top-if

                    })
                });
                false && DEBUG && console.log("PDG unrolling finished");
            } // end if cfg

        });  /* END intraProceduralModels.forEach */
        DEBUG && console.log("end CFG/PDG unrolling");


        /**
         *  1- Event Registration & Dispatch Graph (EDG)
         *  Figure out which ast nodes register an event &
         *             which ast nodes trigger an event
         *  Denotes a scope change!
         *
         **
         *
         * 2- Call Graph (CG)
         * Step 2: Connect CallExpression to Function Map
         *
         */
        
        if(options.erddg || options.ipcg) {

            if (options.ipcg){
                
                DEBUG && console.log("started IPCG checks for alias functions");
                /*
                * The call `checkFunctionMapForPartialAliasing` is meant to:
                *  - Check function name aliasing: create entries in the functionMap for alias names
                *  - Handle the cases where a function verbatim or alias call site is before the position of the function definition in the code (i.e., hoisting function variable names)
                */
                // await checkFunctionMapForPartialAliasing(call_graph_alias_check);
                DEBUG && console.log("finished IPCG checks for alias functions");
            }
        
            if (options.erddg) {
                /**
                 * ERDDG Edges
                 */
                DEBUG && console.log("started ERDDG edge construction");
                var modelForPage = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, scopeTree.root);
                var searchingEventHandlerModels = [];
                var eventHandlerModels = [];
                var intraPageModel = null;
                if (!!modelForPage) {
                    searchingEventHandlerModels.push(modelForPage);
                    for (var index = 0; index < searchingEventHandlerModels.length; ++index) {
                        var searchingModel = searchingEventHandlerModels[index];
                        var modelGraph = searchingModel.graph;
                        var foundEventHandlerModels = [];
                        modelGraph[2].forEach(function (graphNode) {
                            if (!!graphNode.astNode && graphNode.astNode.type === 'CallExpression') {
                                var handlerScope = getRegisteredEventHandlerCallback(graphNode, scopeTree);
                                var handlerModel = null;
                                if (!!handlerScope) {
                                    handlerModel = modelCtrl.getModelByMainlyRelatedScopeFromAPageModels(scopeTree, handlerScope);
                                }
                                if (!!handlerModel && foundEventHandlerModels.indexOf(handlerModel) === -1) {
                                    foundEventHandlerModels.push(handlerModel);
                                    /*
                                    @DEBUG HELP
                                    console.log(graphNode.astNode); // registration edge from here
                                    console.log(handlerScope.ast); // to here
                                    */
                                    var eventName=''
                                    var eventNameAstNode = (graphNode.astNode.arguments && graphNode.astNode.arguments.length>= 2)? graphNode.astNode.arguments[0]: null;
                                    if(eventNameAstNode){
                                        if(eventNameAstNode.type === 'Literal'){
                                            eventName = eventNameAstNode.value;
                                        }
                                        else if(eventNameAstNode.type === 'Identifier'){
                                            eventName = getEventNameAtRegistrationSite(graphNode, scopeTree);
                                        }
                                    }
                                    var eventName= (eventName===null)? '': eventName;
                                    let calleeVariable = graphNode.astNode.callee.object.name; // identifier name
                                    let calleeVariableId = graphNode.astNode.callee.object._id;


                                    // begin: store this event registration for mapping to dispatches
                                    var eventRegistrationKey = calleeVariable + '___' + eventName;
                                    if(eventRegistrationKey in eventRegistrationStatements){
                                        eventRegistrationStatements[eventRegistrationKey].push(graphNode.astNode);
                                    }else{
                                        eventRegistrationStatements[eventRegistrationKey] = [graphNode.astNode];
                                    }
                                    // end: store this event registration for mapping to dispatches

                                    let record = {
                                        fromId: graphNode.astNode._id, // event registration site, call expression
                                        toId: handlerScope.ast._id, // event handler function
                                        relationLabel: "ERDDG_Registration",
                                        relationType: eventName,
                                        args: 'register_listener_on___' + calleeVariable+ '___' + calleeVariableId
                                    };
                                    appendEdge(record);

                                    /* add the respective ERDDG dependency Edges */
                                    var dependencyEdges = createEventDependencyEdges(handlerScope.ast, eventName, record.args);
                                    dependencyEdges.forEach((record)=> {
                                        appendEdge(record);
                                    });

                                }
                            }
                        });
                        eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
                        searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
                    }
                }
                modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);
                DEBUG && console.log("finished ERDDG edge construction");
            } // END options.erddg

            DEBUG && console.log("started ERDDG node and IPCG edge unrolling");
            walkes(mainAST, {
                /**
                 * ERDDG Nodes
                 */
                ExpressionStatement: function(node, recurse){
                    if(options.erddg){
                        if(node && node.expression && node.expression.type === "AssignmentExpression" &&
                            node.expression.left.type === "MemberExpression" &&
                            node.expression.left.object &&
                            node.expression.left.property && 
                            node.expression.left.property.name && node.expression.left.property.name.startsWith('on')){
                            var onEvent = node.expression.left.property.name;
                            var eventName = onEvent.substring(2, onEvent.length);
                            var calleeVariable = node.expression.left.object.name;
                            var calleeVariableId = (node.expression.left.object)? node.expression.left.object._id: 'xx';
                            if(node.expression.right && node.expression.right.type == "FunctionExpression"){
                                var eventHandlerNode = node.expression.right;
                                appendNode({
                                     fromId: ''+ node._id,
                                     toId: ''+ eventHandlerNode._id,
                                     fromNode: node,
                                     toNode: eventHandlerNode,
                                     relationLabel: "ERDDG_Registration",
                                     relationType: eventName,
                                     args: 'register_listener_on___' + calleeVariable+ '___' + calleeVariableId  /* e.g., window.onerror = function(e){...} */
                                });  
                            }
                        } 

                        else if(node && node.expression && node.expression.type === "CallExpression" &&
                            node.expression.callee && node.expression.callee.type === "MemberExpression" &&
                            node.expression.callee.property.name === "dispatchEvent"){

                            var calleeVariable =  node.expression.callee.object.name;
                            var calleeVariableId = (node.expression.callee.object)? node.expression.callee.object._id: 'xx';
                            var eventName = (node.expression.arguments[0].value)?(node.expression.arguments[0].value): ("resolve__" + node.expression.arguments[0].name);
                            
                            // begin: add dispatch edge
                            var eventRegistrationKey = calleeVariable + '___' + eventName;
                            if(eventRegistrationKey in eventRegistrationStatements){
                                var registered_handlers_list = eventRegistrationStatements[eventRegistrationKey];
                                registered_handlers_list.forEach(handler_node => {
                                    appendNode({
                                         fromId: ''+ node._id,
                                         toId: ''+ handler_node._id,
                                         fromNode: node,
                                         toNode: handler_node,
                                         relationLabel: "ERDDG_Dispatch",
                                         relationType: eventName,
                                         args: 'dispatch_event_on___' + calleeVariable+ '___' + calleeVariableId  /* e.g., button.dispatchEvent('click') */
                                    });

                                });
                            }
                            else{
                                
                                /** 
                                * check a different entry key at eventRegistrationStatements. 
                                * in case the eventName was only unresolved, connect the dispatch site
                                * to all potential registraion sites 
                                */
                                Object.keys(eventRegistrationStatements).forEach(function(key){
                                    
                                    if(key.startsWith(calleeVariable)){
                                        var registered_handlers_list = eventRegistrationStatements[key];
                                        registered_handlers_list.forEach(handler_node => {
                                            appendNode({
                                                 fromId: ''+ node._id,
                                                 toId: ''+ handler_node._id,
                                                 fromNode: node,
                                                 toNode: handler_node,
                                                 relationLabel: "ERDDG_Dispatch",
                                                 relationType: eventName,
                                                 args: 'dispatch_event_on___' + calleeVariable+ '___' + calleeVariableId  /* e.g., button.dispatchEvent('click') */
                                            });

                                        })
                                    }// end if key.startsWith;
                                }); // end loop Object.keys();

                            } // end: add dispatch edge

                        }
                        else if(node && node.expression && node.expression.type === "CallExpression" &&
                            node.expression.callee && node.expression.callee.type === "MemberExpression" &&
                                (
                                constantsModule.EVENT_FUNCTION_NAMES.some(eventFunction=> eventFunction === node.expression.callee.property.name) || 
                                constantsModule.eventExists(node.expression.callee.property.name)
                                )
                            ){

                            var calleeVariable =  node.expression.callee.object.name;
                            var calleeVariableId = (node.expression.callee.object)? node.expression.callee.object._id: 'xx';
                            var eventName = node.expression.callee.property.name;

                            // begin: add dispatch edge
                            var eventRegistrationKey = calleeVariable + '___' + eventName;
                            if(eventRegistrationKey in eventRegistrationStatements){
                                var registered_handlers_list = eventRegistrationStatements[eventRegistrationKey];
                                registered_handlers_list.forEach(handler_node => {
                                    appendNode({
                                         fromId: ''+ node._id,
                                         toId: ''+ handler_node._id,
                                         fromNode: node,
                                         toNode: handler_node,
                                         relationLabel: "ERDDG_Dispatch",
                                         relationType: eventName,
                                         args: 'dispatch_event_on___' + calleeVariable+ '___' + calleeVariableId  /* e.g., button.click(), xhrInstance.open() */
                                    });
                                });
                            }
                            
                        } 

                    }
                    // iterate through childern
                    walkes.checkProps(node, recurse);
                },
                /**
                 * Call Graph (CG) Generation
                 * Step 2: connect caller (function call instance)--> callee (function definition)
                 */
                CallExpression: function(node, recurse){
                    if(options.ipcg && node && node.type === 'CallExpression' && node.callee){
                        var callerName = escodegen.generate(node.callee); // @NOTE: if the name/keyword is created wrong by our custom code, the relation is eliminated here because escodegen creates it correctly!
                        if(functionMap && Object.hasOwnProperty.bind(functionMap)(''+callerName)){

                            var functionDefinitionNode = functionMap[callerName];
                            var args = {};
                            for(var arg_i=0; arg_i<node.arguments.length; arg_i++){
                                var argumentNode = node.arguments[arg_i];
                                var argCode = escodegen.generate(argumentNode);
                                args[arg_i] = argCode;
                            }
                            let edge = {
                                fromId: '' + node._id,
                                toId: '' + functionDefinitionNode._id,
                                relationLabel: "CG_parentOf",
                                relationType: "CallFlow",
                                args: (node.arguments.length)? args: ''
                            };
                            appendEdge(edge);
                        }
                    } 

                    // iterate through childern
                    walkes.checkProps(node, recurse);
                }

            }); // END walkes
            DEBUG && console.log("finished ERDDG node and IPCG edge unrolling");

        } // END options.ipcg || options.erddg


        functionMap = {};
        eventRegistrationStatements={};


        DEBUG && console.log("started inter-procedural model unrolling");
        // export other inter-procedural models too, e.g., setTimeout function call to function parameter binding.
        var interProceduralModels = pageModels.interProceduralModels;
        await interProceduralModels.forEach(async function (model, modelIndex) {

            /**
             *  Control Flow Graph (CFG)
             *  for each Scope AST
             */

            var cfg = model.graph;
            if(cfg){  /* if no errors */
                var dpairs = model.dupairs;

                let allCFGNodes = cfg[2];
                for(let index in allCFGNodes){
                   let cfgNode = allCFGNodes[index];
                   let normal_flow = false;
                   if(cfgNode.true){
                       normal_flow = true;
                       let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.true.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_True",
                            args: cfgNode.true.type
                       };
                       appendEdge(record);

                   } if(cfgNode.false){
                        normal_flow = true;
                        let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.false.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_False",
                            args: cfgNode.false.type
                       };
                        appendEdge(record);
                   }
                    if(cfgNode.normal) {
                       /* normal flow */
                        normal_flow = true;
                       if(cfgNode.normal){
                            let record = {
                               fromId: cfgNode.uniqueId,
                               toId: cfgNode.normal.uniqueId,
                               relationLabel: "CFG_parentOf",
                               relationType: "Epsilon",
                               args: cfgNode.normal.type
                           };
                           appendEdge(record);
                       }
                   }
                    else if(cfgNode.exception && !normal_flow){
                        /* only if no normal flow exists*/
                        let record = {
                             fromId: cfgNode.uniqueId,
                             toId: cfgNode.exception.uniqueId,
                             relationLabel: "CFG_parentOf",
                             relationType: "Exit",
                             args: cfgNode.exception.type // can be entry, exit or normal
                        };
                        appendEdge(record);
                    }
                }

                /**
                 *  Program Dependence Graph (PDG)
                 *  Def-Use Analysis for each Scope AST
                 */

                dpairs.forEach(async (pairs, key)=> {
                    await pairs.forEach(async (pair)=> {


                        if(pair.first.uniqueId != 1) { /* remove DUPairs from Program Node */
                            if(pair.first.uniqueId && pair.second.uniqueId){ 
                            
                                // @CASE 1
                                // pair.first  FlowNode obj
                                // pair.second FlowNode obj
                                // pair.first ------ (Data_key) ----> pair.second
                                let record = {
                                    fromId: pair.first.uniqueId,
                                    toId: pair.second.uniqueId,
                                    relationLabel: "PDG_parentOf",
                                    relationType: "DataFlow",
                                    args: key.toString()
                                };
                                appendEdge(record);               
                            }
                            else{
                                // CASE 2
                                // pair.first FlowNode obj
                                // pair.second [ifstmt, block, condition_str]
                                let record = {
                                    fromId: pair.first.uniqueId,
                                    toId: pair.second[0]._id,
                                    relationLabel: "PDG_parentOf",
                                    relationType: "DataFlow",
                                    args: key.toString()
                                };
                                appendEdge(record);     
                                if(pair.second[1] && pair.second[1]._id){
                                    // CASE 3: for PDG control edges, if consequent of ifstmt is not null
                                    let recordConsequent= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'true', // predicate condition: true for ifStatement.consequent
                                        args: key.toString()
                                    };
                                    appendEdge(recordConsequent);   
                                }
                                if(pair.second[2] && pair.second[2]._id){
                                    // CASE 4: for PDG control edges, if alternate of ifstmt is not null
                                    let recordAlternate= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'false', // predicate condition: false for ifStatement.alternate
                                        args: key.toString()
                                    };
                                    appendEdge(recordAlternate);   

                                }
                            }
                        } // end top-if
                    })
                });
            } // end if cfg

        }); // end inter-procedural models

        DEBUG && console.log("finished inter-procedural model unrolling");

    });



    return {'nodes': g_nodes, 'edges': g_edges };
}

var graphbuilder = new GraphBuilder();
module.exports = graphbuilder;
