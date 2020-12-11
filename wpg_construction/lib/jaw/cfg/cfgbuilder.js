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
			(cfg[2][index]).line = cfg[2][index].astNode.loc.start.line;
			(cfg[2][index]).col = cfg[2][index].astNode.loc.start.column;
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