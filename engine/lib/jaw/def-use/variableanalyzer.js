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
 * VariableAnalyzer module, analyzing local variables in a scope
 */
var walkes = require('walkes');
var Scope = require('./../scope/scope');

/**
 * VariableAnalyzer
 * @constructor
 */
function VariableAnalyzer() {
}

/* start-private-methods */
/**
 * Set inner function variables of a scope
 * @param {Scope} scope A scope object
 * @private
 */
function setInnerFunctionVariables(scope) {
	"use strict";
	Scope.validateType(scope, 'Try to analyze function variable with non-Scope object');
    var ast = (scope.type === Scope.DOMAIN_TYPE)? null : ((scope.type === Scope.PAGE_TYPE)? scope.ast: scope.ast.body);
	walkes(ast, {
		FunctionDeclaration: function (node) {
			scope.addInnerFunctionVariable(node.id.name);
		}
	});
}

/**
 * Set parameters of a function scope
 * @param {Scope} scope A function scope
 * @private
 */
function setParameters(scope) {
	"use strict";
	Scope.validateType(scope, 'Try to analyze parameter with non-Scope object');
	function addParametersToScope(params, scope) {
		
        for(let param of params){
            scope.addParameter(param.name);
        }
	}

    if (scope.type === Scope.FUNCTION_TYPE || scope.type === Scope.ANONYMOUS_FUN_TYPE) {
        addParametersToScope(scope.ast.params, scope);
    }
}
/* end-private-methods */

/* start-public-methods */
/**
 * Set local variables of a scope
 * @param {Scope} scope A scope object
 */
VariableAnalyzer.prototype.setLocalVariables = function (scope) {
	"use strict";
	scope.setBuiltInObjectVariables();
	setInnerFunctionVariables(scope);
	setParameters(scope);

	var recursive = false;
	function recurseToFunctionBody(node, callback) {
		if (!recursive) {
			recursive = true;
			callback(node.body);
		}
	}

    var ast = (scope.type === Scope.DOMAIN_TYPE)? null : ((scope.type === Scope.PAGE_TYPE)? scope.ast: scope.ast.body);
	walkes(ast, {
        FunctionDeclaration: function () {},
        FunctionExpression: function () {},
		VariableDeclaration: function (node, recurse) {
            for(let declarator of node.declarations){
                recurse(declarator);
            }
		},
		VariableDeclarator: function (node) {
			scope.addLocalVariable(node.id.name);
		},
		AssignmentExpression: function (node) {
			if (node.left.type === 'Identifier' &&
				!scope.hasVariable(node.left.name)) {
				scope.addGlobalVariable(node.left.name);
			}
		},

        // ArrayExpression: function (node, recurse) { 

        // 	// PYTHON; CASE 1
        //     if(node.importtype && node.importtype == 'import'){
        //         // example: import module1 as y1, module2 as y2 
        //         let importModules = node.elements;
        //         let imports = [];
        //         if(importModules){
        //             importModules.forEach(importModule=> {
        //                 let o = {'module': importModule.name};
        //                 if(importModule.namespace && importModule.namespace.name){
        //                     o.alias = importModule.namespace.name;
        //                 }
        //                 imports.push(o);
        //             });
        //         }
        //         imports.forEach(importedItem=> {
        //             let definedVarName = (importedItem.alias)? importedItem.alias: importedItem.module;
        //             if(!scope.hasVariable(definedVarName)){
        //                 scope.addGlobalVariable(definedVarName);
        //             }
        //         });

        //     } // END IF
        //     // PYTHON; CASE 2
        //     if(node.importtype && node.importtype == 'from'){

        //         let importElements = node.elements;
        //         if(importElements){
        //             let importModuleEntry = {'module': '', 'objects': []};
        //             importElements.forEach(importEl => {
                        
        //                 if(importEl.part == 'from'){
        //                     importModuleEntry.module = importEl.name;
        //                 }else if(importEl.part == 'import'){

        //                     if(importEl.name){ 
        //                         let o = {'object': importEl.name };
        //                         if(importEl.namespace && importEl.namespace.name){
        //                             o.alias = importEl.namespace.name;
        //                         }
        //                         importModuleEntry.objects.push(o);
        //                     } 
        //                     else if (importEl.type == 'NewExpression'){
        //                         // handle special cases like: from x import a, b, c as x1; 
        //                         // filbert parser sees a, b, c as NewExpression arguments!! 
        //                         let aliasLastElement = (importEl.namespace)?importEl.namespace.name: null;
        //                         if(aliasLastElement){
        //                             if(importEl.arguments && importEl.arguments.length){
        //                                 importEl.arguments.forEach( (identiferNode, index)=> {
        //                                     let o = {'object': identiferNode.name };
        //                                     if(index == importEl.arguments.length-1){
        //                                         o.alias = aliasLastElement;
        //                                     }
        //                                     importModuleEntry.objects.push(o);
        //                                 });
        //                             }
        //                         }else{
        //                             if(importEl.arguments && importEl.arguments.length){
        //                                 importEl.arguments.forEach( (identiferNode)=> {
        //                                     let o = {'object': identiferNode.name };
        //                                     importModuleEntry.objects.push(o);
        //                                 });
        //                             }
        //                         }                
        //                     }
        //                 }
        //             }); 
        //             // END 
        //             importModuleEntry.objects.forEach(importedItem=> {
        //                 var definedVarName = (importedItem.alias)? importedItem.alias: importedItem.object;
	       //              if(!scope.hasVariable(definedVarName)){
	       //                  scope.addGlobalVariable(definedVarName);
	       //              }
        //             });
        //         }
        //     } // END IF
        // },

	});
};
/* end-public-methods */

var analyzer = new VariableAnalyzer();
module.exports = analyzer;