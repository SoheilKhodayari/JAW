
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
	Control Flow Graph
*/

var walker = require('walkes'),
	factoryFlowNode = require('./flownodefactory'),
	FlowNode = require('./flownode');

module.exports = ControlFlowGraph;
module.exports.dot = require('./dot');
module.exports.FlowNode = FlowNode;
module.exports.factoryFlowNode = factoryFlowNode;



/*
 * Returns [entry, exit] `FlowNode`s for the passed in AST
 */
function ControlFlowGraph(astNode) {
	'use strict';
	var parentStack = [];

	var exitNode = factoryFlowNode.create(FlowNode.EXIT_NODE_TYPE);
	var catchStack = [exitNode];
	createNodes(astNode);
	linkSiblings(astNode);
	
	walker(astNode, {
		CatchClause: function (node, recurse) {
			node.cfg.connect(getEntry(node.body));
			recurse(node.body);
		},
		DoWhileStatement: function (node, recurse) {
			mayThrow(node.test);
			node.test.cfg
				.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
				.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			recurse(node.body);
		},
		ExpressionStatement: connectNext,
		ClassDeclaration: function() {},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		ForStatement: function (node, recurse) {
			if (node.test) {
				mayThrow(node.test);
				node.test.cfg
					.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
					.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
				if (node.update) {
					node.update.cfg.connect(node.test.cfg);
				}
			} else if (node.update) {
				node.update.cfg.connect(getEntry(node.body));
			}
			if (node.update) {
				mayThrow(node.update);
			}
			if (node.init) {
				mayThrow(node.init);
				node.init.cfg.connect(node.test && node.test.cfg || getEntry(node.body));
			}
			recurse(node.body);
		},
		ForInStatement: function (node, recurse) {
			mayThrow(node);
			node.cfg
				.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
				.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			recurse(node.body);
		},
		IfStatement: function (node, recurse) {
			recurse(node.consequent);
			mayThrow(node.test);
			node.test.cfg.connect(getEntry(node.consequent), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);
			if (node.alternate) {
				recurse(node.alternate);
				node.test.cfg.connect(getEntry(node.alternate), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			} else {
				node.test.cfg.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			}
		},
		ReturnStatement: function (node) {
			mayThrow(node);
			node.cfg.connect(exitNode);
		},
		SwitchCase: function (node, recurse) {
			if (node.test) {
				// if this is a real case, connect `true` to the body
				// or the body of the next case
				var check = node;
				while (!check.consequent.length && check.cfg.nextSibling) {
					check = check.cfg.nextSibling.astNode;
				}
				node.cfg.connect(check.consequent.length && getEntry(check.consequent[0]) || getSuccessor(node.cfg.parent), FlowNode.TRUE_BRANCH_CONNECTION_TYPE);

				// and connect false to the next `case`
				node.cfg.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			} else {
				// this is the `default` case, connect it to the body, or the
				// successor of the parent
				node.cfg.connect(node.consequent.length && getEntry(node.consequent[0]) || getSuccessor(node.cfg.parent));
			}
			node.consequent.forEach(recurse);
		},
		SwitchStatement: function (node, recurse) {
			if(node.cases[0]){ // FIX reading properties of undefined
				node.cfg.connect(node.cases[0].cfg);
			}
			node.cases.forEach(recurse);
		},
		ThrowStatement: function (node) {
			node.cfg.connect(getExceptionTarget(node), FlowNode.EXCEPTION_CONNECTION_TYPE);
		},
		TryStatement: function (node, recurse) {

			// var handler = node.handlers[0] && node.handlers[0].cfg || getEntry(node.finalizer);
			var handler = null;
			if(node.handlers && node.handlers.length) {
				var handler = node.handlers[0] && node.handlers[0].cfg ;
			}else{
				if (node.finalizer){
					var handler = getEntry(node.finalizer);
				}	
			}
			if(handler) catchStack.push(handler);
			recurse(node.block);
			if(handler) catchStack.pop();

			if (node.handlers && node.handlers.length) {
				recurse(node.handlers[0]);
			}
			if (node.finalizer) {
				//node.finalizer.cfg.connect(getSuccessor(node));
				recurse(node.finalizer);
			}
		},
		VariableDeclaration: connectNext,
		WhileStatement: function (node, recurse) {
			mayThrow(node.test);
			node.test.cfg
				.connect(getEntry(node.body), FlowNode.TRUE_BRANCH_CONNECTION_TYPE)
				.connect(getSuccessor(node), FlowNode.FALSE_BRANCH_CONNECTION_TYPE);
			recurse(node.body);
		}
	});

	var entryNode = factoryFlowNode.create(FlowNode.ENTRY_NODE_TYPE, astNode);
	entryNode.connect(getEntry(astNode), FlowNode.NORMAL_CONNECTION_TYPE);
	walker(astNode, {default: function (node, recurse) {
		if (!node.cfg) {
			return;
		}
		// ExpressionStatements should refer to their expression directly
		if (node.type === 'ExpressionStatement') {
			node.cfg.astNode = node.expression;
		}
		delete node.cfg;
		walker.checkProps(node, recurse);
	}});

	var allNodes = [];
	var reverseStack = [entryNode];
	var cfgNode;
	while (reverseStack.length) {
		cfgNode = reverseStack.pop();
		allNodes.push(cfgNode);
		[
			FlowNode.EXCEPTION_CONNECTION_TYPE,
			FlowNode.FALSE_BRANCH_CONNECTION_TYPE,
			FlowNode.TRUE_BRANCH_CONNECTION_TYPE,
			FlowNode.NORMAL_CONNECTION_TYPE
		].forEach(eachType);
	}
	/* Actually, in esgraph, it creates a graph with only four kinds of connection types, exception, false, true and normal */
	function eachType(type) {
		var next = cfgNode[type];
		if (type === FlowNode.ON_EVENT_CONNECTION_TYPE) {
			next.forEach(function (node) {
				if (reverseStack.indexOf(node) === -1 && allNodes.indexOf(node) === -1) {
					reverseStack.push(node);
				}
			});
		} else if (!!next && reverseStack.indexOf(next) === -1 && allNodes.indexOf(next) === -1) {
			reverseStack.push(next);
		}
	}

	function getExceptionTarget() {
		return catchStack[catchStack.length - 1];
	}

	function mayThrow(node) {
		if (expressionThrows(node)) {
			node.cfg.connect(getExceptionTarget(node), FlowNode.EXCEPTION_CONNECTION_TYPE);
		}
	}
	function expressionThrows(astNode) {
		if(!astNode){
			return false;
		}
		if (typeof astNode !== 'object' || 'FunctionExpression' === astNode.type) {
			return false;
		}
		if (astNode.type && throwTypes.indexOf(astNode.type) !== -1) {
			return true;
		}
		var self = astNode;
		return Object.keys(self).some(function (key) {
			var prop = self[key];
			if (prop instanceof Array) {
				return prop.some(expressionThrows);
			} else if (typeof prop === 'object' && prop) {
				return expressionThrows(prop);
			}
			else {
				return false;
			}
		});
	}

	function getJumpTarget(astNode, types) {
		var parent = astNode.cfg.parent;
		while (types.indexOf(parent.type) === -1 && !!parent.cfg.parent) {
			parent = parent.cfg.parent;
		}
		return (types.indexOf(parent.type) !== -1) ? parent : null;
	}

	function connectNext(node) {
		mayThrow(node);
		node.cfg.connect(getSuccessor(node));
	}

	/**
	 * Returns the entry node of a statement
	 */
	function getEntry(astNode) {
		var target;
		if(!!!astNode){
			return astNode;
		}
		switch (astNode.type) {
			case 'BreakStatement':
				target = getJumpTarget(astNode, breakTargets);
				return target ? getSuccessor(target) : exitNode;
			case 'ContinueStatement':
				target = getJumpTarget(astNode, continueTargets);
				if(target){
					switch (target.type) {
						case 'ForStatement':
							// continue goes to the update, test or body
							return target.update && target.update.cfg || target.test && target.test.cfg || getEntry(target.body);
						case 'ForInStatement':
							return target.cfg;
						case 'DoWhileStatement':
						/* falls through */
						case 'WhileStatement':
							return target.test.cfg;
					}
				}else{
					return astNode.cfg;
				}
			// unreached
			/* falls through */
			case 'BlockStatement':
			/* falls through */
			case 'Program':
				return astNode.body.length && getEntry(astNode.body[0]) || getSuccessor(astNode);
			case 'DoWhileStatement':
				return getEntry(astNode.body);
			case 'EmptyStatement':
				return getSuccessor(astNode);
			case 'ForStatement':
				return astNode.init && astNode.init.cfg || astNode.test && astNode.test.cfg || getEntry(astNode.body);
			case 'ClassDeclaration':
				return getSuccessor(astNode);
			case 'FunctionDeclaration':
				return getSuccessor(astNode);
			case 'IfStatement':
				return astNode.test.cfg;
			case 'SwitchStatement':
				return getEntry(astNode.cases[0]);
			case 'TryStatement':
				return getEntry(astNode.block);
			case 'WhileStatement':
				return astNode.test.cfg;
			default:
				return astNode.cfg;
		}
	}
	/**
	 * Returns the successor node of a statement
	 */
	function getSuccessor(astNode) {
		// part of a block -> it already has a nextSibling
		if(!astNode){
			return astNode;
		}
		if (astNode.cfg.nextSibling) {
			return astNode.cfg.nextSibling;
		}
		var parent = astNode.cfg.parent;
		if (!parent) { // it has no parent -> exitNode
			return exitNode;
		}
		switch (parent.type) {
			case 'DoWhileStatement':
				return parent.test.cfg;
			case 'ForStatement':
				return parent.update && parent.update.cfg || parent.test && parent.test.cfg || getEntry(parent.body);
			case 'ForInStatement':
				return parent.cfg;
			case 'TryStatement':
				return parent.finalizer && astNode !== parent.finalizer && getEntry(parent.finalizer) || getSuccessor(parent);
			case 'SwitchCase':
				// the sucessor of a statement at the end of a case block is
				// the entry of the next cases consequent
				if (!parent.cfg.nextSibling) {
					return getSuccessor(parent);
				}
				var check = parent.cfg.nextSibling.astNode;
				while (!check.consequent.length && check.cfg.nextSibling) {
					check = check.cfg.nextSibling.astNode;
				}
				// or the next statement after the switch, if there are no more cases
				return check.consequent.length && getEntry(check.consequent[0]) || getSuccessor(parent.parent);
			case 'WhileStatement':
				return parent.test.cfg;
			default:
				return getSuccessor(parent);
		}
	}

	/**
	 * Creates a FlowNode for every AST node
	 */
	function createNodes(astNode) {
		walker(astNode, { default: function (node, recurse) {
			var parent = parentStack.length ? parentStack[parentStack.length - 1] : undefined;
			createNode(node, parent);
			// do not recurse for FunctionDeclaration or any sub-expression
			if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ClassDeclaration' || node.type.indexOf('Expression') !== -1) {
				return;
			}
			parentStack.push(node);
			walker.checkProps(node, recurse);
			parentStack.pop();
		}});
	}
	function createNode(astNode, parent) {
		if (!astNode.cfg) {
			var newNode = factoryFlowNode.create(FlowNode.NORMAL_NODE_TYPE, astNode, parent);
			Object.defineProperty(astNode, 'cfg', {value: newNode, configurable: true});
		}
	}

	/**
	 * Links in the next sibling for nodes inside a block
	 */
	function linkSiblings(astNode) {
		function backToFront(list, recurse) {
			// link all the children to the next sibling from back to front,
			// so the nodes already have .nextSibling
			// set when their getEntry is called
			for (var i = list.length - 1; i >= 0; i--) {
				var child = list[i];
				if (i < list.length - 1) {
					if(child && child.cfg){
						child.cfg.nextSibling = getEntry(list[i + 1]);
					}
					
				}
				recurse(child);
			}
		}
		function BlockOrProgram(node, recurse) {
			backToFront(node.body, recurse);
		}
		walker(astNode, {
			BlockStatement: BlockOrProgram,
			Program: BlockOrProgram,
			FunctionDeclaration: function (node, recurse) {
				// backToFront(node.body, recurse);
			}, /// Function Definitions not in the flow
			FunctionExpression: function (node, recurse) {
				// backToFront(node.body, recurse);
			},
			ClassDeclaration: function (node, recurse) {
				// backToFront(node.body, recurse);
			},
			SwitchCase: function (node, recurse) {
				backToFront(node.consequent, recurse);
			},
			SwitchStatement: function (node, recurse) {
				backToFront(node.cases, recurse);
			}
		});
	}
	/// Reset cfgIds to skip those nodes not shown in CFG
	/// Reset to the first created node in this CFG
	factoryFlowNode.setCounter(entryNode.cfgId);
	allNodes.forEach(function (node, index) {
		node.cfgId = factoryFlowNode.counter + index;
	});
	factoryFlowNode.setCounter(entryNode.cfgId + allNodes.length);
	//factoryFlowNode.setCounter(allNodes.length);
	//allNodes.forEach(function (node, index) {
	//	node.cfgId = index;
	//});
	return [entryNode, exitNode, allNodes];
}

var continueTargets = [
	'ForStatement',
	'ForInStatement',
	'DoWhileStatement',
	'WhileStatement'];
var breakTargets = continueTargets.concat(['SwitchStatement']);
var throwTypes = [
	'AssignmentExpression', // assigning to undef or non-writable prop
	'BinaryExpression', // instanceof and in on non-objects
	'CallExpression', // obviously
	'MemberExpression', // getters may throw
	'NewExpression', // obviously
	'UnaryExpression' // delete non-deletable prop
];

