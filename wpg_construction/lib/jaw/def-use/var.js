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
 * Model of variable
 */
var namespace = require('../../namespace'),
    internal = namespace();

/**
 * Create a model of variable
 * @param {String} name Name of the variable
 * @constructor
 * @throws {Object} when Var constructed with invalid value
 */
function Var(name) {
    'use strict';
    // Var.validate(name);
    internal(this)._name = name;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-methods */
/**
 * Check an object is Var or not
 * @param {Object} obj
 * @returns {Boolean}
 */
Var.isVar = function (obj) {
    'use strict';
    return obj instanceof Var;
};

/**
 * Check the name is a valid identifier
 * @param {String} name
 * @returns {Boolean}
 */
Var.isValidName = function (name) {
    'use strict';
    var identifierFormat = /^[_a-zA-Z][_a-zA-Z0-9]*$/i;
    return (typeof name === 'string' && identifierFormat.test(name));
};


/**
 * Validate the values for a Var is valid
 * @param {String} name Name of checked variable
 * @param {String} msg Custom error message
 * @throws {Object} When a values of the Var is invalid
 */
Var.validate = function (name, msg) {
    'use strict';
    if (!Var.isValidName(name)) {
        throw new Error(msg || 'Invalid value for a Var');
    }
};

/**
 * Validate an object is a Var or not
 * @param {Object} obj An object to be validated
 * @param {String} msg Custom error message
 * @throws {Object} When the object is not a Var
 */
Var.validateType = function (obj, msg) {
    'use strict';
    if (!Var.isVar(obj)) {
        throw new Error(msg || 'Not a Var');
    }
};
/* end-static-methods */

/* start-public-methods */
/**
 * Represent the object as string
 * @returns {String} The variable's identity
 */
Var.prototype.toString = function () {
    'use strict';
    return internal(this)._name;
};

/**
 * Convert the variable to JSON
 * @returns {Object} JSON formatted object
 */
Var.prototype.toJSON = function () {
	'use strict';
	return {
		"name": internal(this)._name
	};
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperty(Var.prototype, 'name', {
    get: function () {
        'use strict';
        return internal(this)._name;
    },
	enumerable: true
});
/* end-public-data-members */

module.exports = Var;