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
 * Model for JavaScript scope
 */

var Map = require('core-js/es6/map'),
	Set = require('../../analyses/set'),
	varFactory = require('./../def-use/varfactory'),
    astValidator = require('./../parser/astvalidator'),
    Range = require('./../def-use/range'),
    rangeFactory = require('./../def-use/rangefactory');
var namespace = require('../../namespace'),
	internal = namespace();

/**
 * Create scope
 * @param {Object} ast AST root of the current scope
 * @param {string} name Name of current scope
 * @param {string} type Type of current scope
 * @param {Scope} [parent] Reference to parent scope
 * @constructor
 * @throws {Error} When the value is invalid
 */
function Scope(ast, name, type, parent) {
	'use strict';
	// Scope.validate(ast, name, type, parent);
	internal(this)._ast = ast;
	internal(this)._name = name;
	internal(this)._type = type;
	internal(this)._parent = parent || null;
    internal(this)._range = (!!internal(this)._ast)? rangeFactory.create(internal(this)._ast.range) : null;
	internal(this)._vars = new Map(); /// (name, Var)
	internal(this)._params = new Map(); /// (name, Var)
	internal(this)._paramNames = []; /// [names]
	internal(this)._namedFunctionVars = new Map();
	internal(this)._builtInObjectVars = new Map();
	internal(this)._children = []; /// [Scope]
	internal(this)._lastReachIns = new Set();

	if (!!parent) {
		parent.addChild(this);
	}

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-static-data-members */
Object.defineProperties(Scope, {
	/**
	 * Name of the domain scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_SCOPE_NAME: {
		value: '$DOMAIN',
		enumerable: true
	},
	/**
	 * Leading name of page/file scope, 
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_SCOPE_NAME: {
		value: '$FILE',
		enumerable: true
	},
	/**
	 * Leadin name of anonymous function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_SCOPE_NAME: {
		value: '$ANONYMOUS_FUN',
		enumerable: true
	},
	/**
	 * Type of function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	FUNCTION_TYPE: {
		value: 'function',
		enumerable: true
	},
	/**
	 * Type of anonymous function scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	ANONYMOUS_FUN_TYPE: {
		value: 'anonymousFunction',
		enumerable: true
	},
	/**
	 * Type of page scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	PAGE_TYPE: {
		value: 'page',
		enumerable: true
	},
	/**
	 * Type of domain scope
	 * @type {string}
	 * @memberof Scope
	 * @constant
	 */
	DOMAIN_TYPE: {
		value: 'domain',
		enumerable: true
	}
});

Object.defineProperties(Scope, {
	/**
	 * Scope types
	 * @type {Object}
	 * @memberof Scope
	 * @constant
	 */
	TYPES: {
		value: [Scope.FUNCTION_TYPE, Scope.ANONYMOUS_FUN_TYPE, Scope.PAGE_TYPE, Scope.DOMAIN_TYPE],
		enumerable: true
	}
});
/* end-static-data-members */

/* start-static-methods */
/**
 * Check the parent scope is valid or not (could be null/undefined)
 * @param {Scope} [parentScope] Parent scope
 * @returns {boolean} True if the parent scope is valid or empty
 */
Scope.isValidParent = function (parentScope) {
	'use strict';
	return (Scope.isScope(parentScope) || !parentScope);
};

/**
 * Check the object is a Scope or not
 * @param {Object} obj An object to be checked
 * @returns {boolean} True if the obj is a Scope object, false otherwise
 */
Scope.isScope = function (obj) {
	'use strict';
	return obj instanceof Scope;
};

/**
 * Check the scope name is valid or not
 * @param {string} name Name of the scope
 * @returns {boolean} True if it's valid, false otherwise
 */
Scope.isValidName = function (name) {
	'use strict';
	var normalFunctionNameForamt = /^[_a-zA-Z][_a-zA-Z0-9]*$/i;
	return (typeof name === 'string') &&
		(((name === Scope.DOMAIN_SCOPE_NAME) || (name.indexOf(Scope.PAGE_SCOPE_NAME) === 0) || (name.indexOf(Scope.ANONYMOUS_FUN_SCOPE_NAME) === 0)) ||
		normalFunctionNameForamt.test(name));
};

/**
 * Check if the type is a valid scope type
 * @param {string} type Type to be checked
 * @returns {boolean} True if the type is valid, false otherwise
 */
Scope.isValidType = function (type) {
	'use strict';
	return Scope.TYPES.indexOf(type) !== -1;
};

/**
 * Validate the initial value of the Scope is valid or not
 * @param {Object} ast AST root of the scope
 * @param {string} name Name of the scope
 * @param {string} type Type of the scope
 * @param {Scope} parent Parent scope
 * @param {string} [msg] Custom error message
 * @throws {Error} When a value is invalid
 */
Scope.validate = function (ast, name, type, parent, msg) {
	'use strict';
	if (!ast && type === Scope.DOMAIN_TYPE) {
		return;
	} else if (!astValidator.check(ast) ||
		!Scope.isValidName(name) ||
		!Scope.isValidType(type) ||
		!Scope.isValidParent(parent)) {
		throw new Error(msg || 'Invalid value for a Scope');
	}
};

/**
 * Validate the object is a Scope or not
 * @param {Object} obj An object to be validated
 * @param {string} [msg] Custom error message
 * @throws {Error} When the object is not a Scope
 */
Scope.validateType = function (obj, msg) {
	'use strict';
	if (!Scope.isScope(obj)) {
		throw new Error(msg || 'Not a Scope');
	}
};
/* end-static-methods */

/* start-public-methods */
/**
 * Check if the variable is declared in this scope with the same name
 * @param {string} name Name of the finding variable
 * @returns {boolean} True if it's found, false otherwise
 */
Scope.prototype.hasLocalVariable = function (name) {
	'use strict';
	if (typeof name === 'string') {
		return internal(this)._vars.has(name);
	}
	return false;
};

/**
 * Check the variable is available in current scope
 * @param {string} name Name of the finding variable
 * @returns {boolean} True if it's found, false otherwise
 */
Scope.prototype.hasVariable = function (name) {
	'use strict';
	var found = false;
	if (typeof name === 'string') {
		var current = this;
		while (!!current) {
			if (current.hasLocalVariable(name)) {
				found = true;
				break;
			} else {
				current = current.parent;
			}
		}
	}
	return found;
};

/**
 * Check if there is a named function with the specified name
 * @param {string} name
 * @returns {boolean} True, if there is one; false, otherwise
 */
Scope.prototype.hasNamedFunction = function (name) {
    "use strict";
    return internal(this)._namedFunctionVars.has(name);
};

/**
 * Check if there is a built-in object with the specified name
 * @param {string} name
 * @returns {boolean} True, if there is one; false, otherwise
 */
Scope.prototype.hasBuiltInObject = function (name) {
    "use strict";
    return internal(this)._builtInObjectVars.has(name);
};

/**
 * Get the local variable with its name
 * @param {string} name Name of the finding variable
 * @returns {Var|Null} Returns found variable or null value
 */
Scope.prototype.getLocalVariable = function (name) {
	'use strict';
	var foundVar = null;
	if (this.hasLocalVariable(name)) {
		foundVar = internal(this)._vars.get(name);
	}
	return foundVar;
};

/**
 * Get available variable with its name (recursive to parent scopes)
 * @param {string} name Name of the finding variable
 * @returns {Var|Null} Found variable, or null value
 */
Scope.prototype.getVariable = function (name) {
	'use strict';
	var foundVar = null;
	if (this.hasVariable(name)) {
		var current = this;
		while (!!current) {
			if (current.hasLocalVariable(name)) {
				foundVar = internal(current)._vars.get(name);
				break;
			} else {
				current = current.parent;
			}
		}
	}
	return foundVar;
};

/**
 * Get param name with parameter index
 * @param {number} index Index of finding parameter
 * @returns {string|Undefined} If found, returns the parameter's name, otherwise undefined
 */
Scope.prototype.getParamNameWithIndex = function (index) {
	'use strict';
	var param = null;
	if (typeof index === 'number' && (index >= 0 && index < internal(this)._paramNames.length)) {
		param = internal(this)._paramNames[index];
	}
	return param;
};

/**
 * Add a child to this Scope
 * @param {Scope} child Child scope
 */
Scope.prototype.addChild = function (child) {
	'use strict';
	if (Scope.isScope(child) && internal(this)._children.indexOf(child) === -1) {
		internal(this)._children.push(child);
		child.parent = this;
	}
};

/**
 * Check if the scope is a child of current scope
 * @param {Scope} scope A scope to be checked
 * @returns {boolean} True if it is, false otherwise
 */
Scope.prototype.hasChildScope = function (scope) {
	"use strict";
	return internal(this)._children.indexOf(scope) !== -1;
};

/**
 * Check the scope has the same parent as this scope ro not
 * @param {Scope} comparedScope Scope to be compared
 * @returns {boolean} True if it's the same, false otherwise
 */
Scope.prototype.isSiblingOf = function (comparedScope) {
	"use strict";
	if (comparedScope instanceof Scope) {
		return internal(this)._parent === comparedScope.parent;
	}
	return false;
};

/**
 * Check is the scope is a child of ascendant
 * @param {Scope} comparedScope Scope to be compared
 * @returns {boolean} True if there is the child from an ascendant, false otherwise
 */
Scope.prototype.hasAscendantContainingTheChild = function (comparedScope) {
	"use strict";
	var ascendant = internal(this)._parent,
		found = false;
	if (Scope.isScope(comparedScope)) {
		while (!!ascendant) {
			if (ascendant.hasChildScope(comparedScope)) {
				found = true;
				break;
			}
			ascendant = ascendant.parent;
		}
	}
	return found;
};

/**
 * Represent the Scope as string
 * @returns {string} Represented by its name
 */
Scope.prototype.toString = function () {
	'use strict';
	return this.name;
};

/**
 * Add inner function name as local variable
 * @param {string} functionName Inner function name
 */
Scope.prototype.addInnerFunctionVariable = function (functionName) {
	"use strict";
	if (!this.hasLocalVariable(functionName)) {
		var functionVariable = varFactory.create(functionName);
		internal(this)._namedFunctionVars.set(functionName, functionVariable);
		internal(this)._vars.set(functionName, functionVariable);
	}
};

/**
 * Add parameter as local variable
 * @param {string} paramName Parameter name
 */
Scope.prototype.addParameter = function (paramName) {
	"use strict";
	if (!this.hasLocalVariable(paramName)) {
		var parameterVar = varFactory.create(paramName);
		internal(this)._params.set(paramName, parameterVar);
		internal(this)._paramNames.push(paramName);
		internal(this)._vars.set(paramName, parameterVar);
	}
};

/**
 * Add local variables with its name
 * @param {string} name Variable name
 */
Scope.prototype.addLocalVariable = function (name) {
	"use strict";
	if (!this.hasLocalVariable(name)) {
		var variable = varFactory.create(name);
		internal(this)._vars.set(name, variable);
	}
};

/**
 * Add global variable
 * @param {string} name Variable name
 */
Scope.prototype.addGlobalVariable = function (name) {
	"use strict";
	var currentScope = this;
	while (currentScope.type !== Scope.PAGE_TYPE && !!currentScope.parent) {
		currentScope = currentScope.parent;
	}
	if (currentScope.type === Scope.PAGE_TYPE) {
		currentScope.addLocalVariable(name);
	}
};

/**
 * Set built-in objects as variables
 */
Scope.prototype.setBuiltInObjectVariables = function () {
	"use strict";
	if (this.builtInObjects.length > 0) {
		var thisScope = this;
		this.builtInObjects.forEach(function (builtIn) {
			var builtInVar = varFactory.create(builtIn.name);
			internal(thisScope)._builtInObjectVars.set(builtIn.name, builtInVar);
			internal(thisScope)._vars.set(builtIn.name, builtInVar);
		});
	}
};

/**
 * Get the scope where the variable is declared at
 * @param {string} name
 * @returns {null|Scope}
 */
Scope.prototype.getScopeWhereTheVariableDeclared = function (name) {
	'use strict';
	var foundScope = null;
	if (this.hasVariable(name)) {
		var current = this;
		while (!!current) {
			if (current.hasLocalVariable(name)) {
				break;
			}
			current = current.parent;
		}
		foundScope = current;
	}
	return foundScope;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(Scope.prototype, {
	/**
	 * AST root of the scope
	 * @type {Object}
	 * @memberof Scope.prototype
	 */
	ast: {
		get: function () {
			"use strict";
			return internal(this)._ast;
		},
		enumerable: true
	},
    /**
     * Range of this scope
     * @type {Range}
     * @memberof Scope.prototype
     */
    range: {
        get: function () {
            'use strict';
            return internal(this)._range;
        },
        set: function (range) {
	        'use strict';
            if (Range.isValidValue(range)) {
                internal(this)._range = new Range(range);
            }
        },
	    enumerable: true
    },
	/**
	 * Array of child scopes
	 * @type {Array}
	 * @memberof Scope.prototype
	 */
	children: {
		get: function () {
			'use strict';
			return [].concat(internal(this)._children);
		},
		enumerable: true
	},
	/**
	 * Name of the scope, which would composed by ascendants\' names
	 * @type {string}
	 * @memberof Scope.prototype
	 */
	name: {
		get: function () {
			'use strict';
			return (!internal(this)._parent)? internal(this)._name : (internal(this)._parent.name + '.' + internal(this)._name);
		},
		enumerable: true
	},
	/**
	 * Type of the scope
	 * @type {string}
	 * @memberof Scope.prototype
	 */
	type: {
		get: function () {
			'use strict';
			return internal(this)._type;
		},
		enumerable: true
	},
	/**
	 * Parent scope
	 * @type {Scope|Null}
	 * @memberof Scope.prototype
	 */
	parent: {
		get: function () {
			'use strict';
			return internal(this)._parent;
		},
		set: function (parent) {
			'use strict';
			if (Scope.isValidParent(parent)) {
				internal(this)._parent = parent;
			}
		},
		enumerable: true
	},
	/**
	 * Map of local variables
	 * @type {Map}
	 * @memberof Scope.prototype
	 */
	vars: {
		get: function () {
			'use strict';
			var map = new Map();
			internal(this)._vars.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		},
		enumerable: true
	},
	/**
	 * Map of parameters
	 * @type {Map}
	 * @memberof Scope.prototype
	 */
	params: {
		get: function () {
			'use strict';
			var map = new Map();
			internal(this)._params.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		},
		enumerable: true
	},
	/**
	 * Variables of declared inner functions
	 * @type {Map}
	 * @memberof Scope.prototype
	 */
	namedFunctionVars: {
		get: function () {
			'use strict';
			var map = new Map();
			internal(this)._namedFunctionVars.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		},
		enumerable: true
	},
	/**
	 * Array of build-in objects
	 * @type {Array}
	 * @memberof Scope.prototype
	 */
	builtInObjects: {
		value: [],
		writable: true,
		enumerable: true
	},
    /**
     * Variables of built-in objects
     * @type {Map}
     * @memberof Scope.prototype
     */
    builtInObjectVars: {
        get: function () {
            'use strict';
            var map = new Map();
            internal(this)._builtInObjectVars.forEach(function (val, key) {
                map.set(key, val);
            });
            return map;
        }
    },
	/**
	 * Latest reach in definitions of this scope
	 * @type {Set}
	 * @memberof Scope.prototype
	 */
	lastReachIns: {
		get: function () {
			"use strict";
			return new Set(internal(this)._lastReachIns);
		},
		set: function (reachIns) {
			"use strict";
			if (reachIns instanceof Set || reachIns instanceof Array) {
				internal(this)._lastReachIns = new Set(reachIns);
			}
		},
		enumerable: true
	},
    /**
     * Chain of scopes start from the current scope to the root scope
     * @type {Array}
     * @memberof Scope.prototype
     */
    scopeChain: {
        get: function () {
            "use strict";
            var chain = [];
            var currentScope = this;
            while (!!currentScope) {
                chain.push(currentScope);
                currentScope = currentScope.parent;
            }
            return chain;
        },
        enumerable: true
    }
});
/* end-public-data-members */

module.exports = Scope;
