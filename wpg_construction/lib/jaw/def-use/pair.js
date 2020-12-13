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
 * Pair
 */
var namespace = require('../../namespace'),
    internal = namespace();

/**
 * Pair of two elements
 * @param firstElem
 * @param secondElem
 * @constructor
 */
function Pair(firstElem, secondElem) {
    'use strict';
    internal(this)._first = firstElem;
    internal(this)._second = secondElem;

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-public-data-members */
Object.defineProperties(Pair.prototype, {
    /**
     * The first element
     * @memberof Pair.prototype
     */
    first: {
        get: function () {
            'use strict';
            return internal(this)._first;
        }
    },
    /**
     * The second element
     * @memberof Pair.prototype
     */
    second: {
        get: function () {
            'use strict';
            return internal(this)._second;
        }
    }
});
/* end-public-data-members */

/* start-public-methods */
/**
 * Represent this Pair as string
 * @returns {string}
 */
Pair.prototype.toString = function () {
    'use strict';
    return '(' + internal(this)._first + ',' + internal(this)._second + ')';
};
/* end-public-methods */

module.exports = Pair;