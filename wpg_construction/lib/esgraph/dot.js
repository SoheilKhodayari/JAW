/*
 * From the repository: esgraph (https://github.com/Swatinem/esgraph)
 * @license LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0-standalone.html)
 */
var FlowNode = require('./flownode');
module.exports = dot;

function dot(cfg, options) {
	options = options || {};
	var counter = options.counter || 0;
	var source = options.source;

	var output = [];
	var nodes = cfg[2];
	var i;
	var node;
	// print all the nodes:
	for (i = 0; i < nodes.length; i++) {
		node = nodes[i];
		var label = node.label || ((node.type !== FlowNode.NORMAL_NODE_TYPE)? node.type : null);
		if (!label && source && node.astNode.range) {
			var ast = node.astNode;
			var range = ast.range;
			var add = '';
			// special case some statements to get them properly printed
			if (ast.type === 'SwitchCase') {
				if (ast.test) {
					range = [range[0], ast.test.range[1]];
					add = ':';
				} else {
					range = [range[0], range[0]];
					add ='default:';
				}
			} else if (ast.type === 'ForInStatement') {
				range = [range[0], ast.right.range[1]];
				add = ')';
			} else if (ast.type === 'CatchClause') {
				range = [range[0], ast.param.range[1]];
				add = ')';
			}

			label = source.slice(range[0], range[1])
				.replace(/\n/g, '\\n')
				.replace(/\t/g, '    ')
				.replace(/"/g, '\\"') + add;
		}
		if (!label && node.astNode) {
			label = node.astNode.type;
		}
		output.push('n' + (counter + i) + ' [label="' + label + '"');
		if ([
				FlowNode.ENTRY_NODE_TYPE,
				FlowNode.EXIT_NODE_TYPE,
				FlowNode.CALL_NODE_TYPE,
				FlowNode.CALL_RETURN_NODE_TYPE,
				FlowNode.LOOP_NODE_TYPE,
				FlowNode.LOOP_RETURN_NODE_TYPE
			].indexOf(node.type) !== -1) {
			output.push(', shape="ellipse", style="filled", fillcolor="yellow"');
		} else if (node.type === FlowNode.LOCAL_STORAGE_NODE_TYPE) {
			output.push(', shape="doublecircle", style="filled", fillcolor="orange"');
		}
		output.push(']\n');
	}

	// print all the edges:
	for (i = 0; i < nodes.length; i++) {
		node = nodes[i];
		FlowNode.CONNECTION_TYPES.forEach(eachType);
	}
	function eachType(type) {
		var next = node[type];
		if (!next || (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) !== -1 && next.length === 0)) {
			return;
		}

		if (FlowNode.MULTI_CONNECTION_TYPE.indexOf(type) === -1) {
			output.push('n' + (counter + i) + ' -> n' + (counter + nodes.indexOf(next)) + ' [');
			if (type === FlowNode.EXCEPTION_CONNECTION_TYPE) {
				output.push('color="red", label="exception"');
			} else if ([FlowNode.TRUE_BRANCH_CONNECTION_TYPE, FlowNode.FALSE_BRANCH_CONNECTION_TYPE].indexOf(type) !== -1) {
				output.push('label="' + type + '"');
			} else if (type === FlowNode.CALL_CONNECTION_TYPE) {
				output.push('color="blue", label = "call"');
			} else if (FlowNode.DATAFLOW_CONNECTION.indexOf(type) !== -1) {
				output.push('style="dotted"');
			}
			output.push(']\n');
		} else {
			next.forEach(function (nextNode) {
				"use strict";
				if (nodes.indexOf(nextNode) !== -1) {
					output.push('n' + (counter + i) + ' -> n' + (counter + nodes.indexOf(nextNode)) + ' [');
					if (type === FlowNode.RETURN_CONNECTION_TYPE) {
						output.push('color="blue", label="return"');
					} else if (type === FlowNode.ON_EVENT_CONNECTION_TYPE) {
						output.push('color="green", label = "onEvent"');
					} else if (FlowNode.DATAFLOW_CONNECTION.indexOf(type) !== -1) {
						output.push('style="dotted"');
					}
					output.push(']\n');
				}
			});
		}
	}

	if (options.counter !== undefined) {
		options.counter += nodes.length;
	}

	return output.join('');
}

