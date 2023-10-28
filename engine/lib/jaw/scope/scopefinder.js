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
 * Find scopes from AST
 */
var walkes = require('walkes');

/**
 * ScopeFinder
 * @constructor
 */
function ScopeFinder() {
}

/**
 * Find function scopes of AST parsed from source
 * @param {Object} ast JS parsed AST
 * @returns {Object} Array of ASTs, each corresponds to global or function scope
 */
ScopeFinder.prototype.findScopes = function (ast) {
	'use strict';
	var scopes = [];
	function handleInnerFunction(astNode, recurse) {
		scopes.push(astNode);
		recurse(astNode.body);
	}

	walkes(ast, {
		Program: function (node, recurse) {
			scopes.push(node);
			for(let elem of node.body){
				recurse(elem);
			};
		},
		FunctionDeclaration: handleInnerFunction,
		FunctionExpression: handleInnerFunction,
		ArrowFunctionExpression: handleInnerFunction,
	});
	return scopes;
};

var finder = new ScopeFinder();
module.exports = finder;