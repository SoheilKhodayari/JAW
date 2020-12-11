/*
 * ModelFactory module
 */
var Model = require('./model');

/**
 * ModelFactory
 * @constructor
 */
function ModelFactory() {
}

/* start-public-methods */
/**
 * Factory method of Model
 * @returns {Model}
 */
ModelFactory.prototype.create = function() {
    "use strict";
    return new Model();
};
/* end-public-methods */

var factory = new ModelFactory();
module.exports = factory;