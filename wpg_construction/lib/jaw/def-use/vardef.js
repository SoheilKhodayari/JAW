/*
 * Model for variable and the corresponding definition
 */

var Var = require('./var'),
    Def = require('./def');
var namespace = require('../../namespace'),
    internal = namespace();

/**
 * A pair of variable and definition
 * @param {Object} variable Var object
 * @param {Object} definition Def object
 * @constructor
 */
function VarDef(variable, definition) {
    'use strict';
    VarDef.validate(variable, definition);
    internal(this)._var = variable;
    internal(this)._def = definition;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-public-data-members */
Object.defineProperties(VarDef.prototype, {
	/**
	 * Define the variable property and getter function
	 * @type {Var}
	 * @memberof VarDef.prototype
	 */
	variable: {
		get: function () {
			'use strict';
			return internal(this)._var;
		}
	},
	/**
	 * Define the definition property and getter function
	 * @type {Def}
	 * @memberof VarDef.prototype
	 */
	definition: {
		get: function () {
			'use strict';
			return internal(this)._def;
		}
	}
});
/* end-public-data-members */

/* start-static-methods */
/**
 * Validator for constructing a VarDef
 * @param {Var} variable Var object
 * @param {Def} definition Def object
 * @param {string} msg Custom error message
 * @throws {Error} when the variable or definition invalid
 */
VarDef.validate = function (variable, definition, msg) {
    'use strict';
    Var.validateType(variable, msg || 'Invalid Var for a VarDef');
    Def.validateType(definition, msg || 'Invalid Def for a VarDef');
};

/**
 * Check the object is a VarDef or not
 * @param {Object} obj
 * @returns {boolean}
 */
VarDef.isVarDef = function (obj) {
    'use strict';
    return obj instanceof VarDef;
};
/* end-static-methods */

/* start-public-methods */
/**
 * String representation of this pair of Var and Def
 * @returns {string}
 */
VarDef.prototype.toString = function () {
    'use strict';
    return '(' + internal(this)._var + ',' + internal(this)._def + ')';
};
/* end-public-methods */

module.exports = VarDef;