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
 * Range module
 */
var namespace = require('../../namespace'),
    internal = namespace();

/**
 * Construct a Range with a pair of numbers, an two elements array of numbers or a Range object
 * @param {Range|Array|number} start
 * @param {Range|number} [end]
 * @constructor
 * @throws {Error} when the value is invalid
 */
function Range(start, end) {
    'use strict';
    // Range.validate(start, end);
    if (Range.isRange(start)) {
        internal(this)._start = start.start;
        internal(this)._end = start.end;
    } else if (start instanceof Array) {
        internal(this)._start = start[0];
        internal(this)._end = start[1];
    } else {
        internal(this)._start = start;
        internal(this)._end = end;
    }

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-data-members */
Object.defineProperties(Range, {
	/**
	 * Start of the range for global value
	 * @type {number}
	 * @constant
	 * @memberof Range
	 */
	GLOBAL_RANGE_START: {
	    value: 0,
		enumerable: true
	},
	/**
	 * End of the range for global value
	 * @type {number}
	 * @constant
	 * @memberof Range
	 */
	GLOBAL_RANGE_END: {
		value: 0,
		enumerable: true
	}
});
/* end-static-data-members */

/* start-static-methods */
/**
 * Compare two Range are the same or not
 * @param {Range} range1
 * @param {Range} range2
 * @returns {boolean}
 */
Range.equals = function (range1, range2) {
	"use strict";
	if (Range.isRange(range1) && Range.isRange(range2)) {
		return (range1 === range2) || (range1.start === range2.start && range1.end === range2.end);
	}
	return false;
};

/**
 * Check the value of Range
 * @param {Range|Array|number} start
 * @param {Range|number} [end]
 * @returns {boolean}
 */
Range.isValidValue = function (start, end) {
    'use strict';
    if (Range.isRange(start)) {
        return true;
    } else if (start instanceof Array && start.length === 2) {
        return (typeof start[0] === 'number' && typeof start[1] === 'number' && start[0] === Range.GLOBAL_RANGE_START && start[1] === Range.GLOBAL_RANGE_END) ||
            ((typeof start[0] === 'number' && start[0] >= 0) && (typeof start[1] === 'number' && start[1] > start[0]));
    }
    return (typeof start === 'number' && typeof end === 'number' && start === Range.GLOBAL_RANGE_START && end === Range.GLOBAL_RANGE_END) ||
        ((typeof start === 'number' && start >= 0) && (typeof end === 'number' && end > start));
};

/**
 * Check an object is a Range or not
 * @param {Object} obj
 * @returns {boolean}
 */
Range.isRange = function (obj) {
    'use strict';
    return obj instanceof Range;
};

/**
 * Validator for checking valid value of Range
 * @param {*} start
 * @param {*} [end]
 * @param {string} msg custom error message
 * @throws {Error} "Invalid Range value"
 */
Range.validate = function (start, end, msg) {
    'use strict';
    if (!Range.isValidValue(start, end)) {
        throw new Error(msg || 'Invalid Range value');
    }
};

/**
 * Validator for checking an object is a Range or not
 * @param {Object} obj
 * @param {string} msg custom error message
 * @throws {Error} "Not a Range"
 */
Range.validateType = function (obj, msg) {
    'use strict';
    if (!Range.isRange(obj)) {
        throw new Error(msg || 'Not a Range');
    }
};
/* end-static-methods */

/* start-public-data-members */
Object.defineProperties(Range.prototype, {
	/**
	 * Start of the range
	 * @memberof Range.prototype
	 */
	start: {
		get: function () {
			'use strict';
			return internal(this)._start;
		}
	},
	/**
	 * End of the range
	 * @memberof Range.prototype
	 */
	end: {
		get: function () {
			'use strict';
			return internal(this)._end;
		}
	}
});
/* end-public-data-members */

/* start-public-methods */
/**
 * Convert Range to an Array
 * @returns {Array}
 */
Range.prototype.toArray = function () {
    'use strict';
    return [internal(this)._start, internal(this)._end];
};

/**
 * Represent Range as a string
 * @returns {string}
 */
Range.prototype.toString = function () {
    'use strict';
    return '[' + internal(this)._start + ',' + internal(this)._end + ']';
};

/**
 * Check for current Range object is equal to another
 * @param {Range} range
 * @returns {boolean}
 */
Range.prototype.isEqualTo = function (range) {
    "use strict";
    return Range.equals(this, range);
};
/* end-public-methods */

module.exports = Range;
