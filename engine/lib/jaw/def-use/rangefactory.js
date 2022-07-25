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
 * Simple factory for Range class
 */
var Range = require('./range');

/**
 * RangeFactory
 * @constructor
 */
function RangeFactory() {
}

/**
 * Creator of Range object
 * @param {*} start
 * @param {*} end
 * @returns {Range}
 */
RangeFactory.prototype.create = function (start, end) {
    'use strict';
    return new Range(start, end);
};

/**
 * Factory method for range of globals
 * @returns {Range}
 */
RangeFactory.prototype.createGlobalRange = function () {
    "use strict";
    return new Range(Range.GLOBAL_RANGE_START, Range.GLOBAL_RANGE_END);
};

var factory = new RangeFactory();
module.exports = factory;