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
 * CFG builder with esgraph library
 */
var esgraph = require('../../esgraph/index'),
	factoryFlowNode = require('../../esgraph/flownodefactory'),
	FlowNode = require('../../esgraph/flownode');

/**
 * CFGBuilder
 * @constructor
 */
function CFGBuilder() {
}

/**
 * Get the CFG of the AST with additional information
 * @param {Object} ast JS parsed AST
 * @returns {Object} An 3-entries array representing CFG, [start, end, all nodes]
 */
CFGBuilder.prototype.getCFG = function (ast) {
	'use strict';
	var cfg = esgraph(ast),
		maxLine = 0,
		maxCol = 0;
	for(var index = 0; index < cfg[2].length; ++index) {
		/// specify line number and column offset for nodes beside the entry and exit nodes
		if (cfg[2][index].type !== FlowNode.EXIT_NODE_TYPE) {

			try {
				(cfg[2][index]).line = cfg[2][index].astNode.loc.start.line;
				(cfg[2][index]).col = cfg[2][index].astNode.loc.start.column;
			} catch {
				(cfg[2][index]).line = 1
				(cfg[2][index]).col = 1
			}

			maxLine = (cfg[2][index].line > maxLine)? cfg[2][index].line : maxLine;
			maxCol = (cfg[2][index].col > maxCol)? cfg[2][index].col : maxCol;



		}
	}
	/// specify the value of line number and column offset for the exit node
	cfg[1].line = maxLine;
	cfg[1].col = maxCol + 1;
	return cfg;
};

/**
 * Create graph for the domain scope
 * @returns {Object} Graph object
 */
CFGBuilder.prototype.getDomainScopeGraph = function () {
	"use strict";
	var localStroageNode = factoryFlowNode.createLocalStorageNode();
	var graph = [localStroageNode, localStroageNode, [localStroageNode]];
	return graph;
};

/**
 * Interface to reset the counter of graph nodes
 */
CFGBuilder.prototype.resetGraphNodeCounter = function () {
    "use strict";
    factoryFlowNode.resetCounter();
};

var builder = new CFGBuilder();
module.exports = builder;