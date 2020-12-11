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