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
var sourceMapLibrary = require('source-map');

var constantsModule = require('./constants.js');
var flowNodeFactory = require('./../esgraph/flownodefactory');


 /*
 * Flag to show console messages indicating
 * the different stages of the static analyis
 */
const DEBUG = false;
const WARNING_LOCS = false;
const DEBUG_FOXHOUND_TAINT_LOGS = false;
const CALL_GRAPH_PARTIAL_ALIASING_CUTOFF = true;

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
 * stores a mapping between code line to top-level nodes for each script
 * format: script_name -> {line -> node } 
 */
var scriptLinetoCodeMap = {};

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
 * checks if an object has a given property 
 */
function objectHasOwnProperty(obj, prop){
    return Object.hasOwnProperty.bind(obj)(''+prop)
}

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
    var n = { 
        _id: node._id, 
        params: node.params, // function parameters
    }
    return n;
}
/**
 * considers the case where partialActualName is part of a key in the functionMap
 * this will then create an alias entry for such key pairs with the PartialAliasName replaced
 */
var checkFunctionMapForPartialAliasing = function(pairs){
    
    false && DEBUG & console.log('pairs: ', pairs)
    false && DEBUG & console.log('functionMap: ', Object.keys(functionMap))

    // the size of functionMap may grow exponentially
    // this comparison will be a bit slow (trade-off between precision and performance)
    for(var i=0; i< pairs.length; i++){
        var partialActualName = pairs[i][0];
        var partialAliasName = pairs[i][1];

        // fix the 2nd iteration keys, as functionMap will grow dynamically when there is an alias match
        var functionMapKeys  = new Set(Object.keys(functionMap));

        if(partialActualName !== undefined && partialAliasName !== undefined){
            for(var functionName of functionMapKeys){
                if (functionName !== undefined) {
                    let len = partialActualName.length;
                    let idx = functionName.indexOf(partialActualName);

                    if(idx == -1){
                        continue;
                    }

                    if((partialActualName[0] == '.' || idx == 0 || functionName[idx-1] == '.' ) && (partialActualName[len-1] == '.' || idx+len == functionName.length || functionName[idx+len] == '.') ){
                        var newName = functionName.replace(partialActualName, partialAliasName);
                        let reference = functionMap[functionName];
                        if (reference !== null && reference !== undefined){
                            functionMap[newName] = functionMap[functionName];
                        }
                    }
                }
            }
        }
    }
    false && DEBUG & console.log('functionMap: ', Object.keys(functionMap))
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


function getExpressionStmtLowsetCFGNode(expression_stmt, varname){

  var ret_node_id = null;
  var last_node_id = null;

  walkes(expression_stmt, {
      ExpressionStatement: function(node, recurse){
          last_node_id = node._id;
          recurse(node.expression);
      },
      VariableDeclaration: function (node, recurse) {
          last_node_id = node._id;
          for(let decl of node.declarations){
              recurse(decl);
          }
      },
      ReturnStatement: function(node, recurse){
        last_node_id = node._id
        recurse(node.argument);
      },
      ThrowStatement: function(node, recurse){
        last_node_id = node._id
        recurse(node.argument);
      },

      Identifier: function(node){
        if(node.name === varname){
          ret_node_id = last_node_id;
        }
      }

  });

  return ret_node_id;

}


/**
 * Maps dynamic foxhound taintflows to edges between nodes of the property graph
 * @param {dict} taintflows from Foxhound
 * @param {dict} scripts_mapping json needed to map foxhound script names to the crawler-chosen names 
 * @param {dict} sourcemaps
 * @returns {dict} list of edges to be added; or `false` if the input validation fails;
 */
GraphBuilder.prototype.mapFoxhoundTaintFlowsToGraph = async function(taintflows, scripts_mapping, sourcemaps){

    function getMatchingScriptName(scripts_mapping, foxhound_src, foxhound_sink_line){

        foxhound_src = foxhound_src.trim()

        // external scripts
        for(let script_name of Object.keys(scripts_mapping)){
            let script = scripts_mapping[script_name];
            let script_src = script.src.trim();
            if(foxhound_src.includes(script_src) && script_src.length > 0){
                return {
                    name: script_name,
                    type: 'external'
                }
            }
        }

        // internal scripts and others; use the script line range
        for(let script_name of Object.keys(scripts_mapping)){
            let script = scripts_mapping[script_name];
            
            let s = script.lines[0];
            let e = script.lines[1];

            if(foxhound_sink_line >= s && foxhound_sink_line <= e){
                return {
                    name: script_name,
                    type: 'inline'
                }
            }
        }
        return null;
    }


    function getMatchingScriptNameByScriptHash(scripts_mapping, script_hash){

        for(let script_name of Object.keys(scripts_mapping)){
            let script = scripts_mapping[script_name];
            if(script.hash === script_hash){
                return {
                    name: script_name,
                    type: script.type
                }
            }
        }
        return null;

    }

    function getASTFromScriptName(script_name){
        
        let pageScopeTrees = scopeCtrl.pageScopeTrees;
        for(let i=0; i< pageScopeTrees.length; i++){
            let scopeTree = pageScopeTrees[i];
            let mainAST = scopeTree.scopes[0].ast; // AST of each `Program` nodethe 

            let scriptNameInAST = mainAST.value.split('/').pop(); 
            if(scriptNameInAST === script_name){
                return mainAST
            }
        }

        return null
    }


    function getCommonTokensFromASTNodesForPDG(fromNode, toNode){

        /*
        ------------------------
        Examples of cases to handle
        -----------------------        

        const [a, b] = array;
        const [a, , b] = array;
        const [a = aDefault, b] = array;
        const [a, b, ...rest] = array;
        const [a, , b, ...rest] = array;
        const [a, b, ...{ pop, push }] = array;
        const [a, b, ...[c, d]] = array;

        const { a, b } = obj;
        const { a: a1, b: b1 } = obj;
        const { a: a1 = aDefault, b = bDefault } = obj;
        const { a, b, ...rest } = obj;
        const { a: a1, b: b1, ...rest } = obj;
        const { [key]: a } = obj;

        let a, b, a1, b1, c, d, rest, pop, push;
        [a, b] = array;
        [a, , b] = array;
        [a = aDefault, b] = array;
        [a, b, ...rest] = array;
        [a, , b, ...rest] = array;
        [a, b, ...{ pop, push }] = array;
        [a, b, ...[c, d]] = array;

        ({ a, b } = obj); // brackets are required
        ({ a: a1, b: b1 } = obj);
        ({ a: a1 = aDefault, b = bDefault } = obj);
        ({ a, b, ...rest } = obj);
        ({ a: a1, b: b1, ...rest } = obj);
        */


        function handleAssignmentExpression(node, stack){

            if(node && node.left){ // ensure assignment expression
                let left = node.left;
                // a = b
                if(left.type === "Identifier"){
                    stack.push(left.name);
                }
                //  [a, b] = array;
                else if(left.type === "ArrayPattern"){
                    for(let element of left.elements){
                        // remove null elements like [a, , b]= [1, 2, 3] with no name
                        if(element){  
                            
                            if(element.type === "Identifier" && element.name){
                                stack.push(element.name);
                            }
                            // [a = aDefault, b] = array;
                            else if(element.type === "AssignmentPattern"){
                                if(element.left && element.left.type === "Identifier" && element.left.name){
                                    stack.push(element.left.name);
                                }
                            }
                            else if(element.type === "RestElement" && element.argument){
                                // [a, b, ...rest] = array;
                                if(element.argument.type === "Identifier" && element.argument.name){
                                    stack.push(element.argument.name);
                                }
                                // [a, b, ...{ pop, push }] = array;
                                else if(element.argument.type === "ObjectPattern"){
                                    for(let prop of element.argument.properties){
                                        if(prop.key && prop.key.type === "Identifier" && prop.key.name){
                                            stack.push(prop.key.name);
                                        }
                                    }
                                }
                                // [a, b, ...[c, d]] = array;
                                else if(element.argument.type === "ArrayPattern"){
                                    for(let e of element.argument.elements){
                                        if(e.type === "Identifier" && e.name){
                                            stack.push(e.name);
                                        }
                                    }
                                }


                            }
                            
                        }
                       
                    }
                }
                // ({ a, b } = obj);
                else if(left.type === "ObjectPattern"){
                    for(let prop of left.properties){
                        if(prop.key && prop.key.type === "Identifier" && prop.key.name){
                            stack.push(prop.key.name);
                        }
                    }      
                }
            }
        }

        function handleVariableDeclaration(node, stack){
            for(let declarator of node.declarations){
                if(declarator.id && declarator.id.type === "Identifier"){
                    stack.push(declarator.id.name);
                }
                else if(declarator.id && declarator.id.type === "ArrayPattern"){
                    for(let element of declarator.id.elements){
                        if(element){
                            if(element.type === "Identifier" && element.name){
                                stack.push(element.name);
                            }

                            else if(element.type === "AssignmentPattern"){
                                if(element.left && element.left.type === "Identifier" && element.left.name){
                                    stack.push(element.left.name);
                                }
                            }
                            else if(element.type === "RestElement" && element.argument){
                                // [a, b, ...rest] = array;
                                if(element.argument.type === "Identifier" && element.argument.name){
                                    stack.push(element.argument.name);
                                }
                                // [a, b, ...{ pop, push }] = array;
                                else if(element.argument.type === "ObjectPattern"){
                                    for(let prop of element.argument.properties){
                                        if(prop.key && prop.key.type === "Identifier" && prop.key.name){
                                            stack.push(prop.key.name);
                                        }
                                    }
                                }
                                // [a, b, ...[c, d]] = array;
                                else if(element.argument.type === "ArrayPattern"){
                                    for(let e of element.argument.elements){
                                        if(e.type === "Identifier" && e.name){
                                            stack.push(e.name);
                                        }
                                    }
                                }


                            }

                        }
                    }
                }
                else if(declarator.id && declarator.id.type === "ObjectPattern"){
                    for(let prop of declarator.id.properties){
                        if(prop.key && prop.key.type === "Identifier" && prop.key.name){
                            stack.push(prop.key.name);
                        }
                    }
                }
            }
        }


        // step 1: identidy all identifiers in the `toNode`
        let toNodeIdentifierTokens = [];
        walkes(toNode, {
            Identifier: function(node){
                toNodeIdentifierTokens.push(node.name);
            }
        });

        // remove duplicates
        toNodeIdentifierTokens = [...new Set(toNodeIdentifierTokens)];


        // step 2: identify all left-hand side tokens in the `fromNode`
        let fromNodeLeftHandIdentifierTokens = [];
        if(fromNode.type === 'ExpressionStatement'){
            // x = y;
            if(fromNode.expression.type === "AssignmentExpression"){
               handleAssignmentExpression(fromNode.expression, fromNodeLeftHandIdentifierTokens);
            } 
            // x = y, w = z; 
            else if(fromNode.expression.type === "SequenceExpression"){
                for(let assign_expr_node of fromNode.expression.expressions){
                    handleAssignmentExpression(assign_expr_node, fromNodeLeftHandIdentifierTokens)
                }
            }
        }
        else if(fromNode.type === 'VariableDeclaration'){
            // var x = y;
            // AND
            // var x = y, w = z;
            handleVariableDeclaration(fromNode, fromNodeLeftHandIdentifierTokens);
        }

        // get the intersection of results of step 1 and 2
        return fromNodeLeftHandIdentifierTokens.filter(value => toNodeIdentifierTokens.includes(value));

    }

    function removeFileNameFromTaintFlowAndStripScriptName(array){

        // 1. remove `location.filename` property
        // this property may prevent uniqueness matching among taint flows,  
        // e.g., because it may contain hash fragment information added to one of taint flows 
        // or other random tokens in the url

        // 2. make sure that the `script` property does not contain #
        // if it does, then strip it

        for(let object of array){
            if(object.script.includes('#')){
                let idx = object.script.indexOf('#');
                object.script = object.script.substring(0, idx);
            }
            for(let taint of object.taint){
                for(let flow of taint.flow){
                    if(flow.location && flow.location.filename){
                        delete flow.location["filename"];
                    }
                }
            }
        }


        

        return array  
    }
    function removeDuplicateObjects(array){

        // check for duplicates, determine uniqueness by comparing objects properties
        return array.filter((value,index,arr)=>arr.findIndex(v2=>(JSON.stringify(v2) === JSON.stringify(value)))===index)
    }

    /**
     * @description remove duplicates and unusful flow operations, e.g., .slice(), etc.
     * @param  {list} taintflows foxhound output
     * @return {list} cleaned taint flows
     */
    function preprocessTaintflows(taintflows){
    
        
        // @note structure: 
        // we have taint flows
        // each taint flow has several taints
        // each taint has several flows
        // each flow has several operations


        taintflows = removeFileNameFromTaintFlowAndStripScriptName(taintflows);
        DEBUG && console.log('taint flows before de-duplication:', taintflows.length);
        taintflows = removeDuplicateObjects(taintflows);
        DEBUG && console.log('taint flows after de-duplication:', taintflows.length);

        let cleaned_taintflows = [];

        for(var i=0; i<taintflows.length; i++){

            let taintflow = taintflows[i];
            let taints = [...new Set(taintflow.taint)]


            let noBeginEndTaints = [];
            for(let t of taints){
                noBeginEndTaints.push({"flow": t.flow});
            }

            taints = removeDuplicateObjects(noBeginEndTaints);

            let cleaned_taints = [];

            for(let taint of taints){

                let flow = taint.flow;
                let cleaned_flow = [];

                // TODO: iterate over the list of `flows`
                // and remove `operations` that cannot be mapped to edges in the HPG 
                // complete this part incrementally

                for(let j=0; j< flow.length; j++){
                    
                    let operation_object = flow[j];

                    if(operation_object.operation === 'slice'){
                        continue;
                    }

                    if(operation_object.operation === 'JSON.stringify'){
                        continue;
                    }

                    cleaned_flow.push(operation_object);
                }


                taint.flow = cleaned_flow;
                cleaned_taints.push(taint);
            }

            taintflow.taint = cleaned_taints;
            cleaned_taintflows.push(taintflow);

        }

        return cleaned_taintflows;

    }


    // validate inputs
    if(!taintflows || !scripts_mapping || (scripts_mapping && Object.keys(scripts_mapping).length === 0) || !sourcemaps){
        return false;
    }


    // clean the taint flows (e.g., remove duplicates, irrelevant operations, etc)
    taintflows = preprocessTaintflows(taintflows);

    // stores edges to be added to the graph
    var edges = [];
    var edge_ids = [];
    

    // stores labels to be added to the nodes
    // e.g., requests containing push subscription, add the label `REQ_PUSH_SUB`
    // structure:
    // DEPRECATED: script-name -> {id: node._id, semanticTypes: labels}
    // NEW FORMAT: node._id -> [semanticType1, ..., semanticTypeN]
    var nodes = {};

    // iterate over taintflows and identify the script file that has that flow
    for(var i=0; i< taintflows.length; i++){
    
        var taintflow = taintflows[i];  // exposes: taintflow.script, taintflow.line, taintflow.taint
       
        //// find the exact script file (as saved by the crawler) corresponding to the taint taintflow (e.g., 1.js, 2.js, etc)
        // let script_object = await getMatchingScriptName(scripts_mapping, taintflow.script, taintflow.line);

        let script_hash = '';
        try{
            script_hash = taintflow.taint[0].flow[0].location.scripthash;
        }catch(e){
            console.error('[[error]] unable to unroll script hash from taint flows.', e)
            continue;
        }
       
        let script_object = getMatchingScriptNameByScriptHash(scripts_mapping, script_hash)

        if(!script_object){
            WARNING_LOCS && console.log('[[warning]] script_hash:', script_hash);
            WARNING_LOCS && console.log('[[warning]] did not found a corresponding script for the foxhound taintflow.')
            WARNING_LOCS && console.log('[[warning]] taintflow.script: ', taintflow.script);
            WARNING_LOCS && console.log('[[warning]] taintflow.line:', taintflow.line);
            continue;
        }

        let script_type = script_object.type;
        let script_name = script_object.name;

        // find the AST model of this script
        let ast = getASTFromScriptName(script_name)
        if(!ast){
             WARNING_LOCS && console.log('[[warning]] did not found a corresponding ast for the script in the taint flow.')
             continue;
        }

        // init sourcemap consumer
        let raw_source_map = sourcemaps[script_name]; 
        const smConsumer = await new sourceMapLibrary.SourceMapConsumer(raw_source_map);


        // iterate through each part of the taintflow, and map to an edge
        // note that each taintflow may have multiple data flows (e.g., with different string ranges)
        

        
        let unique_taintflows = [...new Set(taintflow.taint)];
        for(let taint_object of unique_taintflows){

            let flow = taint_object.flow;
            let taintedCFGNodes = [];
            let taintedCFGNodeIds = [];

            var object_i_ast_node = null; // node i
            var object_i_p1_ast_node = null; // node i + 1

            // console.log('===============\n');

            for(let ii =1; ii < flow.length - 1; ii ++){ // start ii at 1 to ignore `ReportTaintSink` item in the flow


                // find the AST node / code at `gen_position` in `script_name` and 
                // connect it to the node of the next item of the loop
                let object_1 = flow[ii];

                let object_1_line = object_1.location.line; 
                if(script_type === 'inline'){
                    // reduce the offset LoC from the beginning of the HTML doc to the beginning of the script
                    object_1_line = object_1_line - object_1.location.scriptline + 1;
                }


                // ignore the flow in case foxhound returns a zero line number 
                if(object_1_line < 1) continue;

                let object_1_column =  object_1.location.pos;
                let object_1_gen_position = await smConsumer.generatedPositionFor({ source: script_name, line: object_1_line, column: object_1_column});

                let object_2 = flow[ii + 1];
                let object_2_line = object_2.location.line;
                if(script_type === 'inline'){
                    // reduce the offset LoC from the beginning of the HTML doc to the beginning of the script
                    object_2_line = object_2_line - object_2.location.scriptline + 1;
                }

                // ignore the flow in case foxhound returns a zero line number 
                if(object_2_line < 1) continue;

                let object_2_column =  object_2.location.pos;
                let object_2_gen_position = await smConsumer.generatedPositionFor({ source: script_name, line: object_2_line, column: object_2_column});

                // Q1. given the LoC positions, what AST node to pick?
                // Q2. given the taint flows, what edge type to connect between the nodes? 

                DEBUG && console.log('locations', JSON.stringify({
                    "script_name": script_name,
                    "script_type": script_type,
                    "generated": object_1_gen_position.line, 
                    "original": object_1_line,

                }));


                // flags to break the AST traversal after finding the top level node
                var found_i = false;
                var found_i_p1 = false;

                /*
                // this piece of code is slow 
                esprimaParser.traverseAST(ast, function(node){
                    if(!found_i && node && node.loc && node.loc.start.line === object_1_gen_position.line ) { // && node.loc.start.column === object_1_gen_position.column){
                        
                        if(constantsModule.esprimaCFGLevelNodeTypes.includes(node.type)){
                            // only capture CFG level
                            object_i_ast_node = node;
                            found_i = true; 
                        }
                    }
                    if(!found_i_p1 && node && node.loc && node.loc.start.line === object_2_gen_position.line ) { // && node.loc.start.column === object_2_gen_position.column){
                        
                        if(constantsModule.esprimaCFGLevelNodeTypes.includes(node.type)){
                            object_i_p1_ast_node = node;
                            found_i_p1 = true;  
                          
                        }
                    }
                });
                */
                if(script_name in scriptLinetoCodeMap){

                    var map = scriptLinetoCodeMap[script_name];
                   
                    if(!found_i && object_1_gen_position.line in map) { 
                        
                            object_i_ast_node = map[object_1_gen_position.line];
                            found_i = true; 
                    }
                    if(!found_i_p1 && object_2_gen_position.line in map) { 

                            object_i_p1_ast_node = map[object_2_gen_position.line];
                            found_i_p1 = true;  
                    }               
                }
            
                if(found_i){

                    // filter out operations that still resolve to the same AST node
                    // e.g., built-in function calls like .slice()
                    if(!taintedCFGNodeIds.includes(object_i_ast_node._id)){

                        // DEBUG
                        // console.log('added', escodegen.generate(object_i_ast_node), object_i_ast_node._id, taintedCFGNodeIds)
                        taintedCFGNodes.push({
                            "object": object_1,
                            "node": object_i_ast_node,
                            "original": object_1_line,
                            "generated": object_1_gen_position.line
                        });
                        taintedCFGNodeIds.push(object_i_ast_node._id);

                    }

                }
                if(found_i_p1){

                    if(!taintedCFGNodeIds.includes(object_i_p1_ast_node._id)){

                        // DEBUG
                        // console.log('added 2', escodegen.generate(object_i_p1_ast_node), object_i_p1_ast_node._id, taintedCFGNodeIds)
                        taintedCFGNodes.push({
                            "object": object_2,
                            "node": object_i_p1_ast_node,
                            "original": object_2_line,
                            "generated": object_2_gen_position.line
                        });
                        taintedCFGNodeIds.push(object_i_p1_ast_node._id);  

                    }

                }
                if(object_2.operation === "PushSubscription.endpoint"){
                    taintedCFGNodes.push({
                        "object": object_2,
                        "node": null,
                    });          
                }
            } 

            if(taintedCFGNodes.length > 0){

                for(let m=0; m< taintedCFGNodes.length - 1; m++){

                    let toNodeObject = taintedCFGNodes[m];
                    let toNode = toNodeObject.node;
                    let toString = escodegen.generate(toNode);


                    let fromNodeObject = taintedCFGNodes[m + 1];
                  

                    DEBUG_FOXHOUND_TAINT_LOGS && console.log('--------');
                    DEBUG_FOXHOUND_TAINT_LOGS && console.log('location:', JSON.stringify({
                        "original": toNodeObject.original, 
                        "generated": toNodeObject.generated
                    }));


                    if(fromNodeObject.object.operation === "PushSubscription.endpoint"){

                        let node = toNode;
                        let semanticTypes = ["REQ_PUSH_SUB"];
                        
                        if(!(node._id in nodes)){
                            nodes[node._id] = semanticTypes;
                        }else{
                            nodes[node._id].push(...semanticTypes);
                        }                   

                        DEBUG_FOXHOUND_TAINT_LOGS && console.log("semanticTypes:", semanticTypes);
                        DEBUG_FOXHOUND_TAINT_LOGS && console.log('sink:', taintflow.sink);
                        DEBUG_FOXHOUND_TAINT_LOGS && console.log("node:", escodegen.generate(node));
                        DEBUG_FOXHOUND_TAINT_LOGS && console.log('--------');
                        break;

                    }


                    let fromNode = fromNodeObject.node;
                    // let fromString = escodegen.generate(fromNode);
                    
                    // find common variables between the two AST nodes 
                    // i.e., intersection of LHS of `fromNode` with all Identifiers of `toNode`
                    let dataflowVariables = getCommonTokensFromASTNodesForPDG(fromNode, toNode);
                    for(let dfVar of dataflowVariables){
                        
                        let edge_id = '' + fromNode._id + '_' + toNode._id + '_' + dfVar;
                        if(!edge_ids.includes(edge_id)){
                            edge_ids.push(edge_id);
                            edges.push({
                                fromId: fromNode._id,
                                toId: toNode._id,
                                relationLabel: "PDG_parentOf",
                                relationType: "DataFlow",
                                args: dfVar,  
                            });
                            DEBUG_FOXHOUND_TAINT_LOGS && console.log('PDG:', dfVar);
                        }
                    }

                    DEBUG_FOXHOUND_TAINT_LOGS &&  console.log('variables:', JSON.stringify(dataflowVariables));
                    DEBUG_FOXHOUND_TAINT_LOGS &&  console.log('sink:', taintflow.sink);
                    DEBUG_FOXHOUND_TAINT_LOGS && console.log('from:', escodegen.generate(fromNode));
                    DEBUG_FOXHOUND_TAINT_LOGS && console.log('to:', escodegen.generate(toNode));
                    DEBUG_FOXHOUND_TAINT_LOGS && console.log('--------');
                    
                }

            }

        }

        // destroy the sourcemap consumer
        smConsumer.destroy();

    } 

    // removing all indexes to free the memory 
    scriptLinetoCodeMap = {}

    return {
        "nodes": nodes,
        "edges": edges
    }

}


GraphBuilder.prototype.generateLineToMapIndex = async function(ast, script_name){

    var handler = function (node, recurse){
            
            var loc = node.loc.start.line;
            if(script_name in scriptLinetoCodeMap){
                scriptLinetoCodeMap[script_name][loc] = node
            }else{
                scriptLinetoCodeMap[script_name] = {};
                scriptLinetoCodeMap[script_name][loc] = node
            }
            walkes.checkProps(node, recurse);
    }

    walkes(ast, {
        DebuggerStatement: handler,
        ExpressionStatement: handler,
        VariableDeclaration: handler,
        FunctionDeclaration: handler,
        ReturnStatement: handler,
        LabeledStatement: handler,
        BreakStatement: handler,
        ContinueStatement: handler,
        IfStatement: handler,
        SwitchStatement: handler,
        WhileStatement: handler,
        DoWhileStatement: handler,
        ForStatement: handler,
        ForInStatemen: handler,
        ThrowStatement: handler,
        TryStatement: handler,
        WithStatement: handler,

    });


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

        const mainScope = scopeTree.scopes[0];
        const mainAST = mainScope.ast;

        /**
         * Call Graph (CG) Generation
         * Step 1: Function Map Generation + Identification of Function Alias Names
         */
        if(options.ipcg){

            DEBUG && console.log("starting IPCG functionMap generation.")
            
            var lastClassName = 'UNKNOWN';
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
                                else{
                                    // ALIAS CASE 1: var a = f1; or var a = obj1.f1; OR a = new Foo()
                                    // add function aliases to function Map
                                    var function_alias_name = variableDeclarator.id.name;
                                    if(variableDeclarator.init.type === 'Identifier'){
                                        var function_actual_name = variableDeclarator.init.name;
                                        if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                                            functionMap[function_alias_name] = functionMap[function_actual_name];
                                        }else{
                                            // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name)
                                            call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                        }
                                    }else if(variableDeclarator.init.type === 'MemberExpression'){

                                        var function_actual_name = getMemberExpressionAsString(variableDeclarator.init);
                                        if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                                            functionMap[function_alias_name] = functionMap[function_actual_name];
                                        }else{
                                            // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                                            call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                        }
                                    }
                                    else if(variableDeclarator.init.type === 'NewExpression'){

                                        var function_actual_name = variableDeclarator.init.callee.name;
                                        if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                                            functionMap[function_alias_name] = functionMap[function_actual_name];
                                        }else{
                                            // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                                            call_graph_alias_check.push([function_actual_name, function_alias_name]);
                                        }
                                    }

                                }
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
        
                                var key = escodegen.generate(node.left);
                                if(key.includes(".prototype.")){
                                    // Prototype-based function definitions
                                    // ClassName.prototype.FunctionName = function() {}; a.b.prototype.FunctionName = function(){}
                                    let parts  = key.split(".prototype.");
                                    var functionName = parts[1];
                                    var className = parts[0];
                                    functionMap[className + '.' + functionName] = getCallGraphFieldsForASTNode(node.right);
                                }
                                else{
                                    functionMap[key] = getCallGraphFieldsForASTNode(node.right);
                                }
                                
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
                                

                            if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
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

                            if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                                functionMap[function_alias_name] = functionMap[function_actual_name];
                            }else{
                                // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                                call_graph_alias_check.push([function_actual_name, function_alias_name]);
                            } 
                        }
                    }

                    // a = Foo(); or a.b = Foo()
                    else if(node.left && (node.left.type === "Identifier" || node.left.type==="MemberExpression") && node.right && node.right.type === "NewExpression"){
                        var className = node.right.callee.name;
                        var key = escodegen.generate(node.left);
                            
                        var function_actual_name = className;
                        var function_alias_name = key;

                        if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                            functionMap[function_alias_name] = functionMap[function_actual_name];
                        }else{
                            // consider the case where function_actual_name is part of a key in function map
                            // now node.right.callee.name is aliased with the function_alias_name MemberExpression
                            // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name)
                            call_graph_alias_check.push([function_actual_name, function_alias_name]);
                        }

                    }


                    walkes.checkProps(node, recurse);
                },
                //// Add function aliases to function Map
                //// ALIAS CASE 1: var a = f1; or var a = obj1.f1; OR a = new Foo()
                // variableDeclarator: function(node, recurse){

                //     if(node && node.id && node.id.name && node.init){
                //         var function_alias_name = node.id.name;
                //         if(node.init.type === 'Identifier'){
                //             var function_actual_name = node.init.name;
                //             if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                //                 functionMap[function_alias_name] = functionMap[function_actual_name];
                //             }else{
                //                 // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name)
                //                 call_graph_alias_check.push([function_actual_name, function_alias_name]);
                //             }
                //         }else if(node.init.type === 'MemberExpression'){

                //             var function_actual_name = getMemberExpressionAsString(node.init);
                //             if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                //                 functionMap[function_alias_name] = functionMap[function_actual_name];
                //             }else{
                //                 // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                //                 call_graph_alias_check.push([function_actual_name, function_alias_name]);
                //             }
                //         }
                //         else if(node.init.type === 'NewExpression'){

                //             var function_actual_name = node.init.callee.name;
                //             if(functionMap && objectHasOwnProperty(functionMap, function_actual_name) && !objectHasOwnProperty(functionMap, function_alias_name)){
                //                 functionMap[function_alias_name] = functionMap[function_actual_name];
                //             }else{
                //                 // checkFunctionMapForPartialAliasing(function_actual_name, function_alias_name);
                //                 call_graph_alias_check.push([function_actual_name, function_alias_name]);
                //             }
                //         }

                //     }
                //     walkes.checkProps(node, recurse);
                // },
                // class methods
                MethodDefinition: function(node, recurse){
                    if(node && node.key && node.key.name && node.value && node.value.type === "FunctionExpression"){
                        functionMap[lastClassName + '.' + node.key.name] = getCallGraphFieldsForASTNode(node.value);
                    }
                },
                ClassDeclaration: function(node, recurse){
                    var className = (node && node.id && node.id.name)? node.id.name: 'UNKNOWN';
                    lastClassName = className;
                    walkes.checkProps(node, recurse);
                }



            }); // END walkes for Call Graph 
            DEBUG && console.log("finished IPCG functionMap generation.")
        }
       
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

                DEBUG && console.log("CFG unrolling started");

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
                DEBUG && console.log("CFG unrolling finished");

                /**
                 *  Program Dependence Graph (PDG)
                 *  Def-Use Analysis for each intra-procedural AST scope
                 */
                DEBUG && console.log("PDG unrolling started");
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

                                // connect the PDG edges also to inner CFG-level nodes
                                if(pair.second.astNode && pair.second.astNode.type === "CallExpression"){
                                    /**
                                     * Example: y.x().then(()=> {call(source); });
                                     */
                                    
                                    var toId = getExpressionStmtLowsetCFGNode(pair.second.astNode, key.toString());
                                    if(toId){
                                        let record = {
                                            fromId: pair.first.uniqueId,
                                            toId: toId,
                                            relationLabel: "PDG_parentOf",
                                            relationType: "DataFlow",
                                            args: key.toString()
                                        };
                                        appendEdge(record); 
                                    }
                                }

                            }
                            else if(pair.first.uniqueId && pair.second.length &&  pair.second.length> 0){
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
                DEBUG && console.log("PDG unrolling finished");
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
        
        false && console.log(call_graph_alias_check);
        if(options.erddg || options.ipcg) {

            if (options.ipcg){
                
                DEBUG && console.log("started IPCG checks for alias functions");
                /*
                * The call `checkFunctionMapForPartialAliasing` is meant to:
                *  - Check function name aliasing: create entries in the functionMap for alias names
                *  - Handle the cases where a function verbatim or alias call site is before the position of the function definition in the code (i.e., hoisting function variable names)
                */
                if(CALL_GRAPH_PARTIAL_ALIASING_CUTOFF){ // for performance trade-off
                    let cutoff = 5000;
                    if(call_graph_alias_check.length < cutoff){  
                        await checkFunctionMapForPartialAliasing(call_graph_alias_check);    
                    }else{
                        await checkFunctionMapForPartialAliasing(call_graph_alias_check.slice(1, cutoff + 1));    
                    }
                }else{
                    await checkFunctionMapForPartialAliasing(call_graph_alias_check);   
                }

                false && console.log(Object.keys(functionMap));
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
                        if(modelGraph && modelGraph.length > 0){
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
                            }); // end forEach
                        }
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
                        // CASE 1: normal function call
                        if(functionMap && Object.hasOwnProperty.bind(functionMap)(''+callerName)){

                            var function_definition_node = functionMap[callerName];
                            var args = {};
                            for(var arg_i=0; arg_i<node.arguments.length; arg_i++){
                                var argumentNode = node.arguments[arg_i];
                                var argCode = escodegen.generate(argumentNode);
                                args[arg_i] = argCode;
                            }
                            let edge = {
                                fromId: '' + node._id,
                                toId: '' + function_definition_node._id,
                                relationLabel: "CG_parentOf",
                                relationType: "CallFlow",
                                args: (node.arguments.length)? args: ''
                            };
                            appendEdge(edge);
                        }
                        // CASE 2: function_argument_promise.then((param) => {  });
                        else if(node.callee.type === "MemberExpression" && node.callee.property && node.callee.property.type === "Identifier" && node.callee.property.name === 'then'){
                            if(node.arguments && node.arguments.length > 0){
                                
                                var arrow_function_expression = node.arguments[0];
                                var call_argument = node.callee.object? escodegen.generate(node.callee.object): '';
                                if(call_argument === ''){
                                    var args = {};
                                }else{
                                    var args = {0: call_argument};
                                }
                                let edge = {
                                    fromId: '' + node._id,
                                    toId: '' + arrow_function_expression._id,
                                    relationLabel: "CG_parentOf",
                                    relationType: "CallFlow",
                                    args: (Object.keys(args).length > 0)? args: ''
                                };
                                appendEdge(edge);
                            }
                        }
                        // CASE 3: optional_window.setTimeout('func()')
                        else if((node.callee.type === 'Identifier' && node.callee.name === "setTimeout") || (node.callee && node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === "window" && node.callee.property.name == "setTimeout")){
                            var function_call_string_node = node.arguments && node.arguments.length >0 ? node.arguments[0]: null;
                            if(function_call_string_node && function_call_string_node.type === 'Literal'){
                                
                                try{
                                    let function_call_program_node = esprimaParser.parseAST(function_call_string_node.value);
                                    let expr_stmt_node = function_call_program_node.body && function_call_program_node.body.length >0? function_call_program_node.body[0]: null;
                                    if(expr_stmt_node && expr_stmt_node.expression.type === 'CallExpression'){

                                        let call_expression = expr_stmt_node.expression;

                                        let function_name = call_expression.callee && call_expression.callee.type === 'Identifier'? call_expression.callee.name: escodegen.generate(call_expression.callee);

                                        if(function_name && functionMap && Object.hasOwnProperty.bind(functionMap)(''+function_name)){

                                            var function_definition_node = functionMap[function_name];
                                            var args = {};
                                            for(var arg_i=0; arg_i<call_expression.arguments.length; arg_i++){
                                                var argumentNode = call_expression.arguments[arg_i];
                                                var argCode = escodegen.generate(argumentNode);
                                                args[arg_i] = argCode;
                                            }
                                            let edge = {
                                                fromId: '' + node._id,
                                                toId: '' + function_definition_node._id,
                                                relationLabel: "CG_parentOf",
                                                relationType: "CallFlow",
                                                args: (Object.keys(args).length > 0)? args: ''
                                            };
                                            appendEdge(edge);
                                        }
                                    }
                                }catch{
                                    // PASS esprima parsing errors, e.g.,
                                    // TypeError: this.source.charCodeAt is not a function
                                }
                            }
                        } // END setTimeout branch
                        // CASE 4: obj.call(optional_this_arg, arg1, arg2); 
                        else if(node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === 'call'){
                            
                            let function_name = escodegen.generate(node.callee.object);
                            if(functionMap && Object.hasOwnProperty.bind(functionMap)(''+function_name)){

                                var function_definition_node = functionMap[function_name];
                                var args = {};
                                // start from i=1 in some cases because i=0 may be the `thisArg`
                                let arg_i = 0;
                                for(var i=0; i<node.arguments.length; i++){
                                    var argumentNode = node.arguments[i];
                                    var argCode = escodegen.generate(argumentNode);
                                    if(argCode === 'this' || argCode === 'null'){
                                        continue;
                                    }
                                    args[arg_i] = argCode;
                                    arg_i += 1;
                                }
                                let edge = {
                                    fromId: '' + node._id,
                                    toId: '' + function_definition_node._id,
                                    relationLabel: "CG_parentOf",
                                    relationType: "CallFlow",
                                    args: (Object.keys(args).length > 0)? args: ''
                                };
                                appendEdge(edge);
                            }
                        } // END call branch
                        // CASE 5: obj.apply(optional_this_arg, list_args); 
                        // here list_args[0] would the first argument;  list_args[1] the second, and so on
                        else if(node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier" && node.callee.property.name === 'apply'){
                            
                            let function_name = escodegen.generate(node.callee.object);
                            if(functionMap && Object.hasOwnProperty.bind(functionMap)(''+function_name)){

                                var function_definition_node = functionMap[function_name];
                                var args = {};
                                // start from i=1 in some cases because i=0 may be the `thisArg`
                                if(node.arguments.length > 1){
                                    let call_argument_node = node.arguments[1];
                                    if(call_argument_node.type === 'Identifier'){

                                        // iterate over the function definiton list of parametersc
                                        for(let arg_i=0; arg_i<function_definition_node.params.length; arg_i++){
                                            args[arg_i] = '' + call_argument_node.namec + '[' + arg_i + ']';
                                        }

                                        let edge = {
                                            fromId: '' + node._id,
                                            toId: '' + function_definition_node._id,
                                            relationLabel: "CG_parentOf",
                                            relationType: "CallFlow",
                                            args: (Object.keys(args).length > 0)? args: ''
                                        };
                                        appendEdge(edge);
                                    }

                                }
                            }
                        } // END apply branch

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

                                // connect the PDG edges also to inner CFG-level nodes
                                if(pair.second.astNode && pair.second.astNode.type === "CallExpression"){
                                    var toId = getExpressionStmtLowsetCFGNode(pair.second.astNode, key.toString())
                                    
                                    if(toId){
                                        let record = {
                                            fromId: pair.first.uniqueId,
                                            toId: toId,
                                            relationLabel: "PDG_parentOf",
                                            relationType: "DataFlow",
                                            args: key.toString()
                                        };
                                        appendEdge(record);                                         
                                    } 

                                }

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
