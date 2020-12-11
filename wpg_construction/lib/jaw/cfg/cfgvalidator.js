/**
 * Validate CFG
 */
/** Import FlowNode module */
var FlowNode = require('../../esgraph/flownode');

/**
 * CFGValidator
 * @constructor
 */
function CFGValidator() {
}

/**
 * Check for a cfg is valid
 * @param {Object} cfg CFG to be checked
 * @returns {Boolean} True if the cfg is valid, false otherwise
 */
CFGValidator.prototype.isValidCFG = function (cfg) {
	"use strict";
	return cfg instanceof Array && cfg.length === 3 && cfg[0] instanceof FlowNode && cfg[1] instanceof FlowNode && cfg[2] instanceof Array && cfg[2].indexOf(cfg[0]) !== -1 && cfg[2].indexOf(cfg[1]) !== -1;
};

var validator = new CFGValidator();
module.exports = validator;