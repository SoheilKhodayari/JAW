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
*/


/*
 * AnonymousFunctionScope module
 */
var Scope = require('./scope'),
	astValidator = require('./../parser/astvalidator');
var namespace = require('../../namespace'),
	internal = namespace();

/**
 * AnonymousFunctionScope
 * @param {Object}  ast         AST root of an anonymous function scope
 * @param {Scope}   [parent]    Parent scope of the anonymous function scope
 * @constructor
 */
function AnonymousFunctionScope(ast, parent) {
	"use strict";
	var index = AnonymousFunctionScope.numOfAnonymousFunctionScopes++;
	var name = Scope.ANONYMOUS_FUN_SCOPE_NAME + '_' + index;
	// AnonymousFunctionScope.validate(ast, parent);
	Scope.call(this, ast, name, Scope.ANONYMOUS_FUN_TYPE, parent);

	internal(this)._index = index;

	/* start-test-block */
	this._testonly_._index = internal(this)._index;
	/* end-test-block */
}

AnonymousFunctionScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(AnonymousFunctionScope.prototype, 'constructor', {
	value: AnonymousFunctionScope
});

/* start-static-data-member */
Object.defineProperties(AnonymousFunctionScope, {
	/**
	 * Number of the instances of AnonymousFunctionScope
	 * @type {number}
	 * @memberof AnonymousFunctionScope
	 */
	numOfAnonymousFunctionScopes: {
		value: 0,
		writable: true,
		enumerable: true
	}
});
/* end-static-data-member */

/* start-static-methods */
/**
 * Reset the counter of AnonymousFunctionScope
 */
AnonymousFunctionScope.resetCounter = function () {
	"use strict";
	this.numOfAnonymousFunctionScopes = 0;
};

/**
 * Validate the value of an AnonymousFunctionScope
 * @param   {Object}    ast         An AST node of this scope
 * @param   {Scope}     [parent]    Parent of the scope
 * @param   {string}    [msg]       Custom error message
 */
AnonymousFunctionScope.validate = function (ast, parent, msg) {
	"use strict";
	if (!astValidator.isAnonymousFunctionAST(ast) ||
		!Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for an AnonymousFunctionScope');
	}

};
/* end-static-methods */

/* start-public-data-members */
Object.defineProperties(AnonymousFunctionScope.prototype, {
	/**
	 * Index of the anonymous function scope
	 * @type {Number}
	 * @memberof AnonymousFunctionScope.prototype
	 */
	index: {
		get: function () {
			"use strict";
			return internal(this)._index;
		},
		enumerable: true
	}
});
/* end-public-data-members */

module.exports = AnonymousFunctionScope;