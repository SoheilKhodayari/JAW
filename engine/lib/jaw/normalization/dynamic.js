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
	Normalize a given JavaScript program. 
		- Instrumenting code to handle dynamic constructs with constant string parameters  
		- Converts to AST, replaces the target dynamic constructs, and then converts back to code.

*/




/*
 * Using esprima JS parser to parse AST
 */
var esprima = require('esprima');

/*
 * Use walkes/estraverse to traverse the graph
 */
var estraverse = require('estraverse');

/*
 * Use escodegen to convert back AST to code
 */
var escodegen = require('escodegen');  // API: escodegen.generate(node);

/*
 * Reading source files
 */
var fs = require('fs');


/**
 * Parse the code to AST
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
var parseAST = function (code, options) {
	'use strict';
	var optionObj = options || {range: true, loc: true};
	if (!optionObj.range) {
		optionObj.range = true;
	}
	if (!optionObj.loc) {
		optionObj.loc = true;
	}

	let counterId = 1;
	return esprima.parse(code, optionObj);
};


var normalizeDynamicConstructs = async function(input_program_path, output_program_path){

	// read the source
	var program = '' + fs.readFileSync(input_program_path);

	// parse to AST
	var ast = await parseAST(program);

	// traverse and replace
	estraverse.replace(ast, {
		enter: function (node, parent) {

			/* remove empty statements, i.e., semi-colon only statements */
			if(node.type === 'EmptyStatement'){
				return this.remove();
			}

			if(node.callee && node.callee.name === 'eval'){
				if(node.arguments && node.arguments.length){
					if(node.arguments[0].type === 'Literal'){

						 // replace the AST of the string value with top-level node
						var stringValue = node.arguments[0].value;
						var newAST = parseAST(stringValue);
						var newNode = {
							type: esprima.Syntax.Program,
							body: newAST.body,
						};
						return newNode; 
					}
				}
			}

			if(node.callee && node.callee.name === 'setTimeout'){
				if(node.arguments && node.arguments.length){
					if(node.arguments[0].type === 'Literal'){

						// replace setTimeout('code', time) to setTimeout(function(){ code }, time)
						// or just code
						var stringValue = node.arguments[0].value;
						var newAST = parseAST(stringValue);

						// var newArgumentNode = {
						// 	type: esprima.Syntax.FunctionExpression,
						// 	id: null,
						// 	params: [],
						// 	body: newAST.body,
						// };
						// var newNode = node;
						// newNode.arguments[0] = newArgumentNode;
						// return newNode;
						
						var newNode = {
							type: esprima.Syntax.Program,
							body: newAST.body,
						};
						return newNode; 
					}
				}
			}

		}
	});

	var code = await escodegen.generate(ast);
	fs.writeFileSync(output_program_path, code);
}


/*
 * Invoke the normalizer
 */
var input = process.argv[2];
var output = process.argv[3];
normalizeDynamicConstructs(input, output)











