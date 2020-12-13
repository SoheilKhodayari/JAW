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
 * FunctionScope module
 */
var Scope = require('./scope'),
	astValidator = require('./../parser/astvalidator');

/**
 * FunctionScope
 * @param   {Object}  ast         AST root of the function scope
 * @param   {String}  name        Name of the function scope
 * @param   {Scope}   [parent]    Parent scope of the function scope
 * @constructor
 */
function FunctionScope(ast, name, parent) {
	"use strict";
	// FunctionScope.validate(ast, name, parent);
	Scope.call(this, ast, name, Scope.FUNCTION_TYPE, parent);
}

FunctionScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(FunctionScope.prototype, 'constructor', {
	value: FunctionScope
});

/* start-static-methods */
/**
 * Check the name of a FunctionScope is valid or not
 * @param   {string}    name    Name of the scope
 * @returns {boolean}   True, if it's valid; false, otherwise
 */
FunctionScope.isValidName = function (name) {
	"use strict";
	var normalFunctionNameForamt = /^[_a-zA-Z][_a-zA-Z0-9]*$/i;
	return normalFunctionNameForamt.test(name);
};

/**
 * Validate the value for a FunctionScope is valid or not
 * @param   {Object}    ast         An AST node
 * @param   {string}    name        Name of the scope
 * @param   {Scope}     [parent]    Parent scope
 * @param   {string}    [msg]       Custom error message
 * @throws  "Invalid value for a FunctionScope" | Custom error message
 */
FunctionScope.validate = function (ast, name, parent, msg) {
	"use strict";
	if (!astValidator.isFunctionAST(ast) ||
		!this.isValidName(name) ||
		!Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for a FunctionScope');
	}
};
/* end-static-methods */

module.exports = FunctionScope;