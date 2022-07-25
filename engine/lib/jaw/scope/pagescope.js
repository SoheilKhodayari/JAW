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
 * PageScope module
 */
var Scope = require('./scope'),
	astValidator = require('./../parser/astvalidator');
var namespace = require('../../namespace'),
	internal = namespace();

/**
 * PageScope
 * @param {Object} ast AST root of the scope
 * @param {Scope} [parent] Parent scope
 * @constructor
 */
function PageScope(ast, parent) {
	"use strict";

	var index = PageScope.numOfPageScopes++;
	var name = Scope.PAGE_SCOPE_NAME + '_' + index;
	// PageScope.validate(ast);
	Scope.call(this, ast, name, Scope.PAGE_TYPE, parent);

	internal(this)._index = index;

	/* start-test-block */
	this._testonly_._index = internal(this)._index;
	/* end-test-block */
}

PageScope.prototype = Object.create(Scope.prototype);
Object.defineProperty(PageScope.prototype, 'constructor', {
	value: PageScope
});

/* start-static-data-members */
Object.defineProperties(PageScope, {
	/**
	 * Number of PageScope instances
	 * @type {number}
	 * @memberof PageScope
	 */
	numOfPageScopes: {
		value: 0,
		writable: true,
		enumerable: true
	}
});
/* end-static-data-members */

/* start-static-methods */
/**
 * Reset the counter of PageScope
 */
PageScope.resetCounter = function () {
	"use strict";
	this.numOfPageScopes = 0;
};

/**
 * Validate the value of a PageScope
 * @param {Object} ast An AST node of this scope
 * @param {string} [msg] Custom error message
 */
PageScope.validate = function (ast, msg) {
	"use strict";
	if (!astValidator.isPageAST(ast)) {
		throw new Error(msg || 'Invalid value for a PageScope');
	}

};
/* end-static-methods */

/* start-public-data-members */
Object.defineProperties(PageScope.prototype, {
	/**
	 * Index of the page scope
	 * @type {Number}
	 * @memberof PageScope.prototype
	 */
	index: {
		get: function () {
			"use strict";
			return internal(this)._index;
		},
		enumerable: true
	},
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof PageScope.prototype
	 */
	builtInObjects: {
		value: [
				{name: "window", def: "htmlDom"},
				{name: "document", def: "htmlDom"},
				{name: "String", def: "object"},
				{name: "Number", def: "object"},
				{name: "Boolean", def: "object"},
				{name: "Array", def: "object"},
				{name: "Map", def: "object"},
				{name: "WeakMap", def: "object"},
				{name: "Set", def: "object"},
				{name: "Date", def: "object"},
				{name: "console", def: "object"}
        ],
        writable: true,
		enumerable: true
	}
});
/* end-public-data-members */

module.exports = PageScope;