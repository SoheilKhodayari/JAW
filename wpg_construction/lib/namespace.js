/*
 * Namespace
 * @lastmodifiedBy Soheil
 * @lastmodifiedDate 2019-09-12
 */
require('core-js/es6/weak-map');

function namespace() {
	'use strict';
    var map = new WeakMap();

    return function (obj) {
        if (!map.has(obj)) {
            map.set(obj, {});
        }
        return map.get(obj);
    };
}

module.exports = namespace;