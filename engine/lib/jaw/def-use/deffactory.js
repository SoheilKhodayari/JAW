/*
    Copyright (C) 2020  Soheil Khodayari, CISPA
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
 * Simple factory for Def
 */
var Def = require('./def');

/**
 * DefFactory
 * @constructor
 */
function DefFactory() {
}

/* start-public-methods */
/**
 * General factory method of Def objects
 * @param {FlowNode} from
 * @param {string} type
 * @param {Range|Array} range
 */
DefFactory.prototype.create = function (from, type, range) {
    "use strict";
    return new Def(from, type, range);
};

/**
 * Factory method for literal type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
 * @returns {Def} Definition object with literal type
 */
DefFactory.prototype.createLiteralDef = function (from, range) {
    "use strict";
    return new Def(from, Def.LITERAL_TYPE, range);
};

/**
 * Factory method for object type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
 * @returns {Def} Definition object with object type
 */
DefFactory.prototype.createObjectDef = function (from, range) {
    "use strict";
    return new Def(from, Def.OBJECT_TYPE, range);
};

/**
 * Factory method for function type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
* @param {FlowNode} actual Node where the definition is generated (for global functions/variables)
 * @returns {Def} Definition object with function type
 */
DefFactory.prototype.createFunctionDef = function (from, range, actual) {
    "use strict";
    return new Def(from, Def.FUNCTION_TYPE, range, actual);
};

/**
 * Factory method for HTML DOM type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
 * @returns {Def} Definition object with HTML DOM type
 */
DefFactory.prototype.createHTMLDOMDef = function (from, range) {
    "use strict";
    return new Def(from, Def.HTML_DOM_TYPE, range);
};

/**
 * Factory method for undefined type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
 * @returns {Def} Definition object with undefined type
 */
DefFactory.prototype.createUndefinedDef = function (from, range, actual) {
    "use strict";
    return new Def(from, Def.UNDEFINED_TYPE, range, actual);
};

/**
 * Factory method for local storage type definition
 * @param {FlowNode} from Node where the definition is generated
 * @param {Range|Array} range
 * @returns {Def} Definition object with local storage type
 */
DefFactory.prototype.createLocalStorageDef = function (from, range) {
    "use strict";
    return new Def(from, Def.LOCAL_STORAGE_TYPE, range);
};
/* end-public-methods */

var factory = new DefFactory();
module.exports = factory;