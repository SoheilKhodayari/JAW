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
	FlowNode module
*/

var namespace = require('../namespace'),
    internal = namespace();
var Set = require('../analyses/set');

/**
 * Construct a FlowNode
 * @param {string} [type] Type of the node, default is NORMAL_NODE_TYPE
 * @param {Object} [astNode]
 * @param {FlowNode} [parent] Parent node
 * @constructor
 */
function FlowNode(type, astNode, parent) {
    'use strict';
    var nodeType = type || FlowNode.NORMAL_NODE_TYPE;
    FlowNode.validateTypeValue(nodeType);

    this.uniqueId = null;
    internal(this)._cfgId = null;
    internal(this)._astNode = astNode || null;
    internal(this)._parent = parent || null;
    internal(this)._type = nodeType;
    internal(this)._prev = [];
    internal(this)._next = [];
    internal(this)._nextSibling = null;
    internal(this)._kill = null;
    internal(this)._generate = null;
    // `imports` property moved to the `Model` class
   	// internal(this)._imports = null; // for FILE or `Program` nodes only; 
    internal(this)._cuse = null;
    internal(this)._puse = null;
    internal(this)._label = null;
    internal(this)._line = null;
    internal(this)._col = null;
    internal(this)._scope = null;
    internal(this)._extraReachIns = null; /// Set(VarDef)
    internal(this)._extraReachOuts = null; /// Set(VarDef)
    internal(this)._reachIns = null; /// Set(VarDef)
    internal(this)._reachOuts = null; /// Set(VarDef)

    initializeConnections(this);
    if (internal(this)._type !== FlowNode.NORMAL_NODE_TYPE) {
        internal(this)._label = internal(this)._type;
    }

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-test-block */
FlowNode._testonly_ = {
    initializeConnections: initializeConnections,
    addPrev: addPrev,
    addNext: addNext,
    removePrev: removePrev,
    removeNext: removeNext
};
/* end-test-block */

/* start-static-public-methods */
/**
 * Check for the type of the node is valid or not
 * @param type
 * @returns {boolean}
 */
FlowNode.isValidNodeType = function (type) {
    "use strict";
    return FlowNode.TYPES.indexOf(type) !== -1;
};

/**
 * Check for the type of the connection is valid or not
 * @param {string} type
 * @returns {boolean}
 */
FlowNode.isValidConnectionType = function (type) {
    "use strict";
    return FlowNode.CONNECTION_TYPES.indexOf(type) !== -1;
};

/**
 * Check for the object is a FlowNode or not
 * @param {Object} obj
 * @returns {boolean}
 */
FlowNode.isFlowNode = function (obj) {
    "use strict";
    return obj instanceof FlowNode;
};

/**
 * Validate the type of a FlowNode
 * @param {string} type
 * @param {string} [msg] Custom error message
 * @throws {Error} when the type is invalid
 */
FlowNode.validateTypeValue = function (type, msg) {
    "use strict";
    if (!FlowNode.isValidNodeType(type)) {
        throw new Error(msg || 'Invalid type of FlowNode');
    }
};

/**
 * Validate an object is a FlowNode or not
 * @param {Object} obj
 * @param {string} [msg] Custom error message
 * @throws {Error} when the object is not a FlowNode
 */
FlowNode.validateType = function (obj, msg) {
    "use strict";
    if (!FlowNode.isFlowNode(obj)) {
        throw new Error(msg || 'Not a FlowNode');
    }
};
/* end-static-public-methods */

/* start-static-data-members */
Object.defineProperties(FlowNode, {
	/**
	 * Type of the entry node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	ENTRY_NODE_TYPE: {
		value: 'entry'
	},
	/**
	 * Type of the exit node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	EXIT_NODE_TYPE: {
		value: 'exit'
	},
	/**
	 * Type of the call node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	CALL_NODE_TYPE: {
		value: 'call'
	},
	/**
	 * Type of the call-return node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	CALL_RETURN_NODE_TYPE: {
		value: 'callReturn'
	},
	/**
	 * Type of the loop-return node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	LOOP_RETURN_NODE_TYPE: {
		value: 'loopReturn'
	},
	/**
	 * Type of the loop node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	LOOP_NODE_TYPE: {
		value: 'loop'
	},
	/**
	 * Type of the normal node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	NORMAL_NODE_TYPE: {
		value: 'normal'
	},
	/**
	 * Type of the branch node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	BRANCH_NODE_TYPE: {
		value: 'branch'
	},
	/**
	 * Type of the Storage Node
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	LOCAL_STORAGE_NODE_TYPE: {
		value: 'localStorage'
	},
	/**
	 * Type of the normal connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	NORMAL_CONNECTION_TYPE: {
		value: 'normal'
	},
	/**
	 * Type of the exception connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	EXCEPTION_CONNECTION_TYPE: {
		value: 'exception'
	},
	/**
	 * Type of the connection for the true branch
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	TRUE_BRANCH_CONNECTION_TYPE: {
		value: 'true'
	},
	/**
	 * Type of the connection for the false branch
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	FALSE_BRANCH_CONNECTION_TYPE: {
		value: 'false'
	},
	/**
	 * Type of the call connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	CALL_CONNECTION_TYPE: {
		value: 'call'
	},
	/**
	 * Type of the return connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	RETURN_CONNECTION_TYPE: {
		value: 'return'
	},
	/**
	 * Type of the onEvent connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	ON_EVENT_CONNECTION_TYPE: {
		value: 'onEvent'
	},
	/**
	 * Type of the Save Storage connection
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	SAVE_STORAGE_CONNECTION_TYPE: {
		value: 'saveStorage'
	},
	/**
	 * Type of Load Storage connection type
	 * @type {string}
	 * @memberof FlowNode
	 * @constant
	 */
	LOAD_STROAGE_CONNECTION_TYPE: {
		value: 'loadStorage'
	}
});

Object.defineProperties(FlowNode, {
	/**
	 * The collection of all node types
	 * @type {Array}
	 * @memberof FlowNode
	 * @constant
	 */
	TYPES: {
		value: [
			FlowNode.ENTRY_NODE_TYPE,
			FlowNode.EXIT_NODE_TYPE,
			FlowNode.CALL_NODE_TYPE,
			FlowNode.CALL_RETURN_NODE_TYPE,
			FlowNode.LOOP_NODE_TYPE,
			FlowNode.LOOP_RETURN_NODE_TYPE,
			FlowNode.NORMAL_NODE_TYPE,
			FlowNode.BRANCH_NODE_TYPE,
			FlowNode.LOCAL_STORAGE_NODE_TYPE
		]
	},
	/**
	 * Collection of connection types
	 * @type {Array}
	 * @memberof FlowNode
	 * @constant
	 */
	CONNECTION_TYPES: {
		value: [
			FlowNode.NORMAL_CONNECTION_TYPE,
			FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
			FlowNode.EXCEPTION_CONNECTION_TYPE,
			FlowNode.CALL_CONNECTION_TYPE,
			FlowNode.RETURN_CONNECTION_TYPE,
			FlowNode.ON_EVENT_CONNECTION_TYPE,
			FlowNode.SAVE_STORAGE_CONNECTION_TYPE,
			FlowNode.LOAD_STROAGE_CONNECTION_TYPE
		]
	},
	/**
	 * Collection of multi-connection types
	 * @type {Array}
	 * @memberof FlowNode
	 * @constant
	 */
	MULTI_CONNECTION_TYPE: {
		value: [
			FlowNode.RETURN_CONNECTION_TYPE,
			FlowNode.ON_EVENT_CONNECTION_TYPE,
			FlowNode.LOAD_STROAGE_CONNECTION_TYPE
		]
	},
	/**
	 * Collection of dataflow connection types
	 * @type {Array}
	 * @memberof FlowNode
	 * @constant
	 */
	DATAFLOW_CONNECTION: {
		value: [
			FlowNode.LOAD_STROAGE_CONNECTION_TYPE,
			FlowNode.SAVE_STORAGE_CONNECTION_TYPE
		]
	}
});
/* end-static-data-members */

/* start-public-data-members */
Object.defineProperties(FlowNode.prototype, {
	/**
	 * Node id
	 * @type {number}
	 * @memberof FlowNode.prototype
	 */
	cfgId: {
		get: function () {
			"use strict";
			return internal(this)._cfgId;
		},
		set: function (id) {
			"use strict";
			internal(this)._cfgId = id;
		}
	},
	/**
	 * Corresponding AST node
	 * @type {Object}
	 * @memberof FlowNode.prototype
	 */
	astNode: {
		get: function () {
			"use strict";
			return internal(this)._astNode;
		},
		set: function (ast) {
			"use strict";
			internal(this)._astNode = ast;
		}
	},
	/**
	 *
	 * @type {Object}
	 * @memberof FlowNode.prototype
	 */
	parent: {
		get: function () {
			"use strict";
			return internal(this)._parent;
		},
		set: function (parent) {
			"use strict";
			internal(this)._parent = parent;
		}
	},
	/**
	 * Type of the node
	 * @type {string}
	 * @memberof FlowNode.prototype
	 */
	type: {
		get: function () {
			"use strict";
			return internal(this)._type;
		},
		set: function (type) {
			"use strict";
			if (FlowNode.isValidNodeType(type)) {
				internal(this)._type = type;
			}
		}
	},
	/**
	 * Previous nodes
	 * @type {Array}
	 * @memberof FlowNode.prototype
	 */
	prev: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._prev);
		}
	},
	/**
	 * Descendant nodes
	 * @type {Array}
	 * @memberof FlowNode.prototype
	 */
	next: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._next);
		}
	},
	/**
	 * Next sibling
	 * @type {FlowNode}
	 * @memberof FlowNode.prototype
	 */
	nextSibling: {
		get: function () {
			"use strict";
			return internal(this)._nextSibling;
		},
		set: function (node) {
			"use strict";
			if (FlowNode.isFlowNode(node)) {
				internal(this)._nextSibling = node;
			}
		}
	},
	/**
	 * KILL set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	kill: {
		get: function () {
			"use strict";
			return (!!internal(this)._kill)? new Set(internal(this)._kill) : null;
		},
		set: function (killSet) {
			"use strict";
			if (killSet instanceof Set) {
				internal(this)._kill = killSet;
			}
		}
	},
	/**
	 * GEN set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	generate: {
		get: function () {
			"use strict";
			return (!!internal(this)._generate)? new Set(internal(this)._generate.values()) : null;
		},
		set: function (genSet) {
			"use strict";
			if (genSet instanceof Set) {
				internal(this)._generate = genSet;
			}
		}
	},

	// /**
	//  * List of (custom) import dependencies for `Program` (FILE) nodes
	//  * @type {Set}
	//  * @memberof FlowNode.prototype
	//  */
	// imports: {
	// 	get: function () {
	// 		"use strict";
	// 		return internal(this)._imports;
	// 	},
	// 	set: function (importList) {
	// 		"use strict";
	// 		if (importList instanceof Array) {
	// 			internal(this)._imports = importList;
	// 		}
	// 	}
	// },


	/**
	 * C-use set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	cuse: {
		get: function () {
			"use strict";
			return (!!internal(this)._cuse)? new Set(internal(this)._cuse) : null;
		},
		set: function (cuseSet) {
			"use strict";
			if (cuseSet instanceof Set) {
				internal(this)._cuse = cuseSet;
			}
		}
	},
	/**
	 * P-use set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	puse: {
		get: function () {
			"use strict";
			return (!!internal(this)._puse)? new Set(internal(this)._puse) : null;
		},
		set: function (puseSet) {
			"use strict";
			if (puseSet instanceof Set) {
				internal(this)._puse = puseSet;
			}
		}
	},
	/**
	 * Label for this node
	 * @type {string}
	 * @memberof FlowNode.prototype
	 */
	label: {
		get: function () {
			"use strict";
			return internal(this)._label;
		},
		set: function (text) {
			"use strict";
			if (typeof text === 'string') {
				internal(this)._label = text;
			}
		}
	},
	/**
	 * Line number corresponding to this node
	 * @type {number}
	 * @memberof FlowNode.prototype
	 */
	line: {
		get: function () {
			"use strict";
			return internal(this)._line;
		},
		set: function (lineNum) {
			"use strict";
			if (typeof lineNum === 'number') {
				internal(this)._line = lineNum;
			}
		}
	},
	/**
	 * Column index corresponding to this node
	 * @type {number}
	 * @memberof FlowNode.prototype
	 */
	col: {
		get: function () {
			"use strict";
			return internal(this)._col;
		},
		set: function (column) {
			"use strict";
			if (typeof column === 'number') {
				internal(this)._col = column;
			}
		}
	},
	/**
	 * Extra ReachIn set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	extraReachIns: {
		get: function () {
			"use strict";
			if (!!internal(this)._extraReachIns) {
				return new Set(internal(this)._extraReachIns);
			}
			return null;
		},
		set: function (extras) {
			"use strict";
			if (extras instanceof Set) {
				internal(this)._extraReachIns = extras;
			}
		}
	},
	/**
	 * Extra ReachOut set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	extraReachOuts: {
		get: function () {
			"use strict";
			if (!!internal(this)._extraReachOuts) {
				return new Set(internal(this)._extraReachOuts);
			}
			return null;
		},
		set: function (extras) {
			"use strict";
			if (extras instanceof Set) {
				internal(this)._extraReachOuts = extras;
			}
		}
	},
	/**
	 * ReachIn set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	reachIns: {
		get: function () {
			"use strict";
			if (!!internal(this)._reachIns) {
				return new Set(internal(this)._reachIns);
			}
			return null;
		},
		set: function (varDefs) {
			"use strict";
			if (varDefs instanceof Set) {
				internal(this)._reachIns = varDefs;
			}
		}
	},
	/**
	 * ReachOut set at this node
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	reachOuts: {
		get: function () {
			"use strict";
			if (!!internal(this)._reachOuts) {
				return new Set(internal(this)._reachOuts);
			}
			return null;
		},
		set: function (varDefs) {
			"use strict";
			if (varDefs instanceof Set) {
				internal(this)._reachOuts = varDefs;
			}
		}
	},
	/**
	 * Corresponding Scope of this node
	 * @type {Scope}
	 * @memberof FlowNode.prototype
	 */
	scope: {
		get: function () {
			"use strict";
			return internal(this)._scope;
		},
		set: function (scopeWrapper) {
			"use strict";
			internal(this)._scope = scopeWrapper;
		}
	}
});
/* end-public-data-members */

/* start-private-methods */
/**
 * Create and initialize the connections
 * @param {FlowNode} thisNode
 * @private
 * @memberof FlowNode
 */
function initializeConnections(thisNode) {
	'use strict';
	FlowNode.CONNECTION_TYPES.forEach(function (type) {
		if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
			internal(thisNode)[type] = [];
		} else {
			internal(thisNode)[type] = null;
		}
		Object.defineProperty(thisNode, type, {
			get: function () {
				return internal(thisNode)[type];
			}
		});
	});
}

/**
 * Add a node into the collection of previous nodes of the current node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} prevNode
 * @returns {boolean}
 * @memberof FlowNode
 * @private
 */
function addPrev(thisNode, prevNode) {
	"use strict";
	if (FlowNode.isFlowNode(prevNode) && !thisNode.hasPrev(prevNode)) {
		internal(thisNode)._prev.push(prevNode);
	}
}

/**
 * Add a node into the collection of next nodes of the current node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} nextNode
 * @returns {boolean}
 * @memberof FlowNode
 * @private
 */
function addNext(thisNode, nextNode) {
	"use strict";
	if (FlowNode.isFlowNode(nextNode) && !thisNode.hasNext(nextNode)) {
		internal(thisNode)._next.push(nextNode);
	}
}

/**
 * Remove a previous node from the collection of this node (used in the method disconnect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} prevNode
 * @memberof FlowNode
 * @private
 */
function removePrev(thisNode, prevNode) {
	"use strict";
	if (FlowNode.isFlowNode(prevNode) && thisNode.hasPrev(prevNode)) {
		var index = -1;
		internal(thisNode)._prev.forEach(function (node, i) {/// find the index of the prevNode
			if (node === prevNode) {
				index = i;
			}
		});
		if (index >= 0) {/// remove from the array of previous nodes
			internal(thisNode)._prev.splice(index, 1);
		}
	}
}

/**
 * Remove a next node from the collection of this node (used in the method connect)
 * @param {FlowNode} thisNode
 * @param {FlowNode} nextNode
 * @memberof FlowNode
 * @private
 */
function removeNext(thisNode, nextNode) {
	"use strict";
	if (FlowNode.isFlowNode(nextNode) && thisNode.hasNext(nextNode)) {
		var index = -1;
		internal(thisNode)._next.forEach(function (node, i) {/// find the index of the nextNode
			if (node === nextNode) {
				index = i;
			}
		});
		if (index >= 0) {/// remove from the array of next nodes
			internal(thisNode)._next.splice(index, 1);
		}
	}
}
/* end-private-methods */

/* start-public-methods */
/**
 * Clear ReachIn set at this node
 */
FlowNode.prototype.clearReachIns = function () {
    "use strict";
    internal(this)._reachIns = null;
};

/**
 * Clear ReachOut set at this node
 */
FlowNode.prototype.clearReachOuts = function () {
    "use strict";
    internal(this)._reachOuts = null;
};

/**
 * Clear extra ReachIn set at this node
 */
FlowNode.prototype.clearExtraReachIns = function () {
    "use strict";
    internal(this)._extraReachIns = null;
};

/**
 * Clear extra ReachOut set at this node
 */
FlowNode.prototype.clearExtraReachOuts = function () {
    "use strict";
    internal(this)._extraReachOuts = null;
};

/**
 * Check the node is in the collection of previous nodes of the current node
 * @param {FlowNode} prevNode
 * @returns {boolean}
 */
FlowNode.prototype.hasPrev = function (prevNode) {
    "use strict";
    return internal(this)._prev.indexOf(prevNode) !== -1;
};

/**
 * Check the node is in the collection of next nodes of the current node
 * @param {FlowNode} nextNode
 * @returns {boolean}
 */
FlowNode.prototype.hasNext = function (nextNode) {
    "use strict";
    return internal(this)._next.indexOf(nextNode) !== -1;
};

/**
 * Check the current node is connected to the node or not
 * @param {FlowNode} node
 * @returns {boolean}
 */
FlowNode.prototype.isConnectedTo = function (node) {
    "use strict";
    var connected = false,
        thisNode = this;
    if (FlowNode.isFlowNode(node)) {
        FlowNode.CONNECTION_TYPES.forEach(function (type) {
            if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
                internal(thisNode)[type].forEach(function (transNode) {
                    if (transNode === node) {
                        connected = true;
                    }
                });
            } else if (internal(thisNode)[type] === node) {
                connected = true;
            }
        });
    }
    return connected;
};

/**
 * Connect a node ot this node with the specified connection type
 * @param {FlowNode} nextNode
 * @param {string} connectionType
 * @returns {FlowNode}
 */
FlowNode.prototype.connect = function (nextNode, connectionType) {
    "use strict";
    if (FlowNode.isFlowNode(nextNode)) {
        if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(connectionType) !== -1) {
            internal(this)[connectionType].push(nextNode);
        } else if (FlowNode.isValidConnectionType(connectionType)) {
            internal(this)[connectionType] = nextNode;
        } else if (!connectionType) {
            internal(this)[FlowNode.NORMAL_CONNECTION_TYPE] = nextNode;
        }
        addNext(this, nextNode);
        addPrev(nextNode, this);
    }
    return this;
};

/**
 * Disconnect this node and the nextNode
 * @param {FlowNode} nextNode
 * @returns {FlowNode} the node disconnected
 */
FlowNode.prototype.disconnect = function (nextNode) {
    "use strict";
    var thisNode = this;
    if (FlowNode.isFlowNode(nextNode)) {
        FlowNode.CONNECTION_TYPES.forEach(function (type) {
            if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1) {
                var nextNodeIndex = internal(thisNode)[type].indexOf(nextNode);
                if (nextNodeIndex !== -1) {
                    var oneventConnections = [];
                    oneventConnections = oneventConnections.concat(internal(thisNode)[type].slice(0, nextNodeIndex));
                    oneventConnections = oneventConnections.concat(
                        internal(thisNode)[type].slice(nextNodeIndex + 1,
                        internal(thisNode)[type].length)
                    );
                    internal(thisNode)[type] = oneventConnections;
                }
            } else if (internal(thisNode)[type] === nextNode) {
                internal(thisNode)[type] = null;
            }
        });
        removeNext(thisNode, nextNode);
        removePrev(nextNode, thisNode);
    }
    return this;
};

/**
 * Clear GEN set at this node
 */
FlowNode.prototype.clearGENSet = function () {
    "use strict";
    internal(this)._generate = new Set();
};

/**
 * Clear KILL set at this node
 */
FlowNode.prototype.clearKILLSet = function () {
    "use strict";
    internal(this)._kill = new Set();
};

/**
 * String representation of this node
 * @returns {string}
 */
FlowNode.prototype.toString = function () {
    'use strict';
    return (!internal(this)._label)? (internal(this)._cfgId) : (internal(this)._label);
};

/**
 * Convert this node to JSON format
 * @returns {string}
 */
FlowNode.prototype.toJSON = function () {
	'use strict';
	return JSON.stringify({
		id: internal(this)._cfgId,
		label: internal(this)._label,
		type: internal(this)._type
	});
};
/* end-public-methods */

module.exports = FlowNode;