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
	Normalize a given JavaScript program. 
		- Instrumenting code to handle dynamic constructs with constant string parameters  
		- Converts to AST, replaces the target dynamic constructs, and then converts back to code.

*/




/*
 * Using esprima JS parser to parse AST
 */
var esprima = require('esprima');

/*
 * Use walkes to traverse the graph
 */
var walkes = require('walkes');


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


// var main = async function(){

// 	var program_path = process.argv[2];
// 	var program = '' + fs.readFileSync(program_path);
// 	var ast = await parseAST(program);

//     await walkes(ast, {
//         CallExpression: function (node, recurse) {
//         	if(node.callee && node.callee.name === 'eval'){
//         		if(node.arguments && node.arguments.length){
//         			if(node.arguments[0].type === 'Literal'){
//         				var value = node.arguments[0].value; // replace the AST of this with top-level node
//         				var newASTPiece = parseAST(value);
//         				// var newASTNode = (newASTPiece.type == 'Program' )? newASTPiece.body: newASTPiece;
//         				node = newASTPiece.body[0];
//         				// recurse(newASTPiece);
//         				console.log(node);
//         				return node
//         			}
//         		}
//         	}

//         },
//     });

//     var code = await escodegen.generate(ast);
//     fs.writeFileSync(__dirname+'/example.dynamic.out', code);
// }


// /*
//  * Invoke the main
//  */
// main()











