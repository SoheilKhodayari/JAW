/*
 * Validator for AST nodes
 */
function ASTValidator() {
}

Object.defineProperties(ASTValidator.prototype, {
	/**
	 * Default option object for AST parser
	 * @type {Object}
	 * @memberof ASTValidator.prototype
	 * @constant
	 */
	DEFAULT_OPTION_OBJECT: {
		value: {
			range: true,
			loc: true
		},
		enumerable: true
	}
});

/**
 * Check the range property of an AST node
 * @param {Object} node An AST node
 * @returns {boolean} True, if the node has a valid range property; false, otherwise
 */
ASTValidator.prototype.checkRangeProperty = function (node) {
	"use strict";
	return !!node && !!node.range && (node.range instanceof Array) && (node.range.length === 2) &&
		(typeof node.range[0] === 'number') &&
		(typeof node.range[1] === 'number');
};

/**
 * Check the loc property of an AST node
 * @param {Object} node An AST node
 * @returns {boolean} True, if the node has a valid loc property; false, otherwise
 */
ASTValidator.prototype.checkLocProperty = function (node) {
	"use strict";
	return !!node && !!node.loc &&
		(typeof node.loc === 'object') &&
		!!node.loc.start &&
		!!node.loc.end &&
		(typeof node.loc.start === 'object') &&
		(typeof node.loc.end === 'object') &&
		(typeof node.loc.start.line === 'number') &&
		(typeof node.loc.start.column === 'number') &&
		(typeof node.loc.end.line === 'number') &&
		(typeof node.loc.end.column === 'number');
};

/**
 * Check for the node is a valid AST node or not
 * @param   {Object}  node      AST node
 * @param   {Object}  [options] Option object
 * @returns {boolean} True if it's valid, false otherwise
 */
ASTValidator.prototype.check = function (node, options) {
    'use strict';
	var opt = options || this.DEFAULT_OPTION_OBJECT;
    return !!node && (!!node.type) &&
		((!opt.range)? true : this.checkRangeProperty(node)) &&
		((!opt.loc)? true : this.checkLocProperty(node));
};

/**
 * Validate for the object is an AST node or not
 * @param {Object} node    AST node
 * @param {Object} options Option object
 * @param {string} msg     Custom error message
 * @throws "Not an AST node"
 */
ASTValidator.prototype.validate = function (node, options, msg) {
    'use strict';
    if (!this.check(node, options)) {
        throw new Error(msg || 'Not an AST node');
    }
};

/**
 * Check for the AST node is a root of a page
 * @param   {Object}    node   AST node
 * @returns {boolean}   True, if it is; false, otherwise
 */
ASTValidator.prototype.isPageAST = function (node) {
	"use strict";
	return this.check(node) && node.type === 'Program';
};

/**
 * Check if the AST node is for a named function
 * @param   {Object}    node An AST node
 * @returns {boolean}   True, if it is; false, otherwise
 */
ASTValidator.prototype.isFunctionAST = function (node) {
	"use strict";
	return this.check(node) && node.type === 'FunctionDeclaration';
};

/**
 * Check if the AST node is for an anonymous function
 * @param   {Object}    node An AST node
 * @returns {boolean}   True, if it is; false, otherwise
 */
ASTValidator.prototype.isAnonymousFunctionAST = function (node) {
	"use strict";
	return this.check(node) && node.type === 'FunctionExpression';
};

/**
 * Validate the node is an AST of a page scope or not
 * @param   {Object}    node    An AST node
 * @param   {string}    msg     Custom error message
 * @throws  "Not an AST of a page scope" | Custom error message
 */
ASTValidator.prototype.validatePageAST = function (node, msg) {
	"use strict";
	if (!this.isPageAST(node)) {
		throw new Error(msg || 'Not an AST of a page scope');
	}
};

/**
 * Validate the node is an AST of a function scope or not
 * @param   {Object}    node    An AST node
 * @param   {string}    msg     Custom error message
 * @throws  "Not an AST of a function scope" | Custom error message
 */
ASTValidator.prototype.validateFunctionAST = function (node, msg) {
	"use strict";
	if (!this.isFunctionAST(node)) {
		throw new Error(msg || 'Not an AST of a function scope');
	}
};

/**
 * Validate the node is an AST of an anonymous function scope or not
 * @param   {Object}    node    An AST node
 * @param   {string}    msg     Custom error message
 * @throws  "Not an AST of an anonymous function scope" | Custom error message
 */
ASTValidator.prototype.validateAnonymousFunctionAST = function (node, msg) {
	"use strict";
	if (!this.isAnonymousFunctionAST(node)) {
		throw new Error(msg || 'Not an AST of an anonymous function scope');
	}
};

var validator = new ASTValidator();
module.exports = validator;
