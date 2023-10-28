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

// var semTypeDefinitions = require('./semantic_types');

// Semantic Types
// write 
const WR_WEBSOCKET_URL = "WR_WEBSOCKET_URL"; 
const WR_EVENTSOURCE_URL = "WR_EVENTSOURCE_URL";
const WR_REQ_URL = "WR_REQ_URL";
const WR_REQ_BODY = "WR_REQ_BODY";
const WR_REQ_HEADER = "WR_REQ_HEADER";
const WR_REQ_PARAMS = "WR_REQ_PARAMS"; // any parameter, including URL, body and header 
const WR_WIN_OPEN_URL = "WR_WIN_OPEN_URL";
const WR_WIN_LOC_URL = "WR_WIN_LOC_URL"; 

// requests
const REQ_NO_CSRF_TOKEN = "REQ_NO_CSRF_TOKEN";
const REQ_PUSH_SUB = "REQ_PUSH_SUB";
const REQ_PUSH_SUB_NO_CSRF_TOKEN = "REQ_PUSH_SUB_NO_CSRF_TOKEN"
const REQ_PUSH_SUB_WR_URL = "REQ_PUSH_SUB_WR_URL";



// -------------------------------------------------------------------------------- //
// 		CLS
// -------------------------------------------------------------------------------- //

function requireUncached(module) {
		delete require.cache[require.resolve(module)];
		return require(module);
}

/**
 * REQHijackSourceSinkAnalyzer
 * @constructor
 */
function REQHijackSourceSinkAnalyzer() {
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

REQHijackSourceSinkAnalyzer.prototype.build_static_model = async function(code){

	let theSourceSinkAnalyzer = this;
	let language = constantsModule.LANG.js;
	await theSourceSinkAnalyzer.api.initializeModelsFromSource(code, language);
	await theSourceSinkAnalyzer.api.buildInitializedModels();
}


REQHijackSourceSinkAnalyzer.prototype.get_sources = async function(){

}


REQHijackSourceSinkAnalyzer.prototype.get_sinks = async function(){

	/*
	====================
			Sinks
	====================	
	
    1. WebSocket URL poisoning (connection hijack)
		new WebSocket(TAINT, protocols);


	2. SSE URL/connection hijack
		new EventSource(TAINT, config)


	3. Client-side CSRF

		URL poisoning
		---------------
		XMLHttpRequest.open(method, url=TAINT);
		jQuery.ajax({url: TAINT, ... });
		$.ajax({url: TAINT, ... });
		fetch(url=TAINT, {});
		AsyncRequest(url=TAINT)
		asyncRequest(url=TAINT)
		window.open(url)
	
		Header posioning
		---------------
		XMLHttpRequest.setRequestHeader(header, value=TAINT)
	

		Body posioning
		--------------
		jQuery.ajax({body: TAINT, ... });
		$.ajax({body: TAINT, ... });


	4. HTTP Push connection hijack
		
		Stealing HTTP Push subscription data by controling the request endpoint;
		----------------
		XMLHttpRequest.open(method, url=TAINT)  w/ pushSubscriptionObj
		jQuery.ajax({url: TAINT, ... })  w/ pushSubscriptionObj
		$.ajax({url: TAINT, ... })  w/ pushSubscriptionObj
		fetch(url=TAINT, {})  w/ pushSubscriptionObj
		AsyncRequest(url=TAINT) w/ pushSubscriptionObj
		asyncRequest(url=TAINT) w/ pushSubscriptionObj


	5. HTTP Push CSRF
		
		HTTP Push subscription is sent in a request without an anti-CSRF token, enabling CSRF
		----------------
		XMLHttpRequest.open(method, url=whatever) w/ no csrf token
		jQuery.ajax({url: whatever, ... }) w/ no csrf token
		$.ajax({url: whatever, ... }) w/ no csrf token
		fetch(url=whatever, {}) w/ no csrf token
		AsyncRequest(url=whatever) w/ no csrf token
		asyncRequest(url=whatever) w/ no csrf token


	6. Hijacking top-level requests
		
	   Client-side open redirections and XSS with `javascript:` URIs
	   --------------------------
	   window.location = TAINT;
	   window.location.href = TAINT;
	   window.location.replace(TAINT);
	   window.location.assign(TAINT);


	7. Hijacking resource-level requests

	   Client-side XSS
	   ---------------
	   script.src = TAINT;

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
				// CASE: window.location (top-level request hijack)
				// window.location = TAINT;
				// window.location.href = TAINT;
				if(node && node.left && node.left.type==="MemberExpression" && (
				 	(node.left.object.type==="Identifier" && (node.left.object.name==="window" || node.left.object.name==="win" || node.left.object.name==="w") && node.left.property.type==="Identifier" && node.left.property.name==="location") 
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

				if(node && node.right && node.right.type === "FunctionExpression"){
					recurse(node.right)
				}
			},
			NewExpression: function(node, recurse){

				// CASE: WebSocket
				if(node.callee.type === "Identifier" && node.callee.name === "WebSocket"){
					let call_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(call_argument){
						identifier_names = getIdentifierChildren(call_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					var identifiers_object = {
						WR_WEBSOCKET_URL : identifier_names
					}
					var taint_possibility_object = {
						WR_WEBSOCKET_URL: taint_possibility
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_WEBSOCKET_URL], escodgen.generate(node), "new WebSocket()", taint_possibility_object, identifiers_object);
				} 
				// CASE: EventSource
				else if(node.callee.type === "Identifier" && node.callee.name === "EventSource"){
					let call_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(call_argument){
						identifier_names = getIdentifierChildren(call_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					var identifiers_object = {
						WR_EVENTSOURCE_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_EVENTSOURCE_URL: taint_possibility
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_EVENTSOURCE_URL], escodgen.generate(node), "new EventSource()", taint_possibility_object, identifiers_object);
				} 
			},

			CallExpression: function(node, recurse){

				// console.log("DEBUG", escodgen.generate(node));
				// CASE: [Request Forgery] fetch/asyncRequest(url=TAINT);
				if(node.callee.type === "Identifier" && node.callee.name && (node.callee.name === "fetch" || node.callee.name.toLowerCase() === "asyncrequest")){
					


					// check if the request URL is taintable
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
						WR_REQ_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_REQ_URL: taint_possibility
					}

					// check if the request body/headers are taintable as well
					if(node.arguments && node.arguments.length > 1){

						var req_options_node = node.arguments[1];
						// can be a pointer (i.e., Identifier) or an Object Expression with `headers` and `body` keys
						if(req_options_node){
							if(req_options_node.type === "Identifier"){
								identifiers_object[WR_REQ_PARAMS] = req_options_node.name;
								taint_possibility_object[WR_REQ_PARAMS] = true;
							} // end Identifier check
							else if(req_options_node.type === "ObjectExpression"){
								for(let prop of req_options_node.properties){
									if(prop.key && prop.key.type === "Identifier" && prop.key.name === "body"){
										var taint_possibility = false;
										var identifier_names = getIdentifierChildren(prop.value);
										if(identifier_names.length > 0){
											taint_possibility = true;
										}
										identifiers_object[WR_REQ_BODY] = identifier_names;
										taint_possibility_object[WR_REQ_BODY] = taint_possibility;
									}
									else if(prop.key && prop.key.type === "Identifier" && prop.key.name === "headers"){
										var taint_possibility = false;
										var identifier_names = getIdentifierChildren(prop.value); // check if there are any identifiers in the headers Object or not
										if(identifier_names.length > 0){
											taint_possibility = true;
										}
										identifiers_object[WR_REQ_HEADER] = identifier_names;
										taint_possibility_object[WR_REQ_HEADER] = taint_possibility;
									}
								}
							} // end ObjectExpression check
						} 
					} // end check for request body and headers
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, Object.keys(taint_possibility_object), escodgen.generate(node), node.callee.name.toLowerCase(), taint_possibility_object, identifiers_object);
				}

				// CASE: [Request Forgery] sendBeacon(url, data)
				else if(node.callee === "Identifier" && node.callee.name && node.callee.name === "sendBeacon"){

					// check if the request URL is taintable
					var taint_argument_url = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_argument_body = (node.arguments && node.arguments.length > 1)? node.arguments[1]: null;

					var taint_possibility_url = false;
					var taint_possibility_body = false;

					var identifier_names_url = [];
					var identifier_names_body = [];

					if(taint_argument_url){
						identifier_names_url = getIdentifierChildren(taint_argument_url);
						if(identifier_names_url.length > 0){
							taint_possibility_url = true;
						}
					}

					if(taint_argument_body){
						identifier_names_body = getIdentifierChildren(taint_argument_body);
						if(identifier_names_body.length > 0){
							taint_possibility_body = true;
						}
					}					

					var identifiers_object = {
						WR_REQ_URL: identifier_names_url,
						WR_REQ_BODY: identifier_names_body
					}
					var taint_possibility_object = {
						WR_REQ_URL: taint_possibility_url,
						WR_REQ_BODY:taint_possibility_body
					}

					
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, Object.keys(taint_possibility_object), escodgen.generate(node), "sendBeacon", taint_possibility_object, identifiers_object);

				}

				// CASE: [Request Forgery] $/jQuery.ajax(param={url: TAINT, ... });
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "ajax"){
					let call_argument = (node.arguments && node.arguments.length>0)? node.arguments[0]: null;
					
					var identifiers_object = {};
					var taint_possibility_object = {};


					if(call_argument && call_argument.type === "Identifier"){
						identifiers_object[WR_REQ_PARAMS] = getIdentifierChildren(call_argument);
						taint_possibility_object[WR_REQ_PARAMS] = true;

					}
					else if(call_argument && call_argument.type === "ObjectExpression"){
						for(let property of call_argument.properties){

							let property_key_node = property.key;

							if(property_key_node.type === 'Identifier'){

								if(property_key_node.name === "url"){

									var taint_possibility = false;
									var identifier_names = [];
									if(property.value){
										identifier_names = getIdentifierChildren(property.value);
										if(identifier_names.length > 0){
											taint_possibility = true;
										}
										
									}
									identifiers_object[WR_REQ_URL] = identifier_names;
									taint_possibility_object[WR_REQ_URL] = taint_possibility;
								}
								else if(property_key_node.name === "data"){

									var taint_possibility = false;
									var identifier_names = [];
									if(property.value){
										identifier_names = getIdentifierChildren(property.value);
										if(identifier_names.length > 0){
											taint_possibility = true;
										}
										
									}
									identifiers_object[WR_REQ_BODY] = identifier_names;
									taint_possibility_object[WR_REQ_BODY] = taint_possibility;
								}
								else if(property_key_node.name === "headers"){

									var taint_possibility = false;
									var identifier_names = [];
									if(property.value){
										identifier_names = getIdentifierChildren(property.value);
										if(identifier_names.length > 0){
											taint_possibility = true;
										}
										
									}
									identifiers_object[WR_REQ_HEADER] = identifier_names;
									taint_possibility_object[WR_REQ_HEADER] = taint_possibility;
								}
							}
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, Object.keys(taint_possibility_object), escodgen.generate(node), "$.ajax", taint_possibility_object, identifiers_object);
				} 

				// CASE: [Request Forgery] XMLHttpRequest/XDomainRequest.open(method, TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "open" && node.callee.object.name && 
				 	(node.callee.object.name === "XMLHttpRequest" || node.callee.object.name === "XDomainRequest" || node.callee.object.name.toLowerCase() === "xmlhttp" || 
				 	node.callee.object.name.toLowerCase() === "xhttp" || node.callee.object.name.toLowerCase() === "xhr" || node.callee.object.name.toLowerCase() === "xdr" || node.callee.object.name.toLowerCase() === "req")
				){
					var taint_argument = (node.arguments && node.arguments.length > 1)? node.arguments[1]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}

					var identifiers_object = {
						WR_REQ_URL: identifier_names
					}
					var taint_possibility_object = {
						WR_REQ_URL: taint_possibility
					}

					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_REQ_URL], escodgen.generate(node), "XMLHttpRequest.open()", taint_possibility_object, identifiers_object);
				} 
				// CASE: [Request Forgery] XMLHttpRequest.setRequestHeader(header, value=TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "setRequestHeader" && node.callee.object.name &&
				 	(node.callee.object.name === "XMLHttpRequest" || node.callee.object.name === "XDomainRequest" || node.callee.object.name.toLowerCase() === "xmlhttp" || 
				 	node.callee.object.name.toLowerCase() === "xhttp" || node.callee.object.name.toLowerCase() === "xhr" || node.callee.object.name.toLowerCase() === "xdr")
				){
					var taint_argument = (node.arguments && node.arguments.length > 1)? node.arguments[1]: null;
					
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}


					var identifiers_object = {
						WR_REQ_HEADER: identifier_names
					}
					var taint_possibility_object = {
						WR_REQ_HEADER: taint_possibility
					}

					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_REQ_HEADER], escodgen.generate(node), "XMLHttpRequest.setRequestHeader()", taint_possibility_object, identifiers_object);
				}
				// CASE: [Request Forgery] XMLHttpRequest.send(data)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "send" && node.callee.object.name &&
				 	(node.callee.object.name === "XMLHttpRequest" || node.callee.object.name === "XDomainRequest" || node.callee.object.name.toLowerCase() === "xmlhttp" || 
				 	node.callee.object.name.toLowerCase() === "xhttp" || node.callee.object.name.toLowerCase() === "xhr" || node.callee.object.name.toLowerCase() === "xdr")
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
						WR_REQ_BODY: identifier_names
					}
					var taint_possibility_object = {
						WR_REQ_BODY: taint_possibility
					}

					appendSinkOutput(node, node.loc.start.line, node._id, script_id, [WR_REQ_BODY], escodgen.generate(node), "XMLHttpRequest.send()", taint_possibility_object, identifiers_object);
				}
				// CASE: [Request Forgery] window.open(URL)
				else if(node.callee.type === "MemberExpression" && node.callee.object.type === "Identifier" &&
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
				// CASE: window.location (top-level request hijack)
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
				// e.g., fetch(source).then(resp => console.log(resp))
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
	REQHijackSourceSinkAnalyzer: REQHijackSourceSinkAnalyzer,
};