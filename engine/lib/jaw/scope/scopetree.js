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
 * ScopeTree module
 */
var Scope = require('./scope'),
	factoryScope = require('./scopefactory'),
    Range = require('./../def-use/range'),
	factoryRange = require('./../def-use/rangefactory');
var walkes = require('walkes'),
	Map = require('core-js/es6/map');
var namespace = require('../../namespace'),
	internal = namespace();

/**
 * ScopeTree inside a page
 * @constructor
 */
function ScopeTree() {
    'use strict';
    internal(this)._scopes = [];
    internal(this)._mapFromNameToScope = new Map(); /// (Range text, Scope)
    internal(this)._mapFromRangeToScope = new Map(); /// (Parent scope + Range text, Scope)
    internal(this)._root = null;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-private-methods */
/**
 * Recursively get the representation text of a function scope
 * @param   {Scope}     currentScope    Current function scope
 * @param   {number}    level           Level of the current scope located in the tree (>= 0)
 * @returns {string}    String representation
 * @memberof ScopeTree
 * @private
 */
function recursivelyGetScopeText(currentScope, level) {
	'use strict';
	var currentLevel = level || 0,
		representation = '';
	if (Scope.isScope(currentScope)) {
		representation += (currentLevel === 0)? '' : '\n';
		representation += getScopeRepresentation(currentScope, currentLevel);
		for(let val of currentScope.children){
			representation += recursivelyGetScopeText(val, currentLevel + 1);
		}
	}
	return representation;
}

/**
 * Get the representation of a function scope with indent
 * @param   {Scope}     scope A scope
 * @param   {number}    level Level of the current scope located in the tree to compute the indent
 * @returns {string}    String representation for a scope with indent
 * @memberof ScopeTree
 * @private
 */
function getScopeRepresentation(scope, level) {
	'use strict';
	var indentBasis = '  ',
		indent = '';
	for (var index = 0; index < level; ++index) {
		indent += indentBasis;
	}
	return indent + '+-' + scope;
}

/**
 * Add a Scope
 * @param {ScopeTree} tree This ScopeTree
 * @param {Scope} scope Scope object
 * @memberof ScopeTree
 * @private
 */
function addScope(tree, scope) {
	"use strict";
	if (Scope.isScope(scope)) {
		internal(tree)._scopes.push(scope);
		internal(tree)._mapFromNameToScope.set(scope.name, scope);
		internal(tree)._mapFromRangeToScope.set(scope.range.toString(), scope);
	}
}

/**
 * Initialize the scope tree
 * @param {ScopeTree} tree This ScopeTree
 * @param {Object} ast AST node of this page
 * @memberof ScopeTree
 * @private
 */
function initialization(tree, ast) {
	"use strict";
	var pageScope = factoryScope.createPageScope(ast);
	internal(tree)._root = pageScope;
	internal(tree)._scopes = [];
	internal(tree)._mapFromRangeToScope.clear();
	internal(tree)._mapFromNameToScope.clear();

	addScope(tree, pageScope);
}
/* end-private-methods */

/* start-test-block */
ScopeTree._testonly_ = {
	_addScope: addScope,
	_initialization: initialization,
	_recursivelyGetScopeText: recursivelyGetScopeText,
	_getScopeRepresentation: getScopeRepresentation
};
/* end-test-block */

/* start-static-methods */
/**
 * Check for the object is a ScopeTree or not
 * @param {Object} obj An object
 * @returns {boolean} True if the obj is a ScopeTree, false otherwise
 */
ScopeTree.isScopeTree = function (obj) {
    "use strict";
    return obj instanceof ScopeTree;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Build the ScopeTree with its AST nodes
 * @param {Object} ast AST of a page
 */
ScopeTree.prototype.buildScopeTree = function (ast) {
    'use strict';
    var theScopeTree = this;
	initialization(theScopeTree, ast);
	var currentScope = internal(theScopeTree)._root;

	function astProgramHandler(node, recurse) {
		for(let elem of node.body){
			currentScope = internal(theScopeTree)._root;
			recurse(elem);	
		}
	}

	function astFunctionDeclarationHandler(node, recurse) {
		var functionScope = factoryScope.createFunctionScope(node, node.id.name);
		currentScope.addChild(functionScope);
		addScope(theScopeTree, functionScope);
		
		for(let astNode of node.body.body){
			currentScope = functionScope;
			recurse(astNode);
		}

	}

	function astFunctionExpressionHandler(node, recurse) {

		if(node.body.body && node.body.body.length){

			var anonymousFunctionScope = factoryScope.createAnonymousFunctionScope(node);
			currentScope.addChild(anonymousFunctionScope);
			addScope(theScopeTree, anonymousFunctionScope);
		
			for(let astNode of node.body.body){
				currentScope = anonymousFunctionScope;
				recurse(astNode);
			};

		}
	}

    walkes(ast, {
        Program: astProgramHandler,
        FunctionDeclaration: astFunctionDeclarationHandler,
        FunctionExpression: astFunctionExpressionHandler,
        ArrowFunctionExpression: astFunctionExpressionHandler,
    });
};

/**
 * method for getting a function scope (Scope type) by comparing its range
 * @param {Range|Array} range Value for a Range
 * @returns {null|Scope} If it found, returns searched scope, otherwise, returns null
 */
ScopeTree.prototype.getScopeByRange = function (range) {
    'use strict';
    var found = null;
	if (Range.isValidValue(range)) {
		var rangeObj = factoryRange.create(range);
        found = internal(this)._mapFromRangeToScope.get(rangeObj.toString()) || null;
    }
	return found;
};

/**
 * Method for getting a function scope (Scope type) by comparing its scope name
 * @param {string} scopeName Name of the searched scope
 * @returns {null|Scope} If it found, returns searched scope, otherwise, returns null
 */
ScopeTree.prototype.getScopeByName = function (scopeName) {
    'use strict';
    var found = null;
	if (typeof scopeName === 'string') {
        found = internal(this)._mapFromNameToScope.get(scopeName) || null;
    }
	return found;
};

/**
 * Check the Scope is in the tree or not
 * @param {Scope|string|Range|Array} searchKey Key to search a scope, could be a Scope, name or a value of the scope\'s range
 * @returns {boolean} True, if the scope is existed; false otherwise
 */
ScopeTree.prototype.isRelatedToTheScope = function (searchKey) {
    'use strict';
	var found = false;
	if (Scope.isScope(searchKey)) {
		found = (internal(this)._scopes.indexOf(searchKey) !== -1);
	} else if (typeof searchKey === 'string') {
		found = !!this.getScopeByName(searchKey);
	} else if (Range.isValidValue(searchKey)) {
		found = !!this.getScopeByRange(searchKey);
	}
	return found;
};

/**
 * Represent the ScopeTree as a string
 * @returns {string} String representation of the ScopeTree
 */
ScopeTree.prototype.toString = function () {
    'use strict';
    return recursivelyGetScopeText(internal(this)._root, 0);
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(ScopeTree.prototype, {
	root: {
		get: function () {
			"use strict";
			return internal(this)._root;
		},
		enumerable: true
	},
	scopes: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._scopes);
		}
	}
});
/* end-public-data-members */

module.exports = ScopeTree;