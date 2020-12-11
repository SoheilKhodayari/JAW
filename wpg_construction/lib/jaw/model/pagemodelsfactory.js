/*
 * Simple factory for PageModels
 */
var PageModels = require('./pagemodels');

function PageModelsFactory() {
}

/**
 * Factory method for PageModels
 * @param {ScopeTree} scopeTree
 * @returns {PageModels}
 */
PageModelsFactory.prototype.create = function (scopeTree) {
	"use strict";
	return new PageModels(scopeTree);
};

var factory = new PageModelsFactory();
module.exports = factory;