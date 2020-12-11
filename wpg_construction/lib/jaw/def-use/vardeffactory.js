/*
 * Simple factory for creating VarDef objects
 */
var VarDef = require('./vardef'),
    Def = require('./def'),
    FlowNode = require('../../esgraph/flownode'),
    factoryVar = require('./varfactory'),
    factoryDef = require('./deffactory'),
    factoryRange = require('./rangefactory');

/**
 * VarDefFactory
 * @constructor
 */
function VarDefFactory() {
}

/* start-public-methods */
/**
 * Factory method to create a VarDef with a Var and a Def
 * @param {Var} variable
 * @param {Def} definition
 * @returns {VarDef}
 */
VarDefFactory.prototype.create = function (variable, definition) {
    'use strict';
    return new VarDef(variable, definition);
};

/**
 * Creator for global variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @param {string} type
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalVarDef = function (variable, node, type) {
    'use strict';
    var def = factoryDef.create(node, type, factoryRange.createGlobalRange());
    return this.create(variable, def);
};

/**
 * Factory method for creating global literal type variable and definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalLiteralVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.LITERAL_TYPE);
};

/**
 * Factory method for creating global object type variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalObjectVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.OBJECT_TYPE);
};

/**
 * Factory method for creating global function type variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalFunctionVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.FUNCTION_TYPE);
};

/**
 * Factory method for creating global HTML DOM type variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalHTMLDOMVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.HTML_DOM_TYPE);
};

/**
 * Factory method for creating global undefined type variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalUndefinedVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.UNDEFINED_TYPE);
};

/**
 * Factory method for creating global local storage type variable and its definition
 * @param {Var} variable
 * @param {FlowNode} node
 * @returns {VarDef}
 */
VarDefFactory.prototype.createGlobalLocalStorageVarDef = function (variable, node) {
    "use strict";
    return this.createGlobalVarDef(variable, node, Def.LOCAL_STORAGE_TYPE);
};

var factory = new VarDefFactory();
module.exports = factory;