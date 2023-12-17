
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
    HPG Exporter, supporting CSV and GraphML outputs


*/

/*
 * Reading source files
 */
var fs = require('fs');
var constantsModule = require('./../../lib/jaw/constants');
var pathModule = require('path');
var execSync = require('child_process').execSync;

/**
 * GraphExporter
 * @constructor
 */
function GraphExporter() {
}




// ------------------------------------------------------------------------ //
//          GraphML Export
// ------------------------------------------------------------------------ //


/**
 * Get XML for a given AST node
 * @param {dict} node
 * @returns {string} XML <node></node> entry
 */
function getNodeDataForGraphML(node){


    let id = JSON.stringify(node._id);

    // Cancel out cases like str = "\"\"" with sanitizer
    var sanitizer = new RegExp(/^[\\ \" \']+$/g);

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

    name = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")


    range = (sanitizer.test(range) || sanitizer.test(node.range))? '': range.replace(/\\/g, '').replace(/\"/g,'');
    loc = (sanitizer.test(loc) || sanitizer.test(node.loc))? '': loc.replace(/\\/g, '').replace(/\"/g,'');
    value = (sanitizer.test(value) || sanitizer.test(node.value))? '': value.replace(/\\/g, '').replace(/\"/g,'');
    raw = (sanitizer.test(raw) || sanitizer.test(node.raw))? '': raw.replace(/\\/g, '').replace(/\"/g,'');
    if(node.type !== 'Literal'){
        // @Fix for weird-input-data-no-newline-character-in-the-whole-buffer-4194304-not-supported 
        // see: https://stackoverflow.com/questions/56511859/weird-input-data-no-newline-character-in-the-whole-buffer-4194304-not-supporte
        value = '';
        raw = '';
    }
    async = (sanitizer.test(async) || sanitizer.test(node.async))? '': async.replace(/\\/g, '').replace(/\"/g,'');
    if(raw.indexOf('¿') > -1 || raw.indexOf('u00bf') > -1 || value.indexOf('¿') > -1 || value.indexOf('u00bf') > -1){
        raw= 'Literal_Spanish_Question_Symbol';
        value= 'Literal_Spanish_Question_Symbol';
        node.raw= raw;
        node.value = value;
    }

    // make sure the FILE path is exported as the `value` field
    if(node.type == 'Program') {
        value = node.value;
    }

    let nodeItem =  
    `<node id="${id}" labels=":ASTNode">
        <data key="Label">:ASTNode</data>
        <data key="Type">${type}</data>
        <data key="Kind">${kind}</data>
        <data key="Code">${name}</data>
        <data key="Range">${range}</data>
        <data key="Location">${loc}</data>
        <data key="Value">${value}</data>
        <data key="Raw">${raw}</data>
        <data key="Async">${async}</data>
        <data key="SemanticType">${semanticType}</data>
    </node>

    `
    return nodeItem;

}

/**
 * Get XML for Relation Edges
 * @param {dict} rel
 * @param {int} id: edge id
 * @returns {string} XML <edge></edge> entry
 */
function getRelationDataForGraphML(rel, id){

    let iid = '' + id;
    let fromId = JSON.stringify(rel.fromId);
    let toId =   JSON.stringify(rel.toId);
    let relationLabel = JSON.stringify(rel.relationLabel).replace(/\\"/g, '""');
    let relationType = JSON.stringify(rel.relationType).replace(/\\"/g, '""');
    let args = JSON.stringify(rel.args).replace(/\\"/g, '""') ;


    let relItem = 
    `<edge id="${iid}" source="${fromId}" target="${toId}" label=${relationLabel}>
        <data key="RelationLabel">${relationLabel}</data>
        <data key="RelationType">${relationType}</data>
        <data key="Arguments">${args}</data>
    </edge>
    `;

    return relItem;
}


/**
 * Export property graph to the graphML format
 * @param {dict} graph
 * @param {string} graphId
 * @param {string} outputFile 
 */
GraphExporter.prototype.exportToGraphML = function (graph, graphId, outputFile) {
    "use strict";

    var fp= fs.openSync(outputFile, 'w'); 


    var openingXMLSchema =
    `<?xml version="1.0" ?>
    <graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-element"
             xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.1/graphml.xsd">
    <key id="Label" for="node" attr.name="Label"/>
    <key id="Type" for="node" attr.name="Type" attr.type="string"></key>
    <key id="Kind" for="node" attr.name="Kind" attr.type="string"></key>
    <key id="Code" for="node" attr.name="Code" attr.type="string"></key>
    <key id="Range" for="node" attr.name="Range" attr.type="string"></key>
    <key id="Location" for="node" attr.name="Location" attr.type="string"></key>
    <key id="Value" for="node" attr.name="Value" attr.type="string"></key>
    <key id="Raw" for="node" attr.name="Raw" attr.type="string"></key>
    <key id="Async" for="node" attr.name="Async" attr.type="string"></key>
    <key id="SemanticType" for="node" attr.name="SemanticType" attr.type="string"></key>
    <key id="RelationLabel" for="edge" attr.name="RelationLabel"/>
    <key id="RelationType" for="edge" attr.name="RelationType"/>
    <key id="Arguments" for="edge" attr.name="Arguments"/>
    <graph id="${graphId}" edgedefault="directed">
    `;

    fs.writeSync(fp, openingXMLSchema);

    graph.nodes.forEach(n_i => {
         fs.writeSync(fp, getNodeDataForGraphML(n_i)); 
    })

    graph.edges.forEach( (e_i, i) => {
         fs.writeSync(fp, getRelationDataForGraphML(e_i, 'e' + i)); 
    })

    var closingXMLSchema = 
    `
    </graph>
    </graphml>
    `;
    fs.writeSync(fp, closingXMLSchema);
};



// ------------------------------------------------------------------------ //
//          CSV Export
// ------------------------------------------------------------------------ //
function getNodesHeaderCSVLine(){
    let d = constantsModule.outputCSVDelimiter;
    return `Id:ID${d}Type${d}Kind${d}Code${d}Range${d}Location${d}Value${d}Raw${d}Async${d}Label:LABEL${d}SemanticType\n`
}



function getRelsHeaderCSVLine(){
    let d = constantsModule.outputCSVDelimiter;
    return `FromId:START_ID${d}ToId:END_ID${d}RelationLabel:TYPE${d}RelationType${d}Arguments\n`
}


const uniqueItems = (arr) => [...new Set(arr)];

function getNodeCSVLine(node, foxhound_data_nodes){

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
    // make sure the FILE path is exported as the `value` field
    if(node.type == 'Program') {
        value = node.value;
    }

    let nodeLabel = 'ASTNode';
    if(constantsModule.esprimaCFGLevelNodeTypes.includes(node.type)){
        nodeLabel = nodeLabel+ ';CFGNode'
    }
    if(semanticType && semanticType.length > 0){
        nodeLabel = nodeLabel + ";" + semanticType.join(";"); // store semantic types as labels too for indexing in neo4j
    }

    var dyanmicSemTypes = [];
    if(node._id in foxhound_data_nodes){
        dyanmicSemTypes = uniqueItems(foxhound_data_nodes[node._id]);
    }
    if(dyanmicSemTypes && dyanmicSemTypes.length > 0){
        nodeLabel = nodeLabel + ";" + dyanmicSemTypes.join(";");
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
           "" + nodeLabel + `${d}` +
           "" + semanticType + "\n";
    

    return line;

}

function getRelsCSVLine(rel){

    let d = constantsModule.outputCSVDelimiter;

    let line = '' + JSON.stringify(rel.fromId) + `${d}` +
               JSON.stringify(rel.toId) + `${d}` +
               JSON.stringify(rel.relationLabel).replace(/\\"/g, '""') + `${d}` +
               JSON.stringify(rel.relationType).replace(/\\"/g, '""') + `${d}` +
               JSON.stringify(rel.args).replace(/\\"/g, '""') + '\n';

    return line;
}


/**
 * Export property graph to the CSV format (nodes.csv, rels.csv)
 * @param {dict} graph
 * @param {string} graphId
 * @param {string} outputFolder
 */
GraphExporter.prototype.exportToCSVDynamic= function (graph, dynamic_graph, graphId, outputFolder) {
    "use strict";

    const nodesFile = pathModule.join(outputFolder, constantsModule.ASTnodesFile);
    const relsFile = pathModule.join(outputFolder, constantsModule.ASTrelationsFile);
    const relsFileDynamic = pathModule.join(outputFolder, constantsModule.ASTrelationsFileDynamic);

    var fpNodes = fs.openSync(nodesFile, 'w'); 
    var fpEdges = fs.openSync(relsFile, 'w'); 
    var fpEdgesDynamic = fs.openSync(relsFileDynamic, 'w'); 


    if(dynamic_graph && dynamic_graph.nodes && dynamic_graph.edges){

        fs.writeSync(fpNodes, getNodesHeaderCSVLine());
        for(let n_i of graph.nodes){
             fs.writeSync(fpNodes, getNodeCSVLine(n_i, dynamic_graph.nodes)); 
        }

        fs.writeSync(fpEdges, getRelsHeaderCSVLine());
        for(let e_i of graph.edges){
             fs.writeSync(fpEdges, getRelsCSVLine(e_i)); 
        }

        fs.writeSync(fpEdgesDynamic, getRelsHeaderCSVLine());
        for(let e_i of dynamic_graph.edges){
             fs.writeSync(fpEdgesDynamic, getRelsCSVLine(e_i)); 
        }

    }else{

        fs.writeSync(fpNodes, getNodesHeaderCSVLine());
        for(let n_i of graph.nodes){
             fs.writeSync(fpNodes, getNodeCSVLine(n_i, [])); 
        }

        fs.writeSync(fpEdges, getRelsHeaderCSVLine());
        for(let e_i of graph.edges){
             fs.writeSync(fpEdges, getRelsCSVLine(e_i)); 
        }
    }

};

/**
 * Export property graph to the CSV format (nodes.csv, rels.csv)
 * @param {dict} graph
 * @param {string} graphId
 * @param {string} outputFolder
 */
GraphExporter.prototype.exportToCSV= function (graph, graphId, outputFolder) {
    "use strict";

    const nodesFile = pathModule.join(outputFolder, constantsModule.ASTnodesFile);
    const relsFile = pathModule.join(outputFolder, constantsModule.ASTrelationsFile);

    var fpNodes = fs.openSync(nodesFile, 'w'); 
    var fpEdges = fs.openSync(relsFile, 'w'); 


    fs.writeSync(fpNodes, getNodesHeaderCSVLine());
    for(let n_i of graph.nodes){
         fs.writeSync(fpNodes, getNodeCSVLine(n_i, [])); 
    }

    fs.writeSync(fpEdges, getRelsHeaderCSVLine());
    for(let e_i of graph.edges){
         fs.writeSync(fpEdges, getRelsCSVLine(e_i)); 
    }

};


GraphExporter.prototype.compressGraph = function (webpageFolder){

    const nodesFile = pathModule.join(webpageFolder, constantsModule.ASTnodesFile);
    const relsFile = pathModule.join(webpageFolder, constantsModule.ASTrelationsFile);
    const relsFileDynamic = pathModule.join(webpageFolder, constantsModule.ASTrelationsFileDynamic);


    // remove if a compressed version exists already
    if(fs.existsSync(nodesFile) && fs.existsSync(nodesFile + '.gz')){
        fs.rmSync(nodesFile + '.gz', { force: true, });
    }
    if(fs.existsSync(relsFile) && fs.existsSync(relsFile + '.gz')){
        fs.rmSync(relsFile + '.gz', { force: true, });
    }
    if(fs.existsSync(relsFileDynamic) && fs.existsSync(relsFileDynamic + '.gz')){
        fs.rmSync(relsFileDynamic + '.gz', { force: true, });
    }
    
    // recompress the files
    let cmd = `pigz ${nodesFile}`;
    execSync(cmd);

    cmd = `pigz ${relsFile}`;
    execSync(cmd);

    cmd = `pigz ${relsFileDynamic}`;
    execSync(cmd);
}

GraphExporter.prototype.decompressGraph = function (webpageFolder){

    const nodesFile = pathModule.join(webpageFolder, constantsModule.ASTnodesFile);
    const relsFile = pathModule.join(webpageFolder, constantsModule.ASTrelationsFile);
    const relsFileDynamic = pathModule.join(webpageFolder, constantsModule.ASTrelationsFileDynamic);

    let cmd = `pigz -d ${nodesFile}`;
    execSync(cmd);

    cmd = `pigz -d ${relsFile}`;
    execSync(cmd);

    cmd = `pigz -d ${relsFileDynamic}`;
    execSync(cmd);

}

GraphExporter.prototype.getNodesHeaderCSVLine = getNodesHeaderCSVLine;
GraphExporter.prototype.getRelsHeaderCSVLine = getRelsHeaderCSVLine;
GraphExporter.prototype.getRelsCSVLine = getRelsCSVLine;
GraphExporter.prototype.getNodeCSVLine = getNodeCSVLine;

var g_exporter = new GraphExporter();
module.exports = g_exporter;