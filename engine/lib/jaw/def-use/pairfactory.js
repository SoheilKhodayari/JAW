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
 * Simple factory for Pair object
 */
var Pair = require('./pair');

/**
 * PairFactory
 * @constructor
 */
function PairFactory() {
}

/* start-public-methods */
/**
 * Creator of Pair object
 * @param first
 * @param second
 * @returns {Pair}
 */
PairFactory.prototype.create = function (first, second) {
    'use strict';
    return new Pair(first, second);
};
/* end-public-methods */

var factory = new PairFactory();
module.exports  = factory;