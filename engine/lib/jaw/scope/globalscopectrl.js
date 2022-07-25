/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
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