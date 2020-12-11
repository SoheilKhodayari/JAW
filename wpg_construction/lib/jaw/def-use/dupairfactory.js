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