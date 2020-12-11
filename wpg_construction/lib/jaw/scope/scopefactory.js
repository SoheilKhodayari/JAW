/*
 * Simple factory for Scope
 */
var PageScope = require('./pagescope'),
	DomainScope = require('./domainscope'),
	FunctionScope = require('./functionscope'),
	AnonymousFunctionScope = require('./anonymousfunctionscope');

/**
 * Simple factory for the Scope class
 * @constructor
 */
function ScopeFactory() {
}

/* start-public-methods */
/**
 * Reset the counter of number of anonymous function Scope
 */
ScopeFactory.prototype.resetAnonymousFunctionScopeCounter = function () {
    "use strict";
    AnonymousFunctionScope.resetCounter();
};

/**
 * Reset the counter of number of page scopes
 */
ScopeFactory.prototype.resetPageScopeCounter = function () {
	"use strict";
	PageScope.resetCounter();
};

/**
 * Factory method for page scopes
 * @param {Object} ast AST root of the page scope
 * @param {Scope} [parent] Parent scope
 * @returns {PageScope} A scope with page scope type and name
 */
ScopeFactory.prototype.createPageScope = function (ast, parent) {
    "use strict";
    return new PageScope(ast, parent);
};

/**
 * Factory method for the domain scope
 * @returns {DomainScope} A scope with domain scope type and name
 */
ScopeFactory.prototype.createDomainScope = function () {
    "use strict";
    return new DomainScope();
};

/**
 * Factory method for function scopes
 * @param {Object} ast AST root of the function scope
 * @param {String} funName Name of the function
 * @param {Scope} [parent] Parent scope
 * @returns {FunctionScope} A scope with function name and function scope type
 */
ScopeFactory.prototype.createFunctionScope = function (ast, funName, parent) {
    "use strict";
    return new FunctionScope(ast, funName, parent);
};

/**
 * Factory method for anonymous function scopes
 * @param {Object} ast AST root of an anonymous function scope
 * @param {Scope} [parent] Parent scope
 * @returns {AnonymousFunctionScope} A scope with indexed anonymous function scope name and anonymous function scope type
 */
ScopeFactory.prototype.createAnonymousFunctionScope = function (ast, parent) {
    "use strict";
    return new AnonymousFunctionScope(ast, parent);
};
/* end-public-methods */

var singleton = new ScopeFactory();
module.exports = singleton;