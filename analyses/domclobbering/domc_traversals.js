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
		Lightweight module for Detecting DOM clobbering sources/sinks
*/

const constantsModule = require('./../../engine/lib/jaw/constants');
const esprimaParser = require('./../../engine/lib/jaw/parser/jsparser');
const walkes = require('walkes');
const domcGlobalsModule = require('./domc_global_props');
const escodgen = require('escodegen');
var Set = require('./../../engine/lib/analyses/set');


function requireUncached(module) {
		delete require.cache[require.resolve(module)];
		return require(module);
}

const DEBUG = false;
/**
 * DOMClobberingTraversal
 * @constructor
 */
function DOMClobberingSourceSinkAnalyzer() {
	"use strict";
	// re-instantiate every time
	this.domcModelBuilder = require('./../../engine/model_builder');
	this.scopeCtrl = require('./../../engine/lib/jaw/scope/scopectrl');
	this.modelCtrl = require('./../../engine/lib/jaw/model/modelctrl');
	this.modelBuilder = require('./../../engine/lib/jaw/model/modelbuilder');
	this.scopeCtrl.clear();
	this.modelCtrl.clear();
}


// string to return for MemberExpression statements 
// that are not interesting for DOM clobbering
// For example: a[b[c>>1]]
const SKIP_THIS_MEMBER_EXPRESSION = "SKIP_THIS_MEMBER_EXPRESSION"; 

function getMemberExpressionString(id_list, node){

	let o = node.object;
	let p = node.property;

	// a.b, a[b]
	if(o.type === 'Identifier' && p.type === "Identifier"){
		id_list.push(o._id); 
		id_list.push(p._id); 
		let code = o.name + '.' + p.name;
		return { "code": code, "id_list": id_list };
	}

	// a.b.c
	if(o.type === "MemberExpression" && p.type === "Identifier"){

		id_list.push(p._id); 
		let output = getMemberExpressionString(id_list, o);
		let code = output.code + '.' + p.name;
		id_list = output.id_list;
		return { "code": code, "id_list": id_list };
	}

	if(o.type === "Identifier" && p.type === "MemberExpression"){

		id_list.push(o._id); 
		let output = getMemberExpressionString(id_list, p);
		let code = o.name + '[' + output.code + ']'; 
		id_list = output.id_list;
		return { "code": code, "id_list": id_list };
	}

	if(o.type === "Identifier" && p.type === "BinaryExpression"){

		id_list.push(o._id); 
		id_list.push(p.left._id); 
		id_list.push(p.right._id); 

		// BinaryExpressions not interesting for DOM clobbering
		let code = SKIP_THIS_MEMBER_EXPRESSION; 

		return { "code": code, "id_list": id_list };

	}

	return { "code": SKIP_THIS_MEMBER_EXPRESSION, "id_list": id_list };
}

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
			MemberExpression: function(node, recurse){
				// we only care about the member expression base objects
				// except when we have a `this.property` expression
				// where we are interested in the property part of the member expression
				let member_expression = escodgen.generate(node);
				if(member_expression.startsWith("this.")){ // handle ThisExpression
					member_expression = member_expression.replace('this.', '')
					let identifier_name = member_expression.substr(0, member_expression.indexOf('.'));
					if(!domcGlobalsModule.js_builtin.includes(identifier_name)){
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
					if(!domcGlobalsModule.js_builtin.includes(node.name)){
						identifier_names.add(node.name);
					}
				}
			}
		});

		return [].concat(identifier_names.values()); // convert Set() to list with the spread operator
	}
}


DOMClobberingSourceSinkAnalyzer.prototype.build_static_model = async function(code){

	let theDOMClobberingModule = this;
	let language = constantsModule.LANG.js;
	await theDOMClobberingModule.domcModelBuilder.initializeModelsFromSource(code, language);
	await theDOMClobberingModule.domcModelBuilder.buildInitializedModels();

}


DOMClobberingSourceSinkAnalyzer.prototype.run_domc_sink_traversals = async function (){

	/*
	====================
			Sinks
	====================	

		Note: in all the sink cases below, the TAINT parameter can actually
		 	  be a BinaryExpression, e.g., x + TAINT + y

		1- Open Redirect:  
			window.location = TAINT;
			location = TAINT;
		
			window.locatin.assign(TAINT);
			location.assign(TAINT);

			window.location.href.assign(TAINT);
			location.href.assign(TAINT);

			window.location.href = TAINT;
			location.href = TAINT;

			window.location.replace(TAINT);
			location.replace(TAINT);

			$(window.location).prop('href', TAINT);
			$(location).prop('href', TAINT);

			$(window.location).attr('href', TAINT);
			$(location).attr('href', TAINT);

		2- WebSocket URL poisoning (Hijacking WebSocket Connections)
			new WebSocket(TAINT, protocols);

		3- Link Manipulation
			someElement.src = TAINT;
			someElement.setAttribute('src', TAINT)
			someElement.src.assign(TAINT);

		4- Cookie Manipulation (STATE manipulation)
			document.cookie = TAINT;

		5- WebStorage Manipulation (STATE manipulation)
			localStorage.setItem(X, TAINT);
			sessionStorage.setItem(X, TAINT);

		6- Document Domain Manipulation
			document.domain = TAINT;
			document.domain.assign(TAINT);

		7- Client-side JSON injection (see: https://portswigger.net/web-security/dom-based/client-side-json-injection)
			JSON.parse(TAINT);
			jQuery.parseJSON(TAINT);
			$.parseJSON(TAINT);

		8- ReDos = Regex Denial of Service (see: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
			new RegExp(TAINT);

		9- Web-message Manipulation
			window.postMessage(TAINT, targetOrigin, [transfer])
			postMessage(TAINT, targetOrigin, [transfer])
	
		10- Request Forgery
			XMLHttpRequest.open(method, url=TAINT);
			XMLHttpRequest.setRequestHeader(header, value=TAINT)
			jQuery.ajax({url: TAINT, ... });
			$.ajax({url: TAINT, ... });
			fetch(url=TAINT, {});
			AsyncRequest(url=TAINT)
			asyncRequest(url=TAINT).

		11- Client-side XSS (list of sinks from: https://portswigger.net/web-security/cross-site-scripting/dom-based)
			someElement.innerHTML = TAINT
			someElement.outerHTML = TAINT

			someElement.insertAdjacentHTML(position, TAINT);
			eval(TAINT)
			document.write(TAINT)
			document.writeln(TAINT)
			jQuery.parseHTML(TAINT)
			$.parseHTML(TAINT)
			$(selector).html(TAINT);

			$(selector).append(TAINT);
			$(selector).prepend(TAINT);
			$(selector).add(TAINT);
			$(selector).insertAfter(TAINT);
			$(selector).insertBefore(TAINT);
			
			$(selector).after(TAINT);
			$(selector).before(TAINT);

			$(selector).wrap(TAINT);
			$(selector).wrapInner(TAINT);
			$(selector).wrapAll(TAINT);

			$(selector).has(TAINT);
			$(selector).index(TAINT);

			$(selector).replaceAll(TAINT);
			$(selector).replaceWith(TAINT);

			setTimeout(TAINT, ms);
			setInterval(TAINT, ms);
			new Function(TAINT, TAINT, ..., TAINT) -> any of its arguments can be tainted
			scriptNode.textContent = TAINT;

			
		12- Local File Read Path Manipulation
			new FileReader().readAsText(TAINT); 
	*/

	let theDOMClobberingModule = this;
	var outputs = [];

	// possible vulnerability types 
	const OPEN_REDIRECT_VULN = "open_redirect";
	const WEBSOCKET_URL_POISONING = "websocket_url_poisoning";
	const LINK_MANIPULATION = "link_manipulation";
	const COOKIE_MANIPULATION = "cookie_manipulation";
	const WEBSTORAGE_MANIPULATION = "web_storage_manipulation";
	const DOCUMENT_DOMAIN_MANIPULATION = "document_domain_manipulation";
	const CLIENT_SIDE_JSON_INJECTION = "client_side_json_injection";
	const REDOS_ATTACK = "regex_denial_of_service";
	const POST_MESSAGE_MANIPULATION = "post_message_manipulation";
	const FILE_READ_PATH_MANIPULATION = "file_read_path_manipulation";
	const REQUEST_FORGERY = "request_forgery";
	const CROSS_SITE_SCRIPTING = "cross_site_scripting";

	/*
	* List of $(selector).func() sinks. 
	* Fetched from: https://portswigger.net/web-security/cross-site-scripting/dom-based
	**/
	const XSS_JQ_SINK_FUNCTIONS = [
		"html", 		//	$(selector).html(TAINT);
		"append",		//	$(selector).append(TAINT);
		"prepend",		//	$(selector).prepend(TAINT);
		"add",			//	$(selector).add(TAINT);
		"insertAfter",	//	$(selector).insertAfter(TAINT);
		"insertBefore", //	$(selector).insertBefore(TAINT);
		"after",		//	$(selector).after(TAINT);
		"before",		//	$(selector).before(TAINT);
		"wrap",			//	$(selector).wrap(TAINT);
		"wrapInner",	//	$(selector).wrapInner(TAINT);
		"wrapAll",		//	$(selector).wrapAll(TAINT);
		"has",			//	$(selector).has(TAINT);
		"index",		//	$(selector).index(TAINT);
		"replaceAll",	//	$(selector).replaceAll(TAINT);
		"replaceWith"	//	$(selector).replaceWith(TAINT);
	];


	function appendSinkOutput(node, location, id, script_id, vuln, sink_code, sink_type, taint_possibility, sink_identifier_names){

		let taintSemanticType = (taint_possibility)? 'taintable': 'not_taintable';

		if(node.semanticType){
			node.semanticType.concat(['sink', sink_type, vuln, taintSemanticType]);
		}else{
			node.semanticType = ['sink', sink_type, vuln, taintSemanticType];
		}
		
		outputs.push({
			"location": location,
			"id": id,
			"script": script_id,
			"vuln": vuln,
			"sink_code": sink_code,
			"sink_type": sink_type,
			"taint_possibility": taint_possibility, // true if the sink has at least one Identifier (i.e., not just literals)
			"sink_identifiers": sink_identifier_names,
		});

	}

	let pageScopeTrees = theDOMClobberingModule.scopeCtrl.pageScopeTrees; 
	if(!pageScopeTrees){
		return [];
	}
	await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {
		let pageModels = theDOMClobberingModule.modelCtrl.getPageModels(scopeTree);
		let intraProceduralModels = pageModels.intraProceduralModels;
		let ast = scopeTree.scopes[0].ast;
		const script_id = ast.value;

		walkes(ast, {

			AssignmentExpression: function(node, recurse){
				// CASE: [Open Redirect] [window.]location.[property] = TAINT
				if( 
					(node.left.type === "MemberExpression" && escodgen.generate(node.left).startsWith("window.location")) || 
					(node.left.type === "Identifier" && node.left.name === "location")
				){
					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, OPEN_REDIRECT_VULN, escodgen.generate(node), "window.location", taint_possibility, identifier_names);
				} 

				// CASE: [XSS] someScript.textContent = TAINT;
				else if (node.left.type === "MemberExpression" && node.left.property.type === "Identifier" && node.left.property.name === "textContent"){
					
					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "script.textContent", taint_possibility, identifier_names);
				}


				// CASE: [Link Manipulation] someElement.src = TAINT;
				else if(node.left.type === "MemberExpression" && escodgen.generate(node.left).endsWith(".src")){
					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, LINK_MANIPULATION, escodgen.generate(node), "element.src", taint_possibility, identifier_names);
				}  

				// CASE: [Cookie Manipulation] document.cookie = TAINT;
				else if(node.left.type === "MemberExpression" && escodgen.generate(node.left).startsWith("document.cookie")){
					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, COOKIE_MANIPULATION, escodgen.generate(node), "document.cookie", taint_possibility, identifier_names);			
				} 

				// CASE: [Document Domain Manipulation] document.domain = TAINT;
				else if(node.left.type === "MemberExpression" && escodgen.generate(node.left).startsWith("document.domain")){
					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, DOCUMENT_DOMAIN_MANIPULATION, escodgen.generate(node), "document.domain", taint_possibility, identifier_names);			
				}

				// CASE: [XSS]: someElement.innerHTML/outerHTML = TAINT;
				else if(node.left.type === "MemberExpression" && (node.left.property.name === "innerHTML" || node.left.property.name === "outerHTML")){
					

					var taint_possibility = false;
					var identifier_names = getIdentifierChildren(node.right);
					if(identifier_names.length > 0){
						taint_possibility = true;
				   	}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "element." + node.left.property.name, taint_possibility, identifier_names);
				}else{
					// walk all child properties (also takes care of arrays)
					walkes.checkProps(node, recurse);
				}
			},


			CallExpression: function(node, recurse){
				// CASE: [XSS] [window.]eval(TAINT)
				if( (node.callee.type === "Identifier" && node.callee.name === "eval") || 
					(node.callee.type === "MemberExpression" && node.callee.object.name === "window" && node.callee.property.name === "eval")
				){
					var taint_possibility = false;
					let taint_argument = (node.arguments && node.arguments.length >0)? node.arguments[0]: null;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "eval", taint_possibility, identifier_names);
				}

				// CASE: [XSS] [window.]setTimeout/setInterval(TAINT)
				else if( (node.callee.type === "Identifier" && (node.callee.name === "setTimeout" || node.callee.name === "setInterval")) || 
						 (node.callee.type === "MemberExpression" && node.callee.object.name === "window" && (node.callee.property.name === "setTimeout" || node.callee.property.name === "setInterval"))
				){
					let taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					if(taint_argument.type !== "FunctionExpression" && taint_argument.type !== "ArrowFunctionExpression"){
						

						var taint_possibility = false;
						var identifier_names = [];
						if(taint_argument){
							identifier_names = getIdentifierChildren(taint_argument);
							if(identifier_names.length > 0){
								taint_possibility = true;
							}
						}

						var sink_element = "";
						if(node.callee.type === "Identifier"){
							sink_element = node.callee.name;
						}else{
							sink_element = node.callee.property.name;
						}
						appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), sink_element, taint_possibility, identifier_names);
					}
				}


				// CASE: [Request Forgery] fetch/asyncRequest(url=TAINT);
				else if(node.callee.type === "Identifier" && node.callee.name && (node.callee.name === "fetch" || node.callee.name.toLowerCase() === "asyncrequest")){
					var taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, REQUEST_FORGERY, escodgen.generate(node), node.callee.name.toLowerCase(), taint_possibility, identifier_names);

				} 

				// CASE: [Request Forgery] $/jQuery.ajax(param={url: TAINT, ... });
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "ajax"){
					let call_argument = (node.arguments && node.arguments.length>0)? node.arguments[0]: null;
					if(call_argument && call_argument.type === "ObjectExpression"){
						
						var taint_possibility = false;
						var identifier_names = [];

						call_argument.properties.forEach(property=> {
							if(property.key === "url"){
								if(property.value.name){
									identifier_names = getIdentifierChildren(property.value.name);
									if(identifier_names.length > 0){
										taint_possibility = true;
									}
									
								}
							}
						});
						appendSinkOutput(node, node.loc.start.line, node._id, script_id, REQUEST_FORGERY, escodgen.generate(node), "$.ajax", taint_possibility, identifier_names);
					}else if(call_argument && call_argument.type === "Identifier"){
						appendSinkOutput(node, node.loc.start.line, node._id, script_id, REQUEST_FORGERY, escodgen.generate(node), "$.ajax", true, [call_argument.name]);
					}
				} 

				// CASE: [Request Forgery] XMLHttpRequest/XDomainRequest.open(method, TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "open" && node.callee.object.name && 
				 	(node.callee.object.name === "XMLHttpRequest" || node.callee.object.name.toLowerCase() === "xmlhttp" || 
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
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, REQUEST_FORGERY, escodgen.generate(node), "XMLHttpRequest.open()", taint_possibility, identifier_names);
				} 

				// CASE: [Request Forgery] XMLHttpRequest.setRequestHeader(header, value=TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "setRequestHeader" && node.callee.object.name &&
				 	(node.callee.object.name === "XMLHttpRequest" || node.callee.object.name.toLowerCase() === "xmlhttp" || 
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

					appendSinkOutput(node, node.loc.start.line, node._id, script_id, REQUEST_FORGERY, escodgen.generate(node), "XMLHttpRequest.setRequestHeader()", taint_possibility, identifier_names);
				} 

				// CASE: [File Read Path Manipulation] new FileReader().readAsText(TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "readAsText" && node.arguments.length > 0){
					var taint_argument = (node.callee.arguments && node.callee.arguments.length > 0)? node.callee.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, FILE_READ_PATH_MANIPULATION, escodgen.generate(node), "new FileReader().readAsText()", taint_possibility, identifier_names);
				} 

				// CASE: [Web-message Manipulation] [window.]postMessage(TAINT, ...)
				else if((node.callee.type === "MemberExpression" && node.callee.object.name === "window" && node.callee.property.name === "postMessage") ||
				   (node.callee.type === "Identifier" && node.callee.name === "postMessage")){
					var taint_argument = (node.callee.arguments && node.callee.arguments.length > 0)? node.callee.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, POST_MESSAGE_MANIPULATION, escodgen.generate(node), "window.postMessage()", taint_possibility, identifier_names);
				} 

				// CASE: [Open Redirect] [window.]location[.property].assign(TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property && node.callee.property.name === "assign"){
					let member_expression = escodgen.generate(node.callee);
					if(member_expression.startsWith("window.location") || member_expression.startsWith("location")){
					 	let call_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
						var taint_possibility = false;
						var identifier_names = [];
						if(call_argument){
							identifier_names = getIdentifierChildren(call_argument);
							if(identifier_names.length > 0){
								taint_possibility = true;
							}
						}
					 	appendSinkOutput(node, node.loc.start.line, node._id, script_id, OPEN_REDIRECT_VULN, escodgen.generate(node), "window.location", taint_possibility, identifier_names);
					}
				} 

				// CASE: [Open Redirect] [window.]location.replace(TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property && node.callee.property.name === "replace"){
					let member_expression = escodgen.generate(node.callee);
					if(member_expression === "window.location.replace" || member_expression === "location.replace"){
					 	let call_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
						var taint_possibility = false;
						var identifier_names = [];
						if(call_argument){
							identifier_names = getIdentifierChildren(call_argument);
							if(identifier_names.length > 0){
								taint_possibility = true;
							}
						}
					 	appendSinkOutput(node, node.loc.start.line, node._id, script_id, OPEN_REDIRECT_VULN, escodgen.generate(node), "window.location", taint_possibility, identifier_names);		
					}
				} 

				// CASE: [Open Redirect] $([window.]location).prop/attr('href', TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.object.type === "CallExpression" && 
					   (node.callee.object.callee.name === "$" || node.callee.object.callee.name === "jQuery") &&
					   (node.callee.property.name === "prop" || node.callee.property.name === "attr") && node.arguments[0] && node.arguments[0].value === "href"
				){
					let selector = node.callee.object.arguments[0];
					let selector_code = escodgen.generate(selector);
					if(selector_code === "location" || selector_code === "window.location"){
						var taint_possibility = false;
						var identifier_names = [];
						var taint_argument = (node.callee && node.callee.object && node.callee.object.arguments)? node.callee.object.arguments[1]: null;
						if(taint_argument){
							identifier_names = getIdentifierChildren(taint_argument);
							if(identifier_names.length > 0){
								taint_possibility = true;
							}
						}
						appendSinkOutput(node, node.loc.start.line, node._id, script_id, OPEN_REDIRECT_VULN, escodgen.generate(node), "window.location", taint_possibility, identifier_names);
					}	
				} 

				// CASE: [Link Manipulation] someElement.src.assign(TAINT)
				else if(node.callee.type === "MemberExpression" && escodgen.generate(node.callee).endsWith(".src.assign")){
					var taint_possibility = false;
					
					let call_argument = (node.callee.arguments)? node.callee.arguments[0]: null;
					var identifier_names = [];
					if(call_argument){
						identifier_names = getIdentifierChildren(call_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, LINK_MANIPULATION, escodgen.generate(node), "element.src", taint_possibility,identifier_names);
				} 

				// CASE: [Link Manipulation] someElement.setAttribute('src', TAINT)
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "setAttribute" && node.arguments[0] && node.arguments[0].value === "src"){
					let taint_argument = (node.callee.arguments)? node.callee.arguments[1]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, LINK_MANIPULATION, escodgen.generate(node), "element.src", taint_possibility, identifier_names);
				} 

				// CASE: [WebStorage Manipulation] localStorage/sessionStorage.setItem(X, TAINT)
				else if(node.callee.type === "MemberExpression" && (node.callee.object.name === "localStorage" || node.callee.object.name === "sessionStorage") &&
					node.callee.property.name === "setItem")
				{
					let taint_argument = (node.arguments && node.arguments.length>0)? node.arguments[1]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, WEBSTORAGE_MANIPULATION, escodgen.generate(node), node.callee.object.name + '.setItem()', taint_possibility, identifier_names);
				} 

				// CASE: [Client-side JSON Injection] JSON.parse(TAINT); $/jQuery.parseJSON(TAINT);
				else if(node.callee.type === "MemberExpression" && 
					(node.callee.object.name === "JSON" || node.callee.object.name === "$" || node.callee.object.name === "jQuery") &&
					(node.callee.property.name === "parse" || node.callee.property.name === "parseJSON")
				){
					let taint_argument = (node.arguments && node.arguments.length>0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CLIENT_SIDE_JSON_INJECTION, escodgen.generate(node), "JSON.parse()", taint_possibility, identifier_names);
				}

				// CASE: [XSS] someElement.insertAdjacentHTML(position, TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.property.name === "insertAdjacentHTML"){
					let taint_argument = (node.arguments && node.arguments.length > 1)? node.arguments[1]: null;
					
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "element.insertAdjacentHTML()", taint_possibility, identifier_names);
				}

				// CASE: [XSS] document.write/writeln(TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.object.name === "document"  &&
					(node.callee.property.name === "write" || node.callee.property.name === "writeln"))
				{
					let taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "document."+ node.callee.property.name, taint_possibility, identifier_names);		
				}

				// CASE: [XSS] $/jQuery.parseHTML(TAINT);
				else if(node.callee.type === "MemberExpression" && node.callee.property.name ==="parseHTML" && 
					(node.callee.object.name === "jQuery" || node.callee.object.name === "$"))
				{
					let taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "$.parseHTML()", taint_possibility, identifier_names);	
				}

				// CASE: [XSS] $(selector).xss_sink_func(TAINT) where xss_sink_func is in XSS_JQ_SINK_FUNCTIONS
				else if(node.callee.type === "MemberExpression" && node.callee.object.type === "CallExpression" && 
					(node.callee.object.callee.name === "jQuery" || node.callee.object.callee.name === "$") &&
					XSS_JQ_SINK_FUNCTIONS.includes(node.callee.property.name)
				){
					let taint_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;
					var taint_possibility = false;
					var identifier_names = [];
					if(taint_argument){
						identifier_names = getIdentifierChildren(taint_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "$(element)." + node.callee.property.name, taint_possibility, identifier_names);	
				}
				else{
					// walk all child properties (also takes care of arrays)
					walkes.checkProps(node, recurse);
				}
			},

			NewExpression: function(node, recurse){
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
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, WEBSOCKET_URL_POISONING, escodgen.generate(node), "new WebSocket()", taint_possibility, identifier_names);
				} 

				// CASE: [ReDOS] new RegExp(TAINT);
				else if(node.callee.type === "Identifier" && node.callee.name === "RegExp"){
					let call_argument = (node.arguments && node.arguments.length > 0)? node.arguments[0]: null;

					var taint_possibility = false;
					var identifier_names = [];
					if(call_argument){
						identifier_names = getIdentifierChildren(call_argument);
						if(identifier_names.length > 0){
							taint_possibility = true;
						}
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, REDOS_ATTACK, escodgen.generate(node), "new RegExp()", taint_possibility, identifier_names);	
				}

				// CASE: [XSS] new Function(TAINT, ..., TAINT)
				else if(node.callee.type === "Identifier" && node.callee.name === "Function"){
					var taint_possibility = false;
					var identifier_names = []
					for(argument of node.arguments){
						identifier_names = identifier_names.concat(getIdentifierChildren(argument));
					}
					if(identifier_names.length> 0){
						taint_possibility = true;
					}
					appendSinkOutput(node, node.loc.start.line, node._id, script_id, CROSS_SITE_SCRIPTING, escodgen.generate(node), "new Function()", taint_possibility, identifier_names);
				}	
				else{
					// walk all child properties (also takes care of arrays)
					walkes.checkProps(node, recurse);
				}
			},


		}); // END Walkes

	}); // END scope

	return outputs;
}

DOMClobberingSourceSinkAnalyzer.prototype.run_domc_source_traversals = async function (){

	let theDOMClobberingModule = this;

	/*
		The outputs of this function is an array of possibly taintable DOM clobbering sources
		Each entry in the `outputs` variable contains the location of the code and the code
		string itself as the dictionary key, e.g.,
			code: {
				"id": "x"
				"script": 1.js
				"location": {start:{line:1, column:0}, end:{line:10, column:0}}
			}
	*/
	var outputs = {};

	function appendOutput(node, code, location, id, script){
		if(code.length > 3 ){ // TO CHECK: change to 2 ?

			if(node.semanticType){
				node.semanticType.concat(['source', 'domclobbering']);
			}else{
				node.semanticType = ['source', 'domclobbering'];
			}

			let value = {
						"location": location, 
						"id": id,
						"script": script
			};

			if(code in outputs && Array.isArray(outputs[code])){
				let flag = true;
				for(let item of outputs[code]){
					if(item.id === id){
						flag = false;
						break;
					}
				}
				if(flag){
					outputs[code].push(value);
				}
			}else{
				outputs[code] = [value];
			}
		}
	}

	const CFG_ENTRY_NODE = "Program";
	const MEMBER_EXPR_NODE = "MemberExpression";
	const IDENTIFIER_NODE = "Identifier";

	const GLOBAL_WINDOW_STR = "window";
	const GLOBAL_DOCUMENT_STR = "document";
	const GLOBAL_WINDOW_DOC_STR = "window.document";
	const GLOBAL_WINDOW_OBJECT_STR = "window.Object";
	const GLOBAL_OBJECT_STR = "Object";
	const GLOBAL_PROTO = "__proto__";
	const GLOBAL_PROTOTYPE = "prototype";


	let pageScopeTrees = theDOMClobberingModule.scopeCtrl.pageScopeTrees; 
	if(!pageScopeTrees){
		return [];
	}
	await pageScopeTrees.forEach(async function (scopeTree, pageIndex) {
		let pageModels = theDOMClobberingModule.modelCtrl.getPageModels(scopeTree);
		let intraProceduralModels = pageModels.intraProceduralModels;
		let ast = scopeTree.scopes[0].ast;

		var globalListFunctionArguments = new Set();
		walkes(ast, {

			FunctionExpression: function(node) {

				if(node.params && node.params.length){
					for(let funcParam of node.params){
						if(funcParam.type === "Identifier"){
							globalListFunctionArguments.add(funcParam.name);
						}
						// Note: Because of the destructuring feature of JS for function arguments, 
						// these arguments can be a ArrayPattern or ObjectPattern too.
						// in these cases, we need to remember each individual Identifier name included in these Pattern nodes
						// e.g., function f([a,b]){}
						else if(funcParam.type === "ArrayPattern"){
							funcParam.elements.forEach(element=> {
								globalListFunctionArguments.add(element.name);
							})
						}
						// e.g., function f({a:b,c:d}){}
						else if (funcParam.type === "ObjectPattern"){ 
							funcParam.properties.forEach(property=>{
								if(property.key && property.key.type === "Identifier"){
									globalListFunctionArguments.add(property.key.name);
								}
								if(property.value && property.value.type === "Identifier"){
									globalListFunctionArguments.add(property.value.name);
								}
							})
						}
					}
				}
			},
			FunctionDeclaration: function(node) {
				if(node.id && node.id.type === "Identifier"){
					globalListFunctionArguments.add(node.id.name);
				}
				if(node.params && node.params.length){
					for(let funcParam of node.params){
						if(funcParam.type === "Identifier"){
							globalListFunctionArguments.add(funcParam.name);
						}
						// Note: Because of the destructuring feature of JS for function arguments, 
						// these arguments can be a ArrayPattern or ObjectPattern too.
						// in these cases, we need to remember each individual Identifier name included in these Pattern nodes
						// e.g., function f([a,b]){}
						else if(funcParam.type === "ArrayPattern"){
							funcParam.elements.forEach(element=> {
								globalListFunctionArguments.add(element.name);
							})
						}
						// e.g., function f({a:b,c:d}){}
						else if (funcParam.type === "ObjectPattern"){ 
							funcParam.properties.forEach(property=>{
								if(property.key && property.key.type === "Identifier"){
									globalListFunctionArguments.add(property.key.name);
								}
								if(property.value && property.value.type === "Identifier"){
									globalListFunctionArguments.add(property.value.name);
								}
							})
						}
					}
				}
			},			
		})


		/*
		CASE 1: 
			Identify window.* and document.* variables 
				CASE 1.1: built-in APIs: limit to those that are clobberable in at least one browser
				CASE 1.2: custom APIs: limit to those that are not assigned a value beforehand;
		CASE 2:
			Identify variables that belong to the global Window object, but are referenced without it			
						Find `Identifier` OR `MemberExpression` node N (or the set of Ns) in each 
						CFG-level statement node such that the reachIn set of the statement
						does not contain a definition for N, i.e., previously undefined variables
						AND it is not an Identifier in the LHS of a VariableDeclaration statement, i.e., with var/let/const
						AND it is not a native js construct	
						AND the Identifier is not a FunctionDeclaration name, nor the FunctionDeclaration arguments	
						AND the Identifier and MemberExpression is not a CallExpression name
		*/

		// FIX needed: apparently there is a problem with reachIn definitions not being accurate
		// FIX: CFG graph bypasses arguments of FunctionDeclaration as it starts from the BlockStatement!!


		// keep FunctionExpression arguments for each scope tree, in order to be
		// able to prune out nested functions that use the argument of their top-level sourrounding
		// function in the DOM clobbering source detection results.
		let functionExpressionArgumentsInScope = new Set();
		let functionDeclarationArgumentsInScope = []; // CHECK: move this inside the intraProceduralModels.forEach after fixing the reachIn set?
		let functionDeclarationNamesInScope = new Set();
		let LHSAssignmentVariablesInScope = new Set();
		let VariableDeclarationsInScope = [];

		await intraProceduralModels.forEach(function (model, modelIndex) {
			let cfg = model.graph;
			if(cfg && cfg.length){
				let cfgNodes = cfg[2]; // all CFG nodes

				// console.log("new intraProceduralModel")

				for(let index in cfgNodes){
					let cfgNode = cfgNodes[index];
					// console.log(cfgNode.astNode && cfgNode.astNode.type);
					if(cfgNode.astNode){ //&& cfgNode.astNode.type !== CFG_ENTRY_NODE){

						let reachInNameSet = new Set();
						if(cfgNode.reachIns){
							cfgNode.reachIns.forEach(element => {
								reachInNameSet.add(element.variable.name);
							});						
						}


						let	visited_member_exp_ids = [];  // id of AST nodes visited for MemberExpressions and Identifiers for the current CFG node
						let lastFunctionDeclarationName = null;
						let lastCallExpressionNames = [];
						let lastVariableDeclarations = [];

						walkes(cfgNode.astNode, {

						FunctionExpression: function(node) {
							// note: we do not clearup the list here to handle nested function expressions
							// functionExpressionArgumentsInScope = [];
							if(node.params && node.params.length){
								for(let funcParam of node.params){
									if(funcParam.type === "Identifier"){
										functionExpressionArgumentsInScope.add(funcParam.name);
									}
									// Note: Because of the destructuring feature of JS for function arguments, 
									// these arguments can be a ArrayPattern or ObjectPattern too.
									// in these cases, we need to remember each individual Identifier name included in these Pattern nodes
									// e.g., function f([a,b]){}
									else if(funcParam.type === "ArrayPattern"){
										funcParam.elements.forEach(element=> {
											functionExpressionArgumentsInScope.add(element.name);
										})
									}
									// e.g., function f({a:b,c:d}){}
									else if (funcParam.type === "ObjectPattern"){ 
										funcParam.properties.forEach(property=>{
											if(property.key && property.key.type === "Identifier"){
												functionExpressionArgumentsInScope.add(property.key.name);
											}
											if(property.value && property.value.type === "Identifier"){
												functionExpressionArgumentsInScope.add(property.value.name);
											}
										})
									}
								}
							}
						},
						FunctionDeclaration: function(node) {
							lastFunctionDeclarationName = null; // clearup previous FunctionDeclaration names
							// note: we do not clearup the list here to handle nested function expressions
							// functionDeclarationArgumentsInScope = []; 
							if(node.id && node.id.type === "Identifier"){
								lastFunctionDeclarationName = node.id.name;
								functionDeclarationNamesInScope.add(node.id.name);
							}
							if(node.params && node.params.length){
								for(let funcParam of node.params){
									if(funcParam.type === "Identifier"){
										functionDeclarationArgumentsInScope.push(funcParam.name);
									}
									// Note: Because of the destructuring feature of JS for function arguments, 
									// these arguments can be a ArrayPattern or ObjectPattern too.
									// in these cases, we need to remember each individual Identifier name included in these Pattern nodes
									// e.g., function f([a,b]){}
									else if(funcParam.type === "ArrayPattern"){
										funcParam.elements.forEach(element=> {
											functionDeclarationArgumentsInScope.push(element.name);
										})
									}
									// e.g., function f({a:b,c:d}){}
									else if (funcParam.type === "ObjectPattern"){ 
										funcParam.properties.forEach(property=>{
											if(property.key && property.key.type === "Identifier"){
												functionDeclarationArgumentsInScope.push(property.key.name);
											}
											if(property.value && property.value.type === "Identifier"){
												functionDeclarationArgumentsInScope.push(property.value.name);
											}
										})
									}
								}
							}
						},
						CallExpression: function(node, recurse){
							lastCallExpressionNames = [];
							lastCallExpressionNames.push(escodgen.generate(node));

							// MUST recurse here on call arguments. because call arguments can 
							// be many things, e.g., ObjectExpression, whose value can be a FunctionExpression
							// whose argument need to be filtered out.
							// Plus, call arguments need to be considered for DOM clobbering themselves, 
							// if they are Identifiers
								node.arguments.forEach(arg=> {
									recurse(arg);
								})
						},
						VariableDeclaration: function(node, recurse){
							lastVariableDeclarations = []; // clear up previous VariableDeclaration reachIns
							node.declarations.forEach(declarator=> {
								if(declarator.id.name){ // = if declarator.id === "Identifier" (but not, e.g., ArrayPattern, like [a,b]=[1,2]);
									lastVariableDeclarations.push(declarator.id.name);
									VariableDeclarationsInScope.push(declarator.id.name);											
								}

								recurse(declarator.init); // recurse over the RHS for possible clobberable values
							});

						},
						AssignmentExpression: function(node, recurse){
							// TODO: add node.left to allVariableDeclarations too!
							if(node && node.left && (node.left.type === "Identifier") || (node.left.type === "MemberExpression")){
								LHSAssignmentVariablesInScope.add(escodgen.generate(node.left));
							}
							if(node && node.right){
								 // left hand-side (LHS) arguments are not clobberable.
								 // thus, only recurse on the RHS ones to prevent going over
								 // Identifier and MemberExpression nodes in the LHS
								recurse(node.right);
							}
						},
						ObjectExpression: function(node, recurse){
							if(node && node.properties && node.properties.length){
								// In ObjectExpression nodes like {a:b}, recurse only on
								//  the value b for DOM clobbering sources, but not the key a.
								node.properties.forEach(p=> {
									recurse(p.value);
								})
							}
						},
						Identifier: function(node) {
							// check if the identifier is not part of a MemberExpression,
							// AND is not the name of a FunctionDeclaration
							if(!visited_member_exp_ids.includes(node._id) && node.name !== lastFunctionDeclarationName){
									// CASE 2: custom variables that belong to the global
									// Window object, but are referenced without it
									let is_domc_source = true;
									let code = node.name;

									// CHECK: Window, Document, and Object constructs are not clobberable
									if(code === GLOBAL_DOCUMENT_STR|| code === GLOBAL_OBJECT_STR || code === GLOBAL_WINDOW_STR){
										is_domc_source = false;
									}


									// check if the current node is not an Identifier in the left hand-side (LHS) of a VariableDeclaration with either of the var/let/const kind
									// as well as the LHS of an AssignmentExpression
									if(is_domc_source){
										for(let varDecl of lastVariableDeclarations){
											if(code.startsWith(varDecl)){
												is_domc_source = false;
												break;
											}
										}												
									}
									if(is_domc_source){
										for(let lhs of LHSAssignmentVariablesInScope.values()){
											if(code.startsWith(lhs)){
												is_domc_source = false;
												break;
											}
										}												
									}

									// check if the current Identifier node is not a CallExpression
									if(is_domc_source){
										for(let callExp of lastCallExpressionNames){
											if(code.startsWith(callExp)){
												is_domc_source = false;
												break;
											}
										}
									}

									if(is_domc_source){
										for(let builtin_construct of domcGlobalsModule.js_builtin_constructs){
											if(code.startsWith(builtin_construct)){
												is_domc_source = false;
												break;
											}
										}
									}

									// CHECK: native js constructs are not clobberable
									if(is_domc_source){
										for(let nonclobberable_prop of domcGlobalsModule.global_nonclobberable_props){
											if(code.startsWith(nonclobberable_prop)){
												is_domc_source = false;
												break;
											}
										}
									}


									// CHECK: the Identifier is not a FunctionDeclaration name
									if(is_domc_source){
										if(functionDeclarationNamesInScope.values().includes(code)){
											is_domc_source = false;
										}
									}
									// check if the Identifier is not declared before via a VariableDeclaration (var/let/const)
									if(is_domc_source){
										if(VariableDeclarationsInScope.includes(code)){
											is_domc_source= false;
										}
									}

									// check if the current Identifier node is not a FunctionDeclaration/FunctionExpression argument
									if(is_domc_source){
										for(let funcArgument of functionDeclarationArgumentsInScope){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}
									if(is_domc_source){
										for(let funcArgument of functionExpressionArgumentsInScope.values()){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}
									if(is_domc_source){
										for(let funcArgument of globalListFunctionArguments.values()){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}

									// if
									//	(i) the code string is not Window and Document OR
									// 	(ii) the code is not nativeApi and nativeA
									// then, we have to check for reachIn definitions

									if(is_domc_source){

										// first, check if the reachIn check definitions are needed or not, i.e., (i) and (ii)
										let checkReachIns = true;

										// (i)
										if(code.startsWith(GLOBAL_WINDOW_STR) || code.startsWith(GLOBAL_DOCUMENT_STR)){
											checkReachIns = false;
										}

										// (ii)
										if(checkReachIns){
											for(let native_global_prop of domcGlobalsModule.all_global_props){
												if(code.startsWith(native_global_prop)){
													checkReachIns = false;
													break;
												}
											}						        			
										}
										// then, do the actual ReachIn definitions check when needed
										if(checkReachIns){
											DEBUG && console.log("reachIns", code, reachInNameSet.values())
											for(let reachedDefinition of reachInNameSet.values()){
												if(code.startsWith(reachedDefinition)){
													is_domc_source = false;
													break;
												}
											}						        				
										}
									}


									if(is_domc_source){
										let location = node.loc;
										appendOutput(node, code, location, node._id, ast.value);
									}
							}
						},
						MemberExpression: function (node) {
							if(!visited_member_exp_ids.includes(node._id)){ // TODO: check if this sanity check can be removed because we do not call the recurse function here
								visited_member_exp_ids.push(node._id);
								let memberExpressionObject = getMemberExpressionString(visited_member_exp_ids, node);
								visited_member_exp_ids = memberExpressionObject.id_list;
								let code = memberExpressionObject.code;;
								// CHECK: if the code contains one or more `necessary` open brackets,
								// the statement is not interesting for DOM clobbering
								// Note that the term `necessary` refers to the fact that 
								// an expression like `a[b[c]]` can be re-written as `a[b.c]`, thus
								// it only has one necessary brackets, while an expression like `a[b]` can
								// be re-written as `a.b` and has zero `neccessary` brackets.
								// The string created in our AST-to-code transformation (in function getMemberExpressionString)
								// only contains the necessary number of open brackets, thus we can count them.
								let countOpenBrackets = (code.match(/\[/g)||[]).length;

								if(!code.includes(SKIP_THIS_MEMBER_EXPRESSION) && countOpenBrackets === 0){
									let is_domc_source = true;
									
									// CHECK: Window, Document, and Object constructs are not clobberable
									if(code === GLOBAL_WINDOW_DOC_STR || code === GLOBAL_WINDOW_OBJECT_STR || code === GLOBAL_OBJECT_STR || code === GLOBAL_DOCUMENT_STR || code === GLOBAL_WINDOW_STR){
										is_domc_source = false;
									}


									// CHECK: prototype and __proto__ are not clobberable
									if(is_domc_source){
										if(code.includes(GLOBAL_PROTO) || code.includes(GLOBAL_PROTOTYPE)){
											is_domc_source = false;
										}
									}

									// CHECK: native js constructs are not clobberable
									if(is_domc_source){
										for(let builtin_construct of domcGlobalsModule.js_builtin_constructs){
											if(code.indexOf('.' + builtin_construct) >= 0 || code.indexOf(builtin_construct + '.') >= 0) {
												is_domc_source = false;
												break;
											}
										}
									}

									// CHECK: LHS assignment variables are not clobberable
									if(is_domc_source){
										for(let lhs of LHSAssignmentVariablesInScope.values()){
											if(code.startsWith(lhs)){
												is_domc_source = false;
												break;
											}
										}												
									}

									// CHECK: MemberExpression node shall not be a CallExpression, for which
									// clobbering can lead to breakage
									if(is_domc_source){
										for(let callExp of lastCallExpressionNames){
											if(code.startsWith(callExp)){
												is_domc_source = false;
												break;
											}
										}
									}


								// CHECK CASE 1.1: filter out non-clobberable attributes, e.g., document.body.appendChild 
								// non-clobberable means not clobberable in ANY browser
									if(is_domc_source){
										for(let prop of domcGlobalsModule.global_nonclobberable_props){
											let documentPropertyStart= GLOBAL_DOCUMENT_STR + '.' + prop;
											let windowPropertyStart= GLOBAL_WINDOW_STR + '.' + prop; 
											if(code.startsWith(windowPropertyStart) || code.startsWith(documentPropertyStart) || code.startsWith(prop)){
												is_domc_source = false;
												break;
											}			        			
										}
									}

									// CHECK: the current Identifier node is not a FunctionDeclaration/FunctionExpressionFunctionExpression argument
									if(is_domc_source){
										for(let funcArgument of functionDeclarationArgumentsInScope){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}
									if(is_domc_source){
										for(let funcArgument of functionExpressionArgumentsInScope.values()){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}
									if(is_domc_source){
										for(let funcArgument of globalListFunctionArguments.values()){
											if(code.startsWith(funcArgument)){
												is_domc_source = false;
												break;
											}
										}
									}

									// if 
									//	(i) the code string is not window.* and document.* OR
									// 	(ii) the code is not nativeApi and nativeA
									// then, we have to check for reachIn definitions
									

									if(is_domc_source){

										// first, check if the reachIn check definitions are needed or not, i.e., (i) and (ii)
										let checkReachIns = true;

										// (i)
										if(code.startsWith(GLOBAL_WINDOW_STR) || code.startsWith(GLOBAL_DOCUMENT_STR)){
											checkReachIns = false;
										}

										// (ii)
										if(checkReachIns){
											for(let native_global_prop of domcGlobalsModule.all_global_props){
												if(code.startsWith(native_global_prop)){
													checkReachIns = false;
													break;
												}
											}						        			
										}
										// then, do the actual ReachIn definitions check when needed
										if(checkReachIns){
											for(let reachedDefinition of reachInNameSet.values()){
												if(code.startsWith(reachedDefinition)){
													is_domc_source = false;
													break;
												}
											}						        				
										}
									}

									// check if the first Object of the MemberExpression is not declared before via a VariableDeclaration (var/let/const)
									if(is_domc_source){
										let memberExpressionObjectCode = code.substring(0, code.indexOf('.')); // find "o" in "o.p" expressions
										if(VariableDeclarationsInScope.includes(memberExpressionObjectCode)){
											is_domc_source= false;
										}
									}

									if(is_domc_source){
										let location = node.loc;
										appendOutput(node, code, location, node._id, ast.value);
									}

								} // END skip MemberExpression


							} // END visited_member_exp_ids including node id

						}, // END MemberExpression
					}); // END walkes
				
				// [...]

					} // END if
				} // END forloop over CFG nodes
			}
		});
	});
	
	return outputs;

}

module.exports = {
	DOMClobberingSourceSinkAnalyzer: DOMClobberingSourceSinkAnalyzer,
};