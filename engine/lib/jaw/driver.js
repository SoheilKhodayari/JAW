
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
var fs = require('fs'),
    spawnSync = require('child_process').spawnSync;
var scopeCtrl = require('./scope/scopectrl'),
    modelCtrl = require('./model/modelctrl'),
    Def = require('./def-use/def'),
    walkes = require('walkes');
var esprimaParser = require('./parser/jsparser');
var escodegen = require('escodegen');  // API: escodegen.generate(node);

const util = require('util');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const pathModule = require('path');

var constantsModule = require('./constants.js');

var flowNodeFactory = require('./../esgraph/flownodefactory');

var semanticTypes = require('./semantictypes').sTypeMap;

/**
 * Set true for printing debug information
 * @debug mode
 */
const DEBUG = constantsModule.DEBUG;
const devDEBUG = constantsModule.devDEBUG;

var disable_CG_analysis = false;
var disable_ERDDG_analysis = false;
var disable_ERDG = false; 
/**
 * Driver
 * @constructor
 */
function Driver() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
    };
    /* end-test-block */
}

Object.defineProperties(Driver.prototype, {
    
    /**
     * Base output directory
     * @type {string}
     * @memberof Driver.prototype
     */
    BASE_OUTPUT_DIR: {
        value: __dirname+ '/../../outputs/',
        // value: '/home/soheil/storage/xsleaks/master/hpg_construction/outputs/',
        enumerable: true
    },
    /**
     * Directory name of the root directory of the output files
     * @type {string}
     * @memberof Driver.prototype
     */
    ROOT_OUTPUT_DIR: {
        value: __dirname+ '/../../outputs/'+'tempt',
        enumerable: true
    },
    /**
     * Heading of the directory name of page outputs
     * @type {string}
     * @memeberof Driver.prototype
     */
    PAGE_OUTPUT_DIR: {
        value: 'page',
        enumerable: true
    },
    /**
     * Directory name of the intra-procedural analysis outputs
     * @type {string}
     * @memberof Driver.prototype
     */
    INTRA_PROCEDURAL_OUTPUTS_DIR: {
        value: 'intra-procedurals',
        enumeralbe: true
    },
    /**
     * Directory name of the inter-procedural analysis outputs
     * @type {string}
     * @memberof Driver.prototype
     */
    INTER_PROCEDURAL_OUTPUTS_DIR: {
        value: 'inter-procedurals',
        enumerable: true
    },
    /**
     * Directory name of the intra-page analysis outputs
     * @type {string}
     * @memberof Driver.prototype
     */
    INTRA_PAGE_OUTPUTS_DIR: {
        value: 'intra-pages',
        enumerable: true
    },
    /**
     * Directory name of the inter-page analysis outputs
     * @type {string}
     * @memberof Driver.prototype
     */
    INTER_PAGE_OUTPUTS_DIR: {
        value: 'inter-page',
        enumerable: true
    },
    /**
     * Collection of intra-procedural graph image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    intraProceduralGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-procedural def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    intraProceduralDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-procedural graph image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    interProceduralGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-procedural def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    interProceduralDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-page graph image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    intraPageGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of intra-page def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    intraPageDUPairsmageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-page graph image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    interPageGraphImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * Collection of inter-page def-use pairs table image file paths of each page
     * @type {Array}
     * @memberof Driver.prototype
     */
    interPageDUPairsImageFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    },
    /**
     * File paths for JS source of each page
     * @type {string}
     * @memberof Driver.prototype
     */
    pageJSSourFilePaths: {
        value: [],
        writable: true,
        enumerable: true
    }
});

/**
 * Create output directories
 * @param {number} pageIndex
 */
Driver.prototype.createOutputDirectories = function () {
    "use strict";
   
    if (!fs.existsSync(this.BASE_OUTPUT_DIR)) {
        fs.mkdirSync(this.BASE_OUTPUT_DIR, {recursive: true});
    }

};


function mkdirp(dir) {
    if (fs.existsSync(dir)) { return true }
    const dirname = pathModule.dirname(dir)
    mkdirp(dirname);
    fs.mkdirSync(dir);
}

Driver.prototype.createCSVOutputDirectories = function(relativeOutputPath){
    "use strict";
    var outputDir = this.BASE_OUTPUT_DIR + relativeOutputPath;
    if(!outputDir.endsWith('/')){
        outputDir = outputDir + "/"
    }
    if(!fs.existsSync(outputDir)){
        // Handle nodeJS fs library bug: https://github.com/nodejs/node/issues/27293
        // fs.mkdirSync(outputDir, {recursive: true});
        mkdirp(outputDir);
    }
    return outputDir
}

/**
 * Write the combined JS source files of a page
 * @param {string} content
 * @param {number} indexOfPage
 */
Driver.prototype.writeCombinedJSSource = function (content, indexOfPage, relativeOutputPath) {
    "use strict";

    var outputDir = this.BASE_OUTPUT_DIR + relativeOutputPath;
    if(!outputDir.endsWith('/')){
        outputDir = outputDir + "/"
    }
    if(!fs.existsSync(outputDir)){
         // Handle nodeJS fs library bug: https://github.com/nodejs/node/issues/27293
        // fs.mkdirSync(outputDir, {recursive: true});
        mkdirp(outputDir);
    }
    var path = outputDir + 'src.js';
    fs.writeFileSync(path, content);
    this.pageJSSourFilePaths[indexOfPage] = path;
};


/**
 * Check if a new Scope is initialized in AST
 */

function createsNewScope(node){
  return node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'Program';
}

function leave(scopeChain, node){
  if (createsNewScope(node)){
    var currentScope = scopeChain.pop();
  }
}


function getNodesHeaderLine(){
    let d = constantsModule.outputCSVDelimiter;
    return `Id:ID${d}Type${d}Kind${d}Code${d}Range${d}Location${d}Value${d}Raw${d}Async${d}Label:LABEL${d}SemanticType\n`
}

function getRelsHeaderLine(){
    let d = constantsModule.outputCSVDelimiter;
    return `FromId:START_ID${d}ToId:END_ID${d}RelationLabel:TYPE${d}RelationType${d}Arguments\n`
}

function getNodeLine(node){
    let d = constantsModule.outputCSVDelimiter;

    let id = JSON.stringify(node._id);

    // NEO4J IMPORT: Cancel out cases like str = "\"\"" with sanitizer
    var sanitizer = new RegExp(/^[\\ \" \']+$/g);

    // NEO4j LOAD_CSV support:   Pattern: (everything except another slash) slash quote -->> (matched character which is not slash) quote quote
    let type = (undefined !== node.type) ? JSON.stringify(node.type).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}): '';
    let kind = (undefined !== node.kind) ? JSON.stringify(node.kind).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';
    let name = (undefined !== node.name) ? JSON.stringify(node.name).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : 
                (undefined !== node.test) ? JSON.stringify(node.test).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}):    // if Statement Condition
                (undefined !== node.operator) ? JSON.stringify(node.operator).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}):  // BinaryExpression Operator or AssignmentExpression
                (undefined !== node.init) ? '=': '';  //  VariableDeclarator Assignment

    let range = (undefined !== node.range) ? JSON.stringify(node.range).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';
    let loc = (undefined !== node.loc) ? JSON.stringify(node.loc).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';
    let value = (undefined !== node.value) ? JSON.stringify(node.value).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';   
    let raw = (undefined !== node.raw) ? JSON.stringify(node.raw).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';
    let async = (undefined !== node.async) ? JSON.stringify(node.async).replace(/[^\\]\\"/g, (match, index)=> { return '' + match[0] + '""'}) : '';
    let semanticType = node.semanticType? node.semanticType: '';

    type = (sanitizer.test(type) || sanitizer.test(node.type) )? '': type.replace(/\\/g, '').replace(/\"/g,'');
    kind = (sanitizer.test(kind) || sanitizer.test(node.kind))? '': kind.replace(/\\/g, '').replace(/\"/g,'');
    name = (sanitizer.test(name) || sanitizer.test(node.name))? '': name.replace(/\\/g, '').replace(/\"/g,'');
    range = (sanitizer.test(range) || sanitizer.test(node.range))? '': range.replace(/\\/g, '').replace(/\"/g,'');
    loc = (sanitizer.test(loc) || sanitizer.test(node.loc))? '': loc.replace(/\\/g, '').replace(/\"/g,'');
    value = (sanitizer.test(value) || sanitizer.test(node.value))? '': value.replace(/\\/g, '').replace(/\"/g,'');
    raw = (sanitizer.test(raw) || sanitizer.test(node.raw))? '': raw.replace(/\\/g, '').replace(/\"/g,'');
    if(node.type !== 'Literal'){
        // @Fix For weird-input-data-no-newline-character-in-the-whole-buffer-4194304-not-supported 
        // see: https://stackoverflow.com/questions/56511859/weird-input-data-no-newline-character-in-the-whole-buffer-4194304-not-supporte
        value = '';
        raw = '';
    }
    async = (sanitizer.test(async) || sanitizer.test(node.async))? '': async.replace(/\\/g, '').replace(/\"/g,'');
    if(raw.indexOf('¿') > -1 || raw.indexOf('u00bf') > -1 || value.indexOf('¿') > -1 || value.indexOf('u00bf') > -1){
        raw= 'Literal_With_Spanish_Question_Symbol';
        value= 'Literal_With_Spanish_Question_Symbol';
        node.raw= raw;
        node.value = value;
    }

    let line =  "" + id + `${d}` +
           "" + type + `${d}` +
           "" + kind + `${d}` +
           "" + name + `${d}` +
           "" + range + `${d}` +
           "" + loc + `${d}` + 
           "" + value + `${d}` + 
           "" + raw + `${d}` +
           "" + async + `${d}` +
           "" + 'ASTNode' + `${d}` +
           "" + semanticType + "\n";

    return line;

}

function getRelationLine(rel){

    let d = constantsModule.outputCSVDelimiter;

    let line = '' + JSON.stringify(rel.fromId) + `${d}` +
               JSON.stringify(rel.toId) + `${d}` +
               JSON.stringify(rel.relationLabel).replace(/\\"/g, '""') + `${d}` +
               JSON.stringify(rel.relationType).replace(/\\"/g, '""') + `${d}` +
               JSON.stringify(rel.args).replace(/\\"/g, '""') + '\n';

    return line;
}

var fp_nodes;
var fp_rels;

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

    var key = memberExpressionNode.property.name;
    var n = memberExpressionNode.object;
    if(n && n.type === 'Identifier'){
         key = n.name + '.'+ key;
    }
    while(n && n.type === 'MemberExpression'){
        key = n.property.name + '.'+ key;
        n = n.object; // loop
        if(n.type === 'Identifier'){
            key = n.name + '.'+ key;
            break;
        }
    }
    // USE escodegen instead?
    // escodegen.generate(memberExpressionNode)  
    return key;                       
}

var getCallGraphFieldsForASTNode = function(node){
    var n = { _id: node._id }
    return n;
}
/**
 * consider's the case where partialActualName is part of a key in the functionMap
 * this will then create an alias entry for such key pairs with the PartialAliasName replaced
 */
var checkFunctionMapForPartialAliasing = function(pairs){
    for(var i=0; i< pairs.length; i++){
        var partialActualName = pairs[i][0];
        var partialAliasName = pairs[i][1];
        for(var functionName in functionMap){
            if(functionName.includes(partialActualName)){
                var pattern = new RegExp(partialActualName, "g");
                var newName = functionName.replace(pattern, partialAliasName);
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
            var event_variable_to_resolve = graphNode.scope.getVariable(node.name)
            graphNode.reachIns.some(function (vardef) {
                if (vardef.variable === event_variable_to_resolve && vardef.definition.type === Def.LITERAL_TYPE) {
                    let varDeclaration = vardef.definition.fromNode.astNode; // top level
                    foundValue = getVariableDeclarationValue(varDeclaration, event_variable_to_resolve.name) || null;
                }
                if (!!foundValue) {
                    return true;
                }
            });
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




/**
 * Write the result files of intra-procedural analysis
 */
Driver.prototype.writeIntraProceduralAnalysisResultFiles = async function (relativeOutputPath) {
    "use strict";
    var theDriver = this;
    var outputDirectory = await theDriver.createCSVOutputDirectories(relativeOutputPath);
    var pageScopeTrees = scopeCtrl.pageScopeTrees;

    /* *
    * Neo4j CSV node and relations file pointers
    */
    let nodesFilePath = pathModule.join(outputDirectory, constantsModule.ASTnodesFile);
    let edgesFilePath = pathModule.join(outputDirectory, constantsModule.ASTrelationsFile);

    fp_nodes = fs.openSync(nodesFilePath, 'w'); 
    fp_rels = fs.openSync(edgesFilePath, 'w');

    fs.writeSync(fp_nodes, getNodesHeaderLine());
    fs.writeSync(fp_rels, getRelsHeaderLine());

    // Export Exit nodes
    // @TODO: check if extra `exit` nodes shall be added!
    for(let ii = 0; ii< flowNodeFactory.generatedExits.length; ii++){
        fs.writeSync(fp_nodes, getNodeLine(flowNodeFactory.generatedExits[ii]));
    }

    var call_graph_alias_check = [];

    await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {

        var pageModels = modelCtrl.getPageModels(scopeTree);

        var intraProceduralModels = pageModels.intraProceduralModels;
        theDriver.intraProceduralGraphImageFilePaths[pageIndex] = [];
        theDriver.intraProceduralDUPairsImageFilePaths[pageIndex] = [];


        var astList = []
        await intraProceduralModels.forEach(async function (model, modelIndex) {
            
            if(modelIndex == 0){
                /**
                 *  Abstract Syntax Tree (AST)
                 *  for each Scope
                 *  main Scope has the full AST
                 *  (subgoal) find initial function declarations 
                 */

                var ast = scopeTree.scopes[modelIndex].ast;
                astList.push(ast);

                var astRels = [];
                var astNodes = [];
                var preNod = null;

                esprimaParser.traverseAST(ast, function(node){
                    if(node && node._id){
                        // store new nodes
                        if(!astNodes.some(e => e._id == node._id)){
                            astNodes.push(node);
                        }
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
                    
                    /**
                    * Initial Semantic Type Assignment
                    */
                    if(node && node.type === 'Identifier' && node.name){
                        Object.keys(semanticTypes).forEach(t => {
                            var sensitive_items = semanticTypes[t];
                            for(var it=0; it<sensitive_items.length; it++){
                                if(sensitive_items[it] == node.name){
                                    node.semanticType = t;
                                    break;
                                }
                            }
                        });
                    }
                    // END Semantic Type Assignment
                    if(!disable_CG_analysis && modelIndex === 0){
                        /**
                         * Call Graph (CG)
                         * Step 1: Function Map Generation
                         */
                        // CASE 1: function f(){}
                        if(node && node.type === 'FunctionDeclaration'){
                            if(node.id && node.id.name) {
                                functionMap[node.id.name] = getCallGraphFieldsForASTNode(node);
                                // CASE 5.1: handle the case where the function returns a object-expression (key,value) with values being the functions
                                if(node.body && node.body.type === 'BlockStatement'){
                                    var body = node.body.body;
                                    for(var q=0; q<body.length; q++){
                                        var expr = body[q];
                                        if(expr && expr.type === 'ReturnStatement' && expr.argument && expr.argument.type === 'ObjectExpression'){
                                            var props = expr.argument.properties;
                                            findCallGraphObjectExpressionFunctions(props, '' + node.id.name + '(...)'); // TODO: how to handle this case??!!
                                        }
                                    }
                                } // END CASE 5.1

                            }

                        } // CASE 2: var/let/const f = function(){}
                        else if(node && node.type === 'VariableDeclaration'){
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
                        } // CASE 3: var obj = { f: function(){} } - Should we use obj.f as key for functionMap?  = already captured by CASE 5.2
                        // else if(node && node.type === 'Property'){
                        //     if(node.key && node.key.name && node.value && node.value.type === 'FunctionExpression'){
                        //         functionMap[node.key.name] = node.value;
                        //     }}
                        // CASE 4: obj.f = function(){} or f = function(){}
                        else if(node && node.type === 'AssignmentExpression' && node.right && node.right.type === 'FunctionExpression'){
                            if(node.left){
                                if(node.left.type === 'Identifier'){
                                    functionMap[node.left.name] = getCallGraphFieldsForASTNode(node.right);
                                }
                                else if(node.left.type === 'MemberExpression' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name){
                                    var key = node.left.property.name;
                                    var n = node.left.object;
                                    if(n && n.type == 'Identifier'){
                                        key = n.name + '.' + key;
                                    }
                                    while(n && n.type === 'MemberExpression'){
                                        key = n.property.name + '.'+ key;
                                        n = n.object; // loop
                                        if(n.type === 'Identifier'){
                                            key = n.name + '.'+ key;
                                            break;
                                        }
                                    }
                                    functionMap[key] = getCallGraphFieldsForASTNode(node.right);
                                }
                            }
                        } // CASE 5. obj1.obj2.dict={ k1: { f1: function(){} } } or dict={ k1: { f1: function(){} } }
                        else if(node && node.type === 'AssignmentExpression' && node.right && node.right.type === 'ObjectExpression'){
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
                
                        /* BEGIN: add function aliases to function Map */
                        // CASE 1: var a = f1; or var a = obj1.f1;
                        if(node && node.type === 'VariableDeclarator' && node.id && node.id.name && node.init){
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
                        } // CASE 2: obj1.obj2.alias = func;  or obj1.obj2.alias = a.b.func;
                        else if(node && node.type === 'AssignmentExpression' && node.left && node.left.type === 'MemberExpression' && node.right){
                            if(node.right.type === 'Identifier'){
                                
                                var actual_name = node.right.name;
                                var alias_name = getMemberExpressionAsString(node.left)
                                
                                if(functionMap &&  functionMap.hasOwnProperty(actual_name) && !functionMap.hasOwnProperty(alias_name)){
                                    functionMap[alias_name] = functionMap[actual_name];
                                }else{
                                    // consider the case where actual_name is part of a key in function map
                                    // now node.right.name is aliased with the alias_name MemberExpression
                                    // checkFunctionMapForPartialAliasing(actual_name, alias_name)
                                     call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                }
                            }else if(node.right.type === 'MemberExpression'){

                                var actual_name = getMemberExpressionAsString(node.right);
                                var alias_name = getMemberExpressionAsString(node.left);   

                                if(functionMap && functionMap.hasOwnProperty(actual_name) && !functionMap.hasOwnProperty(alias_name)){
                                    functionMap[alias_name] = functionMap[actual_name];
                                }else{
                                    // checkFunctionMapForPartialAliasing(actual_name, alias_name);
                                     call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                } 
                            }
                        }/* END: add function aliases to function Map */

                    } // END modelIndex=0 & CG analysis


                    // @Note: this part moved to the next block where we find ERDDG registration edges
                    // if(!disable_ERDDG_analysis && modelIndex === 0){
                    //     // find all event registrations here 
                    //     if(node && node.type === 'ExpressionStatement' && node.expression &&
                    //        node.expression.callee && node.expression.callee.type === 'MemberExpression' &&
                    //        node.expression.callee.property.name === 'addEventListener'){
                    //        if(node.expression.callee.object.name in eventRegistrationStatements){
                    //           // add node to the list of event handlers registered on the element specified at key
                    //           eventRegistrationStatements[node.expression.callee.object.name].push(node);
                    //        }else{
                    //             eventRegistrationStatements[node.expression.callee.object.name] = [node];
                    //        } 
                    //     }
                    // }


                }); // END esprimaParser.traverseAST

            } // end modelIndex == 0
            
            /**
             *  Export AST nodes & rels
             */

            if(modelIndex === 0){

                if(constantsModule.DEBUG){
                    let nodeASTRecords = [];
                    Object.keys(astNodes).forEach((idx) => {
                        let nodeItem = astNodes[idx];
                        let record = {
                            id: (''+ nodeItem._id),
                            type: (''+ nodeItem.type)? (nodeItem.type): '',
                            kind: (''+ nodeItem.kind)? (nodeItem.kind): '',
                            name: (''+ nodeItem.name)? (nodeItem.name): '',
                            range: (''+ nodeItem.range)? (nodeItem.range): '',
                            loc: (''+ nodeItem.loc)? (JSON.stringify(nodeItem.loc)): '',
                            value: (''+ nodeItem.value)? (JSON.stringify(nodeItem.value)): '',
                            raw: (''+ nodeItem.raw)? (nodeItem.raw): '',
                            async: (''+ nodeItem.async)? (nodeItem.async): '',
                            computed: (''+ nodeItem.computed)? (nodeItem.computed): '',
                            generator: (''+ nodeItem.generator)? (nodeItem.generator): '',
                            sourceType: (''+ nodeItem.sourceType)? (nodeItem.sourceType): '',
                        };
                        nodeASTRecords.push(record);
                    });

                    let edgeASTRecords = []
                    Object.keys(astRels).forEach((idx) => {
                       let relItem = astRels[idx];
                       let record = {
                           fromId: (''+ relItem[0]),
                           toId: ('' + relItem[1]),
                           relationLabel: ('' + relItem[2]),
                           relationType: ('' + relItem[3]),
                           args: (relItem[4])? (JSON.stringify(relItem[4])): ''
                       };
                       edgeASTRecords.push(record);
                    });
                } /* END DEBUG */

                for(var w = 0; w< astNodes.length; w++){
                    var record = astNodes[w];
                    fs.writeSync(fp_nodes, getNodeLine(record));
                }
                for(var w = 0; w< astRels.length; w++){
                    var record = astRels[w];
                    fs.writeSync(fp_rels, getRelationLine(record));
                }

             }


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
                       fs.writeSync(fp_rels, getRelationLine(record));

                   } if(cfgNode.false){
                        normal_flow = true;
                        let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.false.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_False",
                            args: cfgNode.false.type
                       };
                        fs.writeSync(fp_rels, getRelationLine(record));
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
                           fs.writeSync(fp_rels, getRelationLine(record));
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
                        fs.writeSync(fp_rels, getRelationLine(record));
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
                                fs.writeSync(fp_rels, getRelationLine(record));               
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
                                fs.writeSync(fp_rels, getRelationLine(record));     
                                if(pair.second[1] && pair.second[1]._id){
                                    // CASE 3: for PDG control edges, if consequent of ifstmt is not null
                                    let recordConsequent= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'true', // predicate condition: true for ifStatement.consequent
                                        args: key.toString()
                                    };
                                    fs.writeSync(fp_rels, getRelationLine(recordConsequent));   
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
                                    fs.writeSync(fp_rels, getRelationLine(recordAlternate));     
                                }
                            }
                        } // end top-if

                    })
                });
            }

        });  /* END intraProceduralModels.forEach */


        // check partial aliasing + 
        // ALSO capture the verbtaim case when the position of the function definition in the code 
        // is after the call/alias site 
        await checkFunctionMapForPartialAliasing(call_graph_alias_check);

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

        var event_dependencies = [];
        var mainAST = astList[0];


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
                            fs.writeSync(fp_rels, getRelationLine(record));  

                            /* add the respective ERDDG dependency Edges */
                            var dependencyEdges = createEventDependencyEdges(handlerScope.ast, eventName, record.args);
                            dependencyEdges.forEach((record)=> {
                                fs.writeSync(fp_rels, getRelationLine(record));  
                            });

                        }
                    }
                });
                eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
                searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
            }
        }
        modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);


        if(true){
        await esprimaParser.traverseAST(mainAST, async function(node) {
            if(true && node && node.type === "ExpressionStatement"){
                /* CASE below already handled above */
                // if(node.expression && node.expression.type === "CallExpression" &&
                //     node.expression.callee && node.expression.callee.type === "MemberExpression" &&
                //     node.expression.callee.property.name === "addEventListener"){
                //     // TODO: move it to the top level and match dispatch and registration sites against the pairs of calleVariable and EventName
                //     var calleeVariable = node.expression.callee.object.name;
                //     var calleeVariableId = (calleeVariable)? calleeVariable._id: 'xx';
                //     /* handle the case where event name is stored in a variable. store variable name in that case & lator resolve it from the AST of the scope */
                //     var eventName = (node.expression.arguments[0].value)?(node.expression.arguments[0].value): ("resolve__" + node.expression.arguments[0].name);
                //     if(node.expression.arguments[1].type === "FunctionExpression"){
                //         var eventHandlerNode = node.expression.arguments[1];
                //         event_dependencies.push({
                //              fromId: node._id,
                //              toId: eventHandlerNode._id,
                //              fromNode: node,
                //              toNode: eventHandlerNode,
                //              relationLabel: "ERDDG",
                //              relationType: eventName,
                //              args: 'register_listener_on___' + calleeVariable + '___' + calleeVariableId /* e.g., window.addEventListener('click', function(e){...}) */
                //         });
                //     }

                // }
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
                        event_dependencies.push({
                             fromId: node._id,
                             toId: eventHandlerNode._id,
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
                            event_dependencies.push({
                                 fromId: node._id,
                                 toId: handler_node._id,
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
                                    event_dependencies.push({
                                         fromId: node._id,
                                         toId: handler_node._id,
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
                            event_dependencies.push({
                                 fromId: node._id,
                                 toId: handler_node._id,
                                 fromNode: node,
                                 toNode: handler_node,
                                 relationLabel: "ERDDG_Dispatch",
                                 relationType: eventName,
                                 args: 'dispatch_event_on___' + calleeVariable+ '___' + calleeVariableId  /* e.g., button.click(), xhrInstance.open() */
                            });
                        });
                    }
                    
                } 

            } // END IF type==ExpressionStatement
            /* BEGIN: connect caller (function call instance)--> callee (function definition) */
            else if(!disable_CG_analysis && node && node.type === 'CallExpression' && node.callee){
                var callerName = await escodegen.generate(node.callee); // @DEBUG_NOTE: if the name/keyword is created wrong by our custom code, the relation is eliminated here because escodegen creates it correctly!
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
                    fs.writeSync(fp_rels, getRelationLine(edge));
                }
            }
            /* END: caller-callee edges */

        });
        } // END IfStatement for disabling

        functionMap = {};
        DEBUG && console.log(event_dependencies);

        /**
         *  Event Dependency Graph (EDG)
         *  Figure out if an event registraion/dispatch is in (or dependent to) the handler of another event registration
         *             which ast nodes trigger an event
         *  How it works:
         *      Finds all register nodes and check if other nodes are a child of it
         */
        // var EDG_list = [];
        // for(var i_1=0; i_1<event_dependencies.length; i_1++){
        //     for(var j_1=0; j_1<event_dependencies.length; j_1++){
        //         if(i_1 === j_1) continue;
        //         var scopeChain = [];    
                
        //         var parentNode = event_dependencies[i_1];
        //         if(!parentNode.args.startsWith('register')) continue;

        //         var childNode = event_dependencies[j_1];
        //         var parentASTNode = parentNode.fromNode;
        //         esprimaParser.traverseAST(parentASTNode, function(node){

        //             if(createsNewScope(node)){
        //                 scopeChain.push([])
        //             }
        //             /* ignore dependency with a grandparent and child, store only parent and child! */
        //             if(scopeChain.length <=1 && childNode.fromNode._id === node._id){

        //                 /* There is a EDG_parentOf dependency fromNode to toNode s.t.
        //                    when relationType= eventName (e.g, onload) occurs, 
        //                    the args= dispatch_ or args=register_ event would occur!
        //                 */
        //                 EDG_list.push({
        //                     fromNode: parentNode,
        //                     toNode: childNode,
        //                     relationLabel: "EDG_parentOf",
        //                     relationType: parentNode.relationType,    
        //                     args: childNode.args
        //                 });
        //             }
        //             leave(scopeChain, node);
        //         });
        //     }
        // }
        // devDEBUG && console.log(EDG_list);

        /**
         *  Export ERDG relationships
         */
         
        Object.keys(event_dependencies).forEach((idx) => {
           let relItem = event_dependencies[idx];
           let record = {
               fromId: (''+ relItem.fromId),
               toId: ('' + relItem.toId),
               relationLabel: ('' + relItem.relationLabel),
               relationType: ('' + relItem.relationType),
               args: (relItem.args)? (JSON.stringify(relItem.args)): ''
           };
           fs.writeSync(fp_rels, getRelationLine(record));
        });

        /**
         *  Export EDG relationships
         */
        // Object.keys(EDG_list).forEach((idx) => {
        //    let relItem = EDG_list[idx];
        //    let record = {
        //        fromId: (''+ relItem.fromNode.fromId),
        //        toId: ('' + relItem.toNode.fromId),
        //        relationLabel: ('' + relItem.relationLabel),
        //        relationType: ('' + relItem.relationType),
        //        args: (relItem.args)? (JSON.stringify(relItem.args)): ''
        //    };
        //     fs.writeSync(fp_rels, getRelationLine(record));
        // });

        eventRegistrationStatements={};

    });
};

/**
 * Write the result files of inter-procedural analysis
 */
Driver.prototype.writeInterProceduralAnalysisResultFiles = async function (relativeOutputPath) {
    "use strict";
    var theDriver = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;
    
    let outputDirectory = await theDriver.createCSVOutputDirectories(relativeOutputPath);
    let edgesFilePath = pathModule.join(outputDirectory, constantsModule.ASTrelationsFile);

    pageScopeTrees.forEach(async function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        var interProceduralModels = pageModels.interProceduralModels;
        theDriver.interProceduralGraphImageFilePaths[pageIndex] = [];
        theDriver.interProceduralDUPairsImageFilePaths[pageIndex] = [];


        await interProceduralModels.forEach(function (model, modelIndex) {

            // @CHECK
            // TODO: is there any extra edges for CFG? (i.e., are there new flows that have not been considered yet??)
            /**
             *  Control Flow Graph (CFG)
             *  for each Scope AST
             */
            var cfg = model.graph;

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
                   fs.writeSync(fp_rels, getRelationLine(record));

               } if(cfgNode.false){
                    normal_flow = true;
                    let record = {
                        fromId: cfgNode.uniqueId,
                        toId: cfgNode.false.uniqueId,
                        relationLabel: "CFG_parentOf",
                        relationType: "Cond_False",
                        args: cfgNode.false.type
                   };
                    fs.writeSync(fp_rels, getRelationLine(record));
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
                       fs.writeSync(fp_rels, getRelationLine(record));
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
                    fs.writeSync(fp_rels, getRelationLine(record));
                }
            }

            /**
             *  Program Dependence Graph (PDG)
             *  Def-Use Analysis for each Scope AST
             */

            var dpairs = model.dupairs;
            dpairs.forEach(async (pairs, key)=> {
                await pairs.forEach(async (pair)=> {


                    if(pair.first.uniqueId != 1) { /* remove DUPairs from Program Node */
                        if(pair.first.uniqueId && pair.second.uniqueId){ 
                        
                            // @CASE 1
                            // pair.first  FlowNode obj
                            // pair.second FlowNode obj
                            // pair.first.cfgId ------ (Data_key) ----> pair.second.cfgId
                            let record = {
                                fromId: pair.first.uniqueId,
                                toId: pair.second.uniqueId,
                                relationLabel: "PDG_parentOf",
                                relationType: "DataFlow",
                                args: key.toString()
                            };
                            fs.writeSync(fp_rels, getRelationLine(record));               
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
                            fs.writeSync(fp_rels, getRelationLine(record)); 
                            if(pair.second[1] && pair.second[1]._id){
                                // CASE 3: for PDG control edges, if consequent or alternate of ifstmt is not null
                                let recordControl= {
                                    fromId:  pair.second[0]._id,
                                    toId: pair.second[1]._id,
                                    relationLabel: "PDG_control",
                                    relationType: pair.second[2]._id, // predicate condition: true or false
                                    args: key.toString()
                                };
                                fs.writeSync(fp_rels, getRelationLine(recordControl)); 
                            }
                        }
                    } // end top-if

                })
            });

        });
    });
};


// ----------------------------------------------------------------------------------------- //
//      Version2:   ERDDG + IPCG Creation + Semantic Type Assignment
// ----------------------------------------------------------------------------------------- // 


Driver.prototype.getInterProceduralModelNodesAndEdges = async function(semantic_types, options){


    "use strict";
    var theDriver = this;
    var pageScopeTrees = scopeCtrl.pageScopeTrees;

    // Add CFG "exit" nodes. 
    // TODO: check if really needed as the exit can be implicity inferred from the ast too
    var exitNodes = flowNodeFactory.generatedExits;
    
    // global nodes/edges to return
    var g_nodes = exitNodes;
    var g_edges = [];

    // IPCG
    var call_graph_alias_check = [];

    // map Program node file names to their id for inter-file PDG edges
    var importDependenciesFullNameToId = { }; // full file path and name -> program node id
    var importDependenciesNameToId = {} ; // file name (without ext) -> program node id

    await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {

        var pageModels = modelCtrl.getPageModels(scopeTree);

        var intraProceduralModels = pageModels.intraProceduralModels;

        var astList = []
        await intraProceduralModels.forEach(async function (model, modelIndex) {
            
            // traverse once only for the whole global scope, rather than each function scope in the AST
            if(modelIndex == 0)
            {
                /**
                 *  Abstract Syntax Tree (AST)
                 *  for each Scope
                 *  main Scope has the full AST
                 *  (subgoal) find initial function declarations 
                 */
                var ast = (scopeTree.scopes[modelIndex])? scopeTree.scopes[modelIndex].ast : undefined;
                if(!ast) return;
                // var ast = scopeTree.scopes[modelIndex].ast;
                astList.push(ast);

                var astRels = [];
                var astNodes = [];
                var preNod = null;

                esprimaParser.traverseAST(ast, function(node){
                    if(node && node._id){
                        // store new nodes
                        if(!astNodes.some(e => e._id == node._id)){
                            astNodes.push(node);
                        }
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
                    
                    /**
                    * TODO: Initial Semantic Type Assignment
                    */
                    // if(node && node.type === 'Identifier' && node.name){
                    //     Object.keys(semanticTypes).forEach(t => {
                    //         var sensitive_items = semanticTypes[t];
                    //         for(var it=0; it<sensitive_items.length; it++){
                    //             if(sensitive_items[it] == node.name){
                    //                 node.semanticType = t;
                    //                 break;
                    //             }
                    //         }
                    //     });
                    // }
                    // END Semantic Type Assignment


                    if(!disable_CG_analysis && modelIndex === 0){
                        /**
                         * Call Graph (CG)
                         * Step 1: Function Map Generation
                         */
                        // CASE 1: function f(){}
                        if(node && node.type === 'FunctionDeclaration'){
                            if(node.id && node.id.name) {
                                functionMap[node.id.name] = getCallGraphFieldsForASTNode(node);
                                // CASE 5.1: handle the case where the function returns a object-expression (key,value) with values being the functions
                                if(node.body && node.body.type === 'BlockStatement'){
                                    var body = node.body.body;
                                    for(var q=0; q<body.length; q++){
                                        var expr = body[q];
                                        if(expr && expr.type === 'ReturnStatement' && expr.argument && expr.argument.type === 'ObjectExpression'){
                                            var props = expr.argument.properties;
                                            findCallGraphObjectExpressionFunctions(props, '' + node.id.name + '(...)'); // TODO: how to handle this case??!!
                                        }
                                    }
                                } // END CASE 5.1

                            }

                        } // CASE 2: var/let/const f = function(){}
                        else if(node && node.type === 'VariableDeclaration'){
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
                        } // CASE 3: var obj = { f: function(){} } - Should we use obj.f as key for functionMap?  = already captured by CASE 5.2
                        // else if(node && node.type === 'Property'){
                        //     if(node.key && node.key.name && node.value && node.value.type === 'FunctionExpression'){
                        //         functionMap[node.key.name] = node.value;
                        //     }}
                        // CASE 4: obj.f = function(){} or f = function(){}
                        else if(node && node.type === 'AssignmentExpression' && node.right && node.right.type === 'FunctionExpression'){
                            if(node.left){
                                if(node.left.type === 'Identifier'){
                                    functionMap[node.left.name] = getCallGraphFieldsForASTNode(node.right);
                                }
                                else if(node.left.type === 'MemberExpression' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name){
                                    var key = node.left.property.name;
                                    var n = node.left.object;
                                    if(n && n.type == 'Identifier'){
                                        key = n.name + '.' + key;
                                    }
                                    while(n && n.type === 'MemberExpression'){
                                        key = n.property.name + '.'+ key;
                                        n = n.object; // loop
                                        if(n.type === 'Identifier'){
                                            key = n.name + '.'+ key;
                                            break;
                                        }
                                    }
                                    functionMap[key] = getCallGraphFieldsForASTNode(node.right);
                                }
                            }
                        } // CASE 5. obj1.obj2.dict={ k1: { f1: function(){} } } or dict={ k1: { f1: function(){} } }
                        else if(node && node.type === 'AssignmentExpression' && node.right && node.right.type === 'ObjectExpression'){
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
                
                        /* BEGIN: add function aliases to function Map */
                        // CASE 1: var a = f1; or var a = obj1.f1;
                        if(node && node.type === 'VariableDeclarator' && node.id && node.id.name && node.init){
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
                        } // CASE 2: obj1.obj2.alias = func;  or obj1.obj2.alias = a.b.func;
                        else if(node && node.type === 'AssignmentExpression' && node.left && node.left.type === 'MemberExpression' && node.right){
                            if(node.right.type === 'Identifier'){
                                
                                var actual_name = node.right.name;
                                var alias_name = getMemberExpressionAsString(node.left)
                                
                                if(functionMap &&  functionMap.hasOwnProperty(actual_name) && !functionMap.hasOwnProperty(alias_name)){
                                    functionMap[alias_name] = functionMap[actual_name];
                                }else{
                                    // consider the case where actual_name is part of a key in function map
                                    // now node.right.name is aliased with the alias_name MemberExpression
                                    // checkFunctionMapForPartialAliasing(actual_name, alias_name)
                                    call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                }
                            }else if(node.right.type === 'MemberExpression'){

                                var actual_name = getMemberExpressionAsString(node.right);
                                var alias_name = getMemberExpressionAsString(node.left);   

                                if(functionMap && functionMap.hasOwnProperty(actual_name) && !functionMap.hasOwnProperty(alias_name)){
                                    functionMap[alias_name] = functionMap[actual_name];
                                }else{
                                    // checkFunctionMapForPartialAliasing(actual_name, alias_name);
                                    call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                } 
                            }
                        }/* END: add function aliases to function Map */

                    } // END modelIndex=0 & CG analysis

                }); // END esprimaParser.traverseAST
            
                /**
                 *  Export AST nodes & rels
                 */

                for(var w = 0; w< astNodes.length; w++){
                    g_nodes.push(astNodes[w]);
                }
                for(var w = 0; w< astRels.length; w++){
                    g_edges.push(astRels[w]);
                }
            } // End modelIndex= 0


            /**
             *  Control Flow Graph (CFG)
             *  for each intra-procedural AST scope
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
                       g_edges.push(record);

                   } if(cfgNode.false){
                        normal_flow = true;
                        let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.false.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_False",
                            args: cfgNode.false.type
                       };
                        g_edges.push(record);
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
                           g_edges.push(record);
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
                        g_edges.push(record);
                    }
                }

                /**
                 *  Program Dependence Graph (PDG)
                 *  Def-Use Analysis for each intra-procedural AST scope
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
                                g_edges.push(record);               
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
                                g_edges.push(record);     
                                if(pair.second[1] && pair.second[1]._id){
                                    // CASE 3: for PDG control edges, if consequent of ifstmt is not null
                                    let recordConsequent= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'true', // predicate condition: true for ifStatement.consequent
                                        args: key.toString()
                                    };
                                    g_edges.push(recordConsequent);   
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
                                    g_edges.push(recordAlternate);   

                                }
                            }
                        } // end top-if

                    })
                });
            } // end if cfg

            /**
             *  1- Export Edges for exportable objects (i.e., `Program` Nodes and `model.exitNodeReachIns``)
             *  2- fill importDependenciesNameToId, importDependenciesFullNameToId, i.e., mapping between filename to Program node id
             */

             let scopeEntryNode = model.graph[0];
             if(scopeEntryNode.astNode.type == 'Program'){

                if(model.exitNodeReachIns && model.exitNodeReachIns.length){
                    model.exitNodeReachIns.forEach(vardef=> {
                        if(vardef){
                            // make sure vardef is not null
                            let record = {
                                fromId: vardef.definition.fromNodeActual._id,
                                toId: scopeEntryNode.astNode._id, 
                                relationLabel: "PDG_parentOf",
                                relationType: "Exportable",
                                args: vardef.variable.name

                            };
                            g_edges.push(record);                
                        }

                    })
                }
                // fill importDependenciesIds
                importDependenciesFullNameToId[scopeEntryNode.astNode.value] = scopeEntryNode.astNode._id; // full path -> program node id
                importDependenciesNameToId[scopeEntryNode.astNode.raw] = scopeEntryNode.astNode._id; // file name -> program node id
             }


        });  /* END intraProceduralModels.forEach */


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
                // check partial aliasing + 
                // ALSO capture the verbtaim case when the position of the function definition in the code 
                // is after the call/alias site 
                await checkFunctionMapForPartialAliasing(call_graph_alias_check);
            }
        
            if (options.erddg) {
                var mainAST = astList[0];

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
                                    g_edges.push(record);

                                    /* add the respective ERDDG dependency Edges */
                                    var dependencyEdges = createEventDependencyEdges(handlerScope.ast, eventName, record.args);
                                    dependencyEdges.forEach((record)=> {
                                        g_edges.push(record);
                                    });

                                }
                            }
                        });
                        eventHandlerModels = eventHandlerModels.concat(foundEventHandlerModels);
                        searchingEventHandlerModels = searchingEventHandlerModels.concat(foundEventHandlerModels);
                    }
                }
                modelCtrl.addIntraPageModelToAPage(scopeTree, intraPageModel);
            }

            await esprimaParser.traverseAST(mainAST, async function(node) {
                if(options.erddg && node && node.type === "ExpressionStatement"){

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
                            g_nodes.push({
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
                                g_nodes.push({
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
                                        g_nodes.push({
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
                                g_nodes.push({
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

                } // END IF type==ExpressionStatement
                /* BEGIN: connect caller (function call instance)--> callee (function definition) */
                else if(options.ipcg && node && node.type === 'CallExpression' && node.callee){
                    var callerName = await escodegen.generate(node.callee); // @DEBUG_NOTE: if the name/keyword is created wrong by our custom code, the relation is eliminated here because escodegen creates it correctly!
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
                        g_edges.push(edge);
                    }
                }
                /* END: caller-callee edges */

            });
        } // END options.ipcg || options.erddg


        functionMap = {};
        eventRegistrationStatements={};


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
                       g_edges.push(record);

                   } if(cfgNode.false){
                        normal_flow = true;
                        let record = {
                            fromId: cfgNode.uniqueId,
                            toId: cfgNode.false.uniqueId,
                            relationLabel: "CFG_parentOf",
                            relationType: "Cond_False",
                            args: cfgNode.false.type
                       };
                        g_edges.push(record);
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
                           g_edges.push(record);
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
                        g_edges.push(record);
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
                                g_edges.push(record);               
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
                                g_edges.push(record);     
                                if(pair.second[1] && pair.second[1]._id){
                                    // CASE 3: for PDG control edges, if consequent of ifstmt is not null
                                    let recordConsequent= {
                                        fromId:  pair.second[0]._id,
                                        toId: pair.second[1]._id,
                                        relationLabel: "PDG_control",
                                        relationType: 'true', // predicate condition: true for ifStatement.consequent
                                        args: key.toString()
                                    };
                                    g_edges.push(recordConsequent);   
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
                                    g_edges.push(recordAlternate);   

                                }
                            }
                        } // end top-if
                    })
                });
            } // end if cfg

        }); // end inter-procedural models

    });


    /**
     *  Export Import Edges Between FILES (i.e., `Program` Nodes) with `model.imports`
     */
    var importDependenciesFiles = { }; // filename -> model.imports

    await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {
        var pageModels = modelCtrl.getPageModels(scopeTree);
        pageModels.intraProceduralModels.forEach(async function (model, modelIndex) {

            let scopeEntryNode = model.graph[0];
            if(scopeEntryNode.astNode.type == 'Program' && model.imports && model.imports.length){
                model.imports.forEach(moduleImportItem=> {
                    let moduleName = moduleImportItem.module;
                    let importedObjects = [];
                    moduleImportItem.objects.forEach(obj=> importedObjects.push(obj.object));

                    if(moduleName in importDependenciesNameToId){
                        let targetFileId = importDependenciesNameToId[moduleName];
                        let record= {
                            fromId: targetFileId,             // import from this file
                            // toId: scopeEntryNode.astNode._id, // imported to current file
                            toId:  moduleImportItem.id, // import statement id
                            relationLabel: "PDG_parentOf",
                            relationType: 'ModuleImport', 
                            args: '' + importedObjects        // pass a list of imported variables
                        };
                        g_edges.push(record);    

                    }else{
                        console.log('[+] warning: file '+ moduleName + ' was imported in code but not given to HPG analysis component.')
                    }
                });
            }
        });
    });





    return {'nodes': g_nodes, 'edges': g_edges };
}

var driver = new Driver();
module.exports = driver;

