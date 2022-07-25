
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


    Description:
    ------------
    Simple factory for FlowNode
*/


var FlowNode = require('./flownode'),
    namespace = require('../namespace'),
    internal = namespace();

/**
 * FlowNodeFactory
 * @constructor
 */
function FlowNodeFactory() {
    "use strict";
    this.counter = 1; /* counter for each AST, resets for each one */
    this.count = 1;  /* global Id counter */
    /* start-test-block */
    this._testonly_ = internal(this);

    this.generatedExits = [];

    this.generatedExitsDict = {}; // for quick search access to exit node ids
    /* end-test-block */
}

/* start-public-methods */
/**
 * Factory method for the FlowNode object
 * @param {string} [type]
 * @param {Object} [astNode]
 * @param {Object} [parent]
 */
FlowNodeFactory.prototype.create = function (type, astNode, parent) {
    "use strict";
    var node = new FlowNode(type, astNode, parent);
    if(astNode && astNode._id){
        node.cfgId = astNode._id;
        // node._cfgId = astNode._id;
        node.uniqueId = astNode._id;
    }else{
        // node.cfgId = "NID-" + this.count;
        node.cfgId = this.count;
        node.uniqueId = this.count;
        this.generatedExitsDict[node.cfgId]= node.cfgId; 
        this.generatedExits.push({
            _id: node.cfgId,
            type: "exit",
            kind: '',
            name:  '',
            range: '',
            loc:  '',
            value:  '',
            raw:  '',
            async: '',
            computed:  '',
            generator: '',
            sourceType:  '',
        });
        this.count = this.count + 1;

    }
    return node;
};

/**
 * Factory method for normal node
 * @param {Object} [astNode]
 * @param {Object} [parent]
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createNormalNode = function (astNode, parent) {
    "use strict";
    return this.create(FlowNode.NORMAL_NODE_TYPE, astNode, parent);
};

/**
 * Factory method for entry node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createEntryNode = function () {
    "use strict";
    return this.create(FlowNode.ENTRY_NODE_TYPE, null, null);
};

/**
 * Factory method for exit node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createExitNode = function () {
    "use strict";
    return this.create(FlowNode.EXIT_NODE_TYPE, null, null);
};

/**
 * Factory method for call node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createCallNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_NODE_TYPE, null, null);
};

/**
 * Factory method for call return node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createCallReturnNode = function () {
    "use strict";
    return this.create(FlowNode.CALL_RETURN_NODE_TYPE, null, null);
};

/**
 * Factory method for loop node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createLoopNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_NODE_TYPE, null, null);
};

/**
 * Factory method for loop return node
 * @returns {FlowNode}
 */
FlowNodeFactory.prototype.createLoopReturnNode = function () {
    "use strict";
    return this.create(FlowNode.LOOP_RETURN_NODE_TYPE, null, null);
};

/**
 * Factory method for local storage node
 * @returns {FlowNode.LOCAL_STORAGE_NODE_TYPE}
 */
FlowNodeFactory.prototype.createLocalStorageNode = function () {
    "use strict";
    return this.create(FlowNode.LOCAL_STORAGE_NODE_TYPE, null, null);
};

/**
 * Reset the counter of FlowNodes
 */
FlowNodeFactory.prototype.resetCounter = function () {
    "use strict";
    this.counter = 0;
};

/**
 * Set the counter to be another number (should be used carefully)
 * @param {number} num
 */
FlowNodeFactory.prototype.setCounter = function (num) {
    "use strict";
    if (typeof num === 'number' && num >= 0) {
        this.counter = num;
    }
};


var singleton = new FlowNodeFactory();
module.exports = singleton;