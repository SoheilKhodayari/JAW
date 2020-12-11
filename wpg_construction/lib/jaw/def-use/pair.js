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