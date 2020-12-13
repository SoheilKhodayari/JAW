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