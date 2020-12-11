
var flownodeFactory = require('../../esgraph').factoryFlowNode,
    vardefFactory = require('./../def-use/vardeffactory'),
    VarDef = require('./../def-use/vardef'),
    Def = require('./../def-use/def'),
    scopeFactory = require('./scopefactory'),
    namespace = require('../../namespace'),
    internal = namespace(),
    Set = require('../../analyses').Set;

/**
 * Handle global scope and global nodes, currently, only local storage node
 * @constructor
 */
function GlobalScopeCtrl() {
    "use strict";
    internal(this)._localStorageNode = flownodeFactory.createLocalStorageNode();
    internal(this)._name = scopeFactory.createDomainScope([
        internal(this)._localStorageNode,
        internal(this)._localStorageNode,
        [internal(this)._localStorageNode]
    ]);

    initialization(internal(this)._localStorageNode, internal(this)._name);

    /* start-test-block */
    this._testonly_ = internal(this);
    this._testonly_._initialization = initialization;
    /* end-test-block */
}

/**
 * Initialize GEN and KILL sets of local storage node
 * @param {FlowNode} node local storage
 * @param {Scope} scope global scope
 * @private
 * @function
 */
function initialization(node, scope) {
    'use strict';

    var defaultLocalStorage = vardefFactory.createGlobalLocalStorageVarDef(node, 'localStorage');
    scope.setInitVarDefs(new Set([defaultLocalStorage]));
    node.kill = new Set();
}

Object.defineProperty(GlobalScopeCtrl.prototype, 'scope', {
    get: function () {
        "use strict";
        return internal(this)._name;
    }
});

Object.defineProperty(GlobalScopeCtrl.prototype, 'localStorageNode', {
    get: function () {
        "use strict";
        return internal(this)._localStorageNode;
    }
});

Object.defineProperty(GlobalScopeCtrl.prototype, 'graph', {
    get: function () {
        "use strict";
        return [].concat(internal(this)._name.cfg);
    }
});

Object.defineProperty(GlobalScopeCtrl.prototype, 'localStorageSetterNames', {
    value: ['setItem'],
    writable: false,
    enumerable: false,
    configurable: false
});

/**
 * Add reach definition in local storage node, should only add definitions of LOCAL_STORAGE_TYPE
 * @param {VarDef} vardef
 * @function
 */
GlobalScopeCtrl.prototype.addReachDefinitionInLocalStorageNode = function (vardef) {
    "use strict";
    if (VarDef.isVarDef(vardef)) {
        var updateRDs = new Set();
        if (!!internal(this)._localStorageNode.reachIns) {
            updateRDs = internal(this)._localStorageNode.reachIns;
        }
        if (vardef.definition.type === Def.LOCAL_STORAGE_TYPE) {
            updateRDs.add(vardef);
            internal(this)._localStorageNode.reachIns = new Set(updateRDs);
        }
    }
};

/**
 * Get reach out definitions from local storage node
 * @returns {Set}
 * @function
 */
GlobalScopeCtrl.prototype.getReachOutDefinitionFromLocalStorageNode = function () {
    "use strict";
    var reachOuts = new Set();
    reachOuts = Set.union(internal(this)._localStorageNode.reachIns, internal(this)._localStorageNode.generate);
    return reachOuts;
};

var singleton = new GlobalScopeCtrl();
module.exports = singleton;