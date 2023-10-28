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
 * Using esprima JS parser to parse AST
 */
var esprima = require('esprima');

/**
 * JS  parser
 * @constructor
 */
function JSParser() {
}

/**
 * Parse the code to AST with specified options for esprima parser or use the default range and loc options
 * @param {String} code Content of source code
 * @param {Object} [options] Option object
 * @returns {Object} Parsed JS AST
 */
JSParser.prototype.parseAST = function (code, options) {
	'use strict';
	var optionObj = options || {range: true, loc: true};
	if (!optionObj.range) {
		optionObj.range = true;
	}
	if (!optionObj.loc) {
		optionObj.loc = true;
	}

	return esprima.parse(code, optionObj);
};

// recursive traversal
JSParser.prototype.traverseAST = function traverse(node, func) {
    func(node);//1
    for (var key in node) { //2
        if (node.hasOwnProperty(key)) { //3
            var child = node[key];
            if (typeof child === 'object' && child !== null) { //4

                if (Array.isArray(child)) {
                    for(let node of child){ //5
                      traverse(node, func);  
                    }
                } else {
                    traverse(child, func); //6
                }
            }
        }
    }
}

// @thanks to: https://github.com/jrajav/esprima-walk/blob/master/esprima-walk.js
// iterative traversal
JSParser.prototype.itraverseAST = function(ast, func){
    var stack = [ ast ], i, j, key, len, node, child;
    for ( i = 0; i < stack.length; i += 1 ) {
        node = stack[ i ]
        func( node )
        for ( key in node ) {
            child = node[ key ]
            if ( child instanceof Array ) {
                for ( j = 0, len = child.length; j < len; j += 1 ) {
                    stack.push( child[ j ] );
                }
            } else if ( child != void 0 && typeof child.type === 'string' ) {
                stack.push( child );
            }
        }
    }
}


JSParser.prototype.traverseAddParent = function (ast, fn){
    var stack = [ ast ], i, j, key, len, node, child, subchild
    for ( i = 0; i < stack.length; i += 1 ) {
        node = stack[ i ]
        fn( node )
        for ( key in node ) {
            if ( key !== 'parent' ) { 
                child = node[ key ]
                if ( child instanceof Array ) {
                    for ( j = 0, len = child.length; j < len; j += 1 ) {
                        subchild = child[ j ]
                        if( subchild instanceof Object ) {
                            subchild.parent = node
                        }
                        stack.push( subchild )
                    }
                } else if ( child != void 0 && typeof child.type === 'string' ) {
                    child.parent = node
                    stack.push( child )
                }
            }
        }
    }
}

/* end-public-methods */

var parser = new JSParser();
module.exports = parser;
