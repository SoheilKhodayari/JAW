/*
		Copyright (C) 2024  Soheil Khodayari, CISPA
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
		Lightweight module for identifying request hijacking sources/sinks
*/

const constantsModule = require('./../../engine/lib/jaw/constants');
const esprimaParser = require('./../../engine/lib/jaw/parser/jsparser');
const globalsModule = require('./globals.js');
const walkes = require('walkes');
const escodgen = require('escodegen');
var Set = require('./../../engine/lib/analyses/set');
const DEBUG = false;


// -------------------------------------------------------------------------------- //
// 		SemanticTypes
// -------------------------------------------------------------------------------- //


const WR_WIN_OPEN_URL = "WR_WIN_OPEN_URL";
const WR_WIN_LOC_URL = "WR_WIN_LOC_URL"; 
const WR_FRAME_URL = "WR_FRAME_URL"; 

// -------------------------------------------------------------------------------- //
// 		CLS
// -------------------------------------------------------------------------------- //

function requireUncached(module) {
		delete require.cache[require.resolve(module)];
		return require(module);
}

/**
 * OpenRedirectSourceSinkAnalyzer
 * @constructor
 */
function OpenRedirectSourceSinkAnalyzer() {
	"use strict";
	// re-instantiate every time
	this.api = require('./../../engine/model_builder');
	this.scopeCtrl = require('./../../engine/lib/jaw/scope/scopectrl');
	this.modelCtrl = require('./../../engine/lib/jaw/model/modelctrl');
	this.modelBuilder = require('./../../engine/lib/jaw/model/modelbuilder');
	this.scopeCtrl.clear();
	this.modelCtrl.clear();
}


// -------------------------------------------------------------------------------- //
// 		Utility
// -------------------------------------------------------------------------------- //

function hasIdentifierChildren(node){
	var flag = false;
	if(!node) return flag;
	if(node.type === "Identifier"){
		flag = true;
	}else{
		walkes(node, {
			Identifier: function(node, recurse){
				if(node.type === "Identifier"){
					flag = true;
				}
			}
		});
	}
	return flag;
}


function getIdentifierChildren(node){

	if(!node) return [];

	if(node.type === "Identifier"){
		return [node.name];
	}else{

		let identifier_names = new Set();
		walkes(node, {

			// CallExpression: function(node, recurse){
			// 	recurse(node.arguments);
			// },
			FunctionExpression: function(node,recurse){
				// we do not want function expression arguments
				// thus, do not recurse here
			},
			CallExpression: function(node, recurse){
				// we want the call expression arguments, e.g., JSON.stringify(x)
				// here, recurse only on the arguments
				for(let arg of node.arguments){
					recurse(arg);
				}
			},
			MemberExpression: function(node, recurse){
				// we only care about the member expression base objects
				// except when we have a `this.property` expression
				// where we are interested in the property part of the member expression
				let member_expression = escodgen.generate(node);
				if(member_expression.startsWith("this.")){ // handle ThisExpression
					member_expression = member_expression.replace('this.', '')
					let identifier_name = member_expression.substr(0, member_expression.indexOf('.'));
					if(!globalsModule.js_builtin.includes(identifier_name)){
						identifier_names.add(identifier_name);
					}
				}else{
					recurse(node.object); 
				}
			},
			ObjectExpression: function(node, recurse){
				// recurse on object expression values only
				// as keys cannot be tainted
				node.properties.forEach(prop=>{
					recurse(prop.value);
				})
			},
			Identifier: function(node, recurse){
				if(node.type === "Identifier"){
					if(!globalsModule.js_builtin.includes(node.name)){
						identifier_names.add(node.name);
					}
				}
			}
		});

		return [].concat(identifier_names.values()); // convert Set() to list with the spread operator
	}
}

// -------------------------------------------------------------------------------- //
// 		API
// -------------------------------------------------------------------------------- //

OpenRedirectSourceSinkAnalyzer.prototype.build_static_model = async function(code){

	let theSourceSinkAnalyzer = this;
	let language = constantsModule.LANG.js;
	await theSourceSinkAnalyzer.api.initializeModelsFromSource(code, language);
	await theSourceSinkAnalyzer.api.buildInitializedModels();
}


OpenRedirectSourceSinkAnalyzer.prototype.get_sources = async function(){

}


OpenRedirectSourceSinkAnalyzer.prototype.get_sinks = async function(){

	/*
	====================
			Sinks
	====================	
	
	window.location = TAINT;
	window.location.href = TAINT;
	window.location.replace(TAINT);
	window.location.assign(TAINT);
	window.open(url) = TAINT;
	frame.src = TAINT;

	*/

	var outputs = [];
	function appendSinkOutput(node, location, id, script_id, semantic_types, sink_code, sink_type, taint_possibility, sink_identifier_names){

		if(node.semanticType){
			node.semanticType.concat(['sink', sink_type]);
			node.semanticType.concat(semantic_types);
		}else{
			node.semanticType = ['sink', sink_type];
			node.semanticType.concat(semantic_types);
		}
		
		outputs.push({
			"location": location,
			"id": id,
			"script": script_id,
			"semantic_types": semantic_types,
			"sink_code": sink_code,
			"sink_type": sink_type,
			"taint_possibility": taint_possibility, // true if the sink has at least one Identifier (i.e., not just literals)
			"sink_identifiers": sink_identifier_names,
		});
	}

	let engine = this;
	let pageScopeTrees = engine.scopeCtrl.pageScopeTrees; 
	if(!pageScopeTrees){
		return [];
	}
	for await (let scopeTree of pageScopeTrees){
		const pageModels = engine.modelCtrl.getPageModels(scopeTree);
		const intraProceduralModels = pageModels.intraProceduralModels;
		const ast = scopeTree.scopes[0].ast;
		const script_id = ast.value;

		walkes(ast, {

			AssignmentExpression: function(node, recurse){
				// CASE: 
				// window.location = TAINT;
				// window.location.href = TAINT;
				// location.href = TAINT;
				if(node && node.left && node.left.type==="MemberExpression" && (
				 	(node.left.object.type==="Identifier" && (node.left.object.name==="window" || node.left.object.name==="win" || node.left.object.name==="w") && node.left.property.type==="Identifier" && node.left.property.name==="location") 
				 	|| 
				 	(node.left.object.type==="Identifier" && (node.left.object.name==="location") && node.left.property.type==="Identifier" && node.left.property.name==="href") 
				 	|| 
				 	(node.left.object.type==="MemberExpression" && node.left.object.object.type==="Identifier" && (node.left.object.object.name==="window" || node.left.object.object.name==="win" || node.left.object.object.name==="w") && node.left.object.property.type==="Identifier" && node.left.object.property.name==="location" && node.left.property.type==="Identifier" && node.left.property.name==="href")
				 	)   
				){

					let taint_argument = node.right;
					var taint_possibility = false;
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					var identifiers_object = {
						WR_WIN_LOC_URL : identifier_names
					}
					var taint_possibility_object = {
						WR_WIN_LOC_URL: taint_possibility
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_WIN_LOC_URL], escodgen.generate(node), "window.location", taint_possibility_object, identifiers_object);
				}
				else if (node && node.left && node.left.type==="MemberExpression" && (
				 	(node.left.object.type==="Identifier" && (node.left.object.name==="frame" || node.left.object.name==="iframe") && node.left.property.type==="Identifier" && node.left.property.name==="src"))   
				){

					let taint_argument = node.right;
					var taint_possibility = false;
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					var identifiers_object = {
						WR_FRAME_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_FRAME_URL: taint_possibility
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_FRAME_URL], escodgen.generate(node), "frame.src", taint_possibility_object, identifiers_object);
				}

				if(node && node.right && node.right.type === "FunctionExpression"){
					recurse(node.right)
				}
			},

			CallExpression: function(node, recurse){

				// CASE: window.open(URL)
				if(node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" &&
				 (node.callee.object.name === "window" || node.callee.object.name === "win" || node.callee.object.name === "w") &&
				  node.callee.property.type === "Identifier" && node.callee.property.name === "open"){


					var taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}

					var identifiers_object = {
						WR_WIN_OPEN_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_WIN_OPEN_URL: taint_possibility
					}		
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_WIN_OPEN_URL], escodgen.generate(node), "window.open()", taint_possibility_object, identifiers_object);			

				}
				// CASE: 
				// location.replace(TAINT);
				// location.assign(TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" &&
				 (node.callee.object.name === "location") &&
				  node.callee.property.type === "Identifier" && (node.callee.property.name === "replace" || node.callee.property.name === "assign")){

					var taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}

					var identifiers_object = {
						WR_WIN_LOC_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_WIN_LOC_URL: taint_possibility
					}		
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_WIN_LOC_URL], escodgen.generate(node), "window.location", taint_possibility_object, identifiers_object);			

				}
				// CASE:
				// window.location.replace(TAINT);
				// window.location.assign(TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.property.type==="Identifier" && (node.callee.property.name==="replace" || node.callee.property.name==="assign") &&
					node.callee.object.type === "MemberExpression" && node.callee.object.object.type === "Identifier" && (node.callee.object.object.name === "window" || node.callee.object.object.name === "win" || node.callee.object.object.name === "w") &&
					node.callee.object.property.type === "Identifier" && node.callee.object.property.name === "location"
				){

					var taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}

					var identifiers_object = {
						WR_WIN_LOC_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_WIN_LOC_URL: taint_possibility
					}		
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_WIN_LOC_URL], escodgen.generate(node), "window.location", taint_possibility_object, identifiers_object);			

				}
				// handle cases where there are multiple call expressions in a single statement
				// e.g., window.open(source).then(resp => console.log(resp))
				else{
					recurse(node.callee);
					for(let arg of node.arguments){
						recurse(arg);
					}
					
				}
			}


		});

	}

	return outputs;

}

module.exports = {
	OpenRedirectSourceSinkAnalyzer: OpenRedirectSourceSinkAnalyzer,
};