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
			node.body.forEach(function (elem) {
				recurse(elem);
			});
		},
		FunctionDeclaration: handleInnerFunction,
		FunctionExpression: handleInnerFunction
	});
	return scopes;
};

var finder = new ScopeFinder();
module.exports = finder;