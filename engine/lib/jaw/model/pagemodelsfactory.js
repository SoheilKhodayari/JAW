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