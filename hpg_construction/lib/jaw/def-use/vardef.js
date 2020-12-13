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