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
 * Simple factory for Var
 */
var Var = require('./var');

/**
 * Factory for Var
 * @constructor
 */
function VarFactory() {
}

/**
 * Factory method for creating a variable
 * @param {String} name Name of the variable
 * @returns {Object} Create variable
 * @throws {Object} When failed to create a Var
 */
VarFactory.prototype.create = function (name) {
    'use strict';
    return new Var(name);
};

var factory = new VarFactory();
module.exports = factory;