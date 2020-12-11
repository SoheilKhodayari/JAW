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