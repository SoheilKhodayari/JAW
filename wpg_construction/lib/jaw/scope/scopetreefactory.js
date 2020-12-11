/*
 * Simple factory for ScopeTree
 */
var ScopeTree = require('./scopetree');

function ScopeTreeFactory() {
}

/**
 * Create a ScopeTree
 * @returns {ScopeTree} A ScopeTree
 */
ScopeTreeFactory.prototype.create = function () {
	"use strict";
	return new ScopeTree();
};

var factory = new ScopeTreeFactory();
module.exports = factory;