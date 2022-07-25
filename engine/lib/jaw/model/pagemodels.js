/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
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
 * PageModels module
 */
var namespace = require('../../namespace'),
	internal = namespace();
var ScopeTree = require('./../scope/scopetree'),
	Model = require('./model');

/**
 * PageModels: the model of a file or program
 * @param {ScopeTree} pageScopeTree A ScopeTree of a page
 * @constructor
 */
function PageModels(pageScopeTree) {
	"use strict";
	// PageModels.validate(pageScopeTree);
	internal(this)._pageScopeTree = pageScopeTree;
	internal(this)._intraProceduralModels = [];
	internal(this)._interProceduralModels = [];
	internal(this)._intraPageModels = [];

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-static-methods */
/**
 * Validator for the input value of PageModels
 * @param {ScopeTree} scopeTree The ScopeTree of a page
 * @param {string} [msg] Custom error message
 * @throws "Invalid value for a PageModels" | Custom error message
 */
PageModels.validate = function (scopeTree, msg) {
	"use strict";
	if (!ScopeTree.isScopeTree(scopeTree)) {
		throw new Error(msg || 'Invalid value for a PageModels');
	}
};
/* end-static-methods */

/* start-public-methods */
/**
 * Check the model is an intra-procedural model of this PageModels
 * @param {Model} model
 * @returns {boolean} True, if it is; false, otherwise
 */
PageModels.prototype.hasTheIntraProceduralModel = function (model) {
	"use strict";
	return internal(this)._intraProceduralModels.indexOf(model) !== -1;
};

/**
 * Add a model as an intra-procedural model of this PageModels
 * @param {Model} model
 */
PageModels.prototype.addIntraProceduralModel = function (model) {
	"use strict";
	if (Model.isModel(model) && !this.hasTheIntraProceduralModel(model)) {
		internal(this)._intraProceduralModels.push(model);
	}
};

/**
 * Check the model is an inter-procedural model of this PageModels
 * @param {Model} model
 * @returns {boolean} True, if it is; false, otherwise
 */
PageModels.prototype.hasTheInterProceduralModel = function (model) {
	"use strict";
	return internal(this)._interProceduralModels.indexOf(model) !== -1;
};

/**
 * Add a model as an inter-procedural model of this PageModels
 * @param {Model} model
 */
PageModels.prototype.addInterProceduralModel = function (model) {
	"use strict";
	if (Model.isModel(model) && !this.hasTheInterProceduralModel(model)) {
		internal(this)._interProceduralModels.push(model);
	}
};

/**
 * Check the model is an intra-page model of this PageModels
 * @param {Model} model
 * @returns {boolean} True, if it is; false, otherwise
 */
PageModels.prototype.hasTheIntraPageModel = function (model) {
	"use strict";
	return internal(this)._intraPageModels.indexOf(model) !== -1;
};

/**
 * Add a model as an intra-page model of this PageModels
 * @param {Model} model
 */
PageModels.prototype.addIntraPageModel = function (model) {
	"use strict";
	if (Model.isModel(model) && !this.hasTheIntraPageModel(model)) {
		internal(this)._intraPageModels.push(model);
	}
};

/**
 * Get intra-page model by matching its mainly related scope
 * @param {Scope} scope
 * @returns {null|Model}
 */
PageModels.prototype.getIntraPageModelByMainlyRelatedScope = function (scope) {
	"use strict";
	var foundItem = null;
	internal(this)._intraPageModels.some(function (item) {
		if (item.isMainlyRelatedToTheScope(scope)) {
			foundItem = item;
			return true;
		}
	});
	return foundItem;
};

/**
 * Get inter-procedural model by matching its mainly related scope
 * @param {Scope} scope
 * @returns {null|Model}
 */
PageModels.prototype.getInterProceduralModelByMainlyRelatedScope = function (scope) {
	"use strict";
	var foundItem = null;
	internal(this)._interProceduralModels.some(function (item) {
		if (item.isMainlyRelatedToTheScope(scope)) {
			foundItem = item;
			return true;
		}
	});
	return foundItem;
};

/**
 * Get intra-procedural model by matching its mainly related scope
 * @param {Scope} scope
 * @returns {null|Model}
 */
PageModels.prototype.getIntraProceduralModelByMainlyRelatedScope = function (scope) {
	"use strict";
	var foundItem = null;
	internal(this)._intraProceduralModels.some(function (item) {
		if (item.isMainlyRelatedToTheScope(scope)) {
			foundItem = item;
			return true;
		}
	});
	return foundItem;
};

/**
 * Get a model by matching its mainly related scope
 * @param {Scope} scope
 * @returns {null|Model}
 */
PageModels.prototype.getModelByMainlyRelatedScope = function (scope) {
	"use strict";
	var foundItem = null;
	foundItem = this.getIntraPageModelByMainlyRelatedScope(scope);
	if (!foundItem) {
		foundItem = this.getInterProceduralModelByMainlyRelatedScope(scope);
		if (!foundItem) {
			foundItem = this.getIntraProceduralModelByMainlyRelatedScope(scope);
		}
	}
	return foundItem;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(PageModels.prototype, {
	/**
	 * Intra-procedural models during a page scope
	 * @type {Array}
	 * @memberof PageModels.prototype
	 */
	intraProceduralModels: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._intraProceduralModels);
		},
		set: function (models) {
			"use strict";
			if (models instanceof Array && models.every(function (elem) { return Model.isModel(elem);})) {
				internal(this)._intraProceduralModels = [].concat(models);
			}
		}
	},
	/**
	 * Inter-procedural models during a page scope
	 * @type {Array}
	 * @memberof PageModels.prototype
	 */
	interProceduralModels: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._interProceduralModels);
		},
		set: function (models) {
			"use strict";
			if (models instanceof Array && models.every(function (elem) { return Model.isModel(elem);})) {
				internal(this)._interProceduralModels = [].concat(models);
			}
		}
	},
	/**
	 * Intra-page models during a page scope
	 * @type {Array}
	 * @memberof PageModels.prototype
	 */
	intraPageModels: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._intraPageModels);
		},
		set: function (models) {
			"use strict";
			if (models instanceof Array && models.every(function (elem) { return Model.isModel(elem);})) {
				internal(this)._intraPageModels = [].concat(models);
			}
		}
	},
	/**
	 * ScopeTree for the page
	 * @type {ScopeTree}
	 * @memberof PageModels.prototype
	 */
	pageScopeTree: {
		get: function () {
			"use strict";
			return internal(this)._pageScopeTree;
		}
	}
});
/* end-public-data-members */

module.exports = PageModels;