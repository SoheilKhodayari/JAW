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
 * Controller for Scopes
 */
var factoryScope = require('./scopefactory'),
	factoryScopeTree = require('./scopetreefactory');
var namespace = require('../../namespace'),
	internal = namespace();

/**
 * ScopeCtrl
 * @constructor
 */
function ScopeCtrl() {
	"use strict";
	internal(this)._domainScope = factoryScope.createDomainScope();
	internal(this)._pageScopeTrees = [];
	internal(this)._astList = [];

	/* start-test-block */
	this._testonly_ = internal(this);
	/* end-test-block */
}

/* start-public-methods */
/**
 * Add scope tree of a page
 * @param {Object} ast AST of the page
 */
ScopeCtrl.prototype.addPageScopeTree = function (ast) {
	"use strict";
	var tree = factoryScopeTree.create();
	tree.buildScopeTree(ast);
	internal(this)._domainScope.addChild(tree.root);
	internal(this)._pageScopeTrees.push(tree);
	internal(this)._astList.push(ast);
};

/**
 * Clear the controller
 */
ScopeCtrl.prototype.clear = function () {
	"use strict";
	internal(this)._domainScope = factoryScope.createDomainScope();
	internal(this)._pageScopeTrees = [];
    factoryScope.resetAnonymousFunctionScopeCounter();
    factoryScope.resetPageScopeCounter();
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(ScopeCtrl.prototype, {
	/**
	 * ScopeTree of pages
	 * @type {Array}
	 * @memberof ScopeCtrl.prototype
	 */
	pageScopeTrees: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._pageScopeTrees);
		},
		enumerable: true
	},
	/**
	 * DomainScope
	 * @type {DomainScope}
	 * @memberof ScopeCtrl.prototype
	 */
	domainScope: {
		get: function () {
			"use strict";
			return internal(this)._domainScope;
		},
		enumerable: true
	}
});
/* end-public-data-members */

var controller = new ScopeCtrl();
module.exports = controller;
