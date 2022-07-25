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


/*
 * Model module
 */
var namespace = require('../../namespace'),
    internal = namespace();
var Scope = require('./../scope/scope'),
    DUPair = require('./../def-use/dupair'),
    cfgValidator = require('./../cfg/cfgvalidator');
var Map = require('core-js/es6/map');

/**
 * Model
 * @constructor
 */
function Model() {
    "use strict";
    internal(this)._relatedScopes = [];
	internal(this)._mainlyRelatedScope = null;
    internal(this)._graph = null;
    internal(this)._exitNodeReachIns = null; // exportable objects from each FILE
    internal(this)._imports = null; // for FILE or `Program` nodes only
    internal(this)._dupairs = new Map(); /// (Var, Set)
	/// TODO: should contain dataflow artifacts (ReachIn, ReachOut, KILL, GEN, USE) or not

    /* start-test-block */
    this._testonly_ = internal(this);
    /* end-test-block */
}

/* start-static-methods */
/**
 * Check for the object is an Model
 * @param {Object} obj An object to be checked
 * @returns {boolean} True, if it is; false, otherwise
 */
Model.isModel = function (obj) {
    "use strict";
    return obj instanceof Model;
};
/* end-static-methods */

/* start-public-methods */
/**
 * Check for the scope is related
 * @param {Scope} scope A Scope to be checked
 * @returns {boolean}
 */
Model.prototype.isRelatedToTheScope = function (scope) {
    "use strict";
    return internal(this)._relatedScopes.indexOf(scope) !== -1;
};

/**
 * Check the scope is mainly related, which means this model is derive from the scope's intra-procedural model
 * @param {Scope} scope A Scope to be checked
 * @returns {boolean} True, if it is; false, otherwise
 */
Model.prototype.isMainlyRelatedToTheScope = function (scope) {
    "use strict";
    return internal(this)._mainlyRelatedScope === scope;
};

/**
 * Add a related scope
 * @param {Scope} scope Related scope
 */
Model.prototype.addRelatedScope = function (scope) {
    "use strict";
    if (Scope.isScope(scope) && !this.isRelatedToTheScope(scope)) {
	    if (internal(this)._relatedScopes.length === 0) {
		    internal(this)._mainlyRelatedScope = scope;
	    }
        internal(this)._relatedScopes.push(scope);
    }
};

/**
 * Check for DUPair has found
 * @param {DUPair} dupair
 * @returns {boolean} True, if found; false, otherwise
 */
Model.prototype.hasDUPair = function (dupair) {
    "use strict";
    var found = false;
    if (DUPair.isDUPair(dupair)) {
        internal(this)._dupairs.forEach(function (pairs) {
            pairs.forEach(function (pair) {
                if (pair.def === dupair.def && pair.use === dupair.use) {
                    found = true;
                }
            });
        });
    }
    return found;
};
/* end-public-methods */

/* start-public-data-members */
Object.defineProperties(Model.prototype, {
	/**
	 * Graph of the model
	 * @type {Array}
	 * @memberof Model.prototype
	 */
	graph: {
	    get: function () {
	        "use strict";
	        if(!internal(this)._graph) return null;
	        return [internal(this)._graph[0], internal(this)._graph[1], [].concat(internal(this)._graph[2])];
	    },
	    set: function (graph) {
	        "use strict";
	        if (cfgValidator.isValidCFG(graph)) {
	            internal(this)._graph = [graph[0], graph[1], [].concat(graph[2])];
	        }
	    }
	},

	/**
	 * List of (custom) import dependencies for `Program` (FILE) nodes
	 * @type {Set}
	 * @memberof FlowNode.prototype
	 */
	imports: {
		get: function () {
			"use strict";
			return internal(this)._imports;
		},
		set: function (importList) {
			"use strict";
			if (importList instanceof Array) {
				internal(this)._imports = importList;
			}
		}
	},


	/**
	 * exit node reach ins, i.e., objects that are exportable and can be imported in other files
	 * @type {Array}
	 * @memberof Model.prototype
	 */
	exitNodeReachIns: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._exitNodeReachIns);
		},
		set: function (reachIns) {
			"use strict";
			internal(this)._exitNodeReachIns = [].concat(reachIns);
		}
	},

	/**
	 * Related scopes
	 * @type {Array}
	 * @memberof Model.prototype
	 */
	relatedScopes: {
		get: function () {
			"use strict";
			return [].concat(internal(this)._relatedScopes);
		},
		set: function (scopes) {
			"use strict";
			if (scopes instanceof Array) {
				internal(this)._relatedScopes = [].concat(scopes);
			}
		}
	},
	/**
	 * DUPairs found in this model
	 * @type {Map}
	 * @memberof Model.prototype
	 */
	dupairs: {
		get: function () {
			"use strict";
			var map = new Map();
			internal(this)._dupairs.forEach(function (val, key) {
				map.set(key, val);
			});
			return map;
		},
		set: function (dupairs) {
			"use strict";
			if (dupairs instanceof Map) {
				var currentAnalysisItem = this;
				dupairs.forEach(function (pairs, variable) {
					internal(currentAnalysisItem)._dupairs.set(variable, pairs);
				});
			}
		}
	},
	/**
	 * Mainly related scope
	 * @type {Scope}
	 * @memberof Model.prototype
	 */
	mainlyRelatedScope: {
		get: function () {
			"use strict";
			return internal(this)._mainlyRelatedScope;
		}
	}
});
/* end-public-data-members */

module.exports = Model;