/*
 * Simple structure of Def-Use Pair 
 */
var Pair = require('./pair'),
    FlowNode = require('../../esgraph/flownode');

/**
 * Construct the def-use pair
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @constructor
 */
function DUPair(def, use) {
    'use strict';
    // DUPair.validate(def, use);
    Pair.call(this, def, use);
}

DUPair.prototype = Object.create(Pair.prototype);

/**
 * Check for the def and use are valid or not
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @returns {boolean} True, if the values are valid; false
 */
DUPair.isValidDUPair = function (def, use) {
    'use strict';
    return FlowNode.isFlowNode(def) && (FlowNode.isFlowNode(use) || use instanceof Pair);
};

/**
 * Validate for the value of DUPair
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @param {string} msg Custom error message, if any
 * @throws "Invalid value for a DUPair" | Custom error message
 */
DUPair.validate = function (def, use, msg) {
    'use strict';
    if (!DUPair.isValidDUPair(def, use)) {
        throw new Error(msg || 'Invalid value for a DUPair');
    }
};

/**
 * Check for the object is a DUPair or not
 * @param {Object} obj
 * @returns {boolean}
 */
DUPair.isDUPair = function (obj) {
    "use strict";
    return obj instanceof DUPair;
};
/* end-static-methods */

/* start-public-methods */
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(DUPair.prototype, {
	/**
	 * Def part of the pair
	 * @type {number}
	 * @memberof DUPair.prototype
	 */
	def: {
		get: function () {
			"use strict";
			return this.first;
		}
	},
	/**
	 * Use part of the pair
	 * @type {number}
	 * @memberof DUPair.prototype
	 */
	use: {
		get: function () {
			"use strict";
			return this.second;
		}
	}
});
/* end-public-data-members */

module.exports = DUPair;