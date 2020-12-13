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
 * Convert CFG to graph representation
 */
var esgraph = require('../../esgraph');
var FlowNode = require('../../esgraph/flownode');

/**
 * CFGGraphConverter
 * @constructor
 */
function CFGGraphConverter() {
}

/**
 * Convert a CFG to dot language for Graphviz output (with AST node type labeled, default)
 * @param {Object} cfg CFG to be converted
 * @param {String} [source] Source code used for labels
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDot = function (cfg, source) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: outputCFG[0].cfgId};
	if (!!source) {
		option.source = source;
	}
	return esgraph.dot(cfg, option);
};

/**
 * Label CFG with line and column
 * @param {Object} cfg CFG to be converted
 */
function labelWithLoc(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = 'L' + node.line + ':C' + node.col;
		} else if ([FlowNode.ENTRY_NODE_TYPE, FlowNode.EXIT_NODE_TYPE, FlowNode.CALL_RETURN_NODE_TYPE].indexOf(node.type) !== -1) {
			node.label = node.type + ' (L' + node.line + ':C' + node.col + ')';
		} else {
			node.label = node.type;
		}
	});
}

/**
 * Convert a CFG to dot language for Graphviz output (with labeled line and column)
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelLoc = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: outputCFG[0].cfgId};
	labelWithLoc(outputCFG);
	return esgraph.dot(cfg, option);
};

/**
 * Compute index number to be characters (a-z)
 * @param {Number} index Index number
 * @returns {String} Character
 */
function computeLabelIndex(index) {
	"use strict";
	var chara = 97, charz = 122;
	var divided = index, remainder;
	var computedLabelIndex = '';
	do {
		remainder = divided % (charz - chara + 1);
		computedLabelIndex = String.fromCharCode(chara + remainder) + computedLabelIndex;
		divided = Math.floor(index / (charz - chara + 1));
	} while(divided !== 0);
	return computedLabelIndex;
}

/**
 * Label CFG with line number
 * @param {Object} cfg CFG to be labeled
 */
function labelWithLineNumber(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = '' + node.line;
		} else if ([
				FlowNode.LOOP_NODE_TYPE,
				FlowNode.LOOP_RETURN_NODE_TYPE,
				FlowNode.LOCAL_STORAGE_NODE_TYPE
			].indexOf(node.type) !== -1) {
			node.label = node.type;
		} else {
			node.label = node.type;
		}
	});

	cfg[2].forEach(function (node) {
		var nodesHaveSameLabel = [];
		cfg[2].forEach(function (another) {
			if (node.label === another.label) {
				nodesHaveSameLabel.push(another);
			}
		});
		if (nodesHaveSameLabel.length > 1) {
			nodesHaveSameLabel.forEach(function (elem, index) {
				if (elem.type === FlowNode.NORMAL_NODE_TYPE) {
					elem.label = elem.label + computeLabelIndex(index);
				} else {
					elem.label = elem.label + '_' + computeLabelIndex(index);
				}
			});
		}
	});
}

/**
 * Convert a CFG to dot language format output with labeled line number only
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelLine = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: outputCFG[0].cfgId};
	labelWithLineNumber(outputCFG);
	return esgraph.dot(cfg, option);
};

/**
 * Label CFG with node's id
 * @param {Object} cfg CFG to be labeled
 */
function labelWithId(cfg) {
	"use strict";
	cfg[2].forEach(function (node) {
		if (node.type === FlowNode.NORMAL_NODE_TYPE) {
			node.label = '' + node.cfgId;
		} else {
			node.label = node.type;
		}
	});
}

/**
 * Convert a CFG to dot language for Graphviz output (with id labeled)
 * @param {Object} cfg CFG to be converted
 * @returns {String} Graph representation
 */
CFGGraphConverter.prototype.toDotWithLabelId = function (cfg) {
	'use strict';
	var outputCFG = [].concat(cfg),
		option = {counter: outputCFG[0].cfgId};
	labelWithId(outputCFG);
	return esgraph.dot(cfg, option);
};

var converter = new CFGGraphConverter();
module.exports = converter;