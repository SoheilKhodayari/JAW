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
 * Simple factory for Def-Use Pair
 */
var DUPair = require('./dupair');

/**
 * Factory of DUPair object
 * @constructor
 */
function DUPairFactory() {
}

/**
 * Creator for DUPair
 * @param {FlowNode} def
 * @param {FlowNode} use
 * @returns {DUPair} Instance of DUPair
 */
DUPairFactory.prototype.create = function (def, use) {
    'use strict';
    return new DUPair(def, use);
};

var factory = new DUPairFactory();
module.exports = factory;