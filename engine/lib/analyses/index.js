/**
 * From the repository: analyses (https://github.com/Swatinem/analyses)
 * @license LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0-standalone.html)
 */
var Queue = require('./queue'),
	Set = require('./set'),
	Map = require('core-js/es6/map'),
	exports = module.exports = worklist;

// expose the utilities to have them tested separately
exports.Queue = Queue;
exports.Set = Set;
exports.examples = require('./examples');

/**
 * Implementation of a general worklist algorithm
 * `cfg` is a control flow graph created by `esgraph`,
 * `transferFunction` gets called with (this = node, input, worklist)
 * it operates on the input `Set` and can return an output set, in which case
 * the worklist algorithm automatically enqueues all the successor nodes, or it
 * might return an {output: output, enqueue: false} object in which case it is
 * itself responsible to enqueue the successor nodes.
 * `options` defines the `direction`, a `merge` function and an `equals`
 * function which merge the inputs to a node and determine if a node has changed
 * its output respectively.
 * Returns a `Map` from node -> output
 */
function worklist(cfg, transferFunction, options) {
	'use strict';
	if(!(cfg && cfg.length)) {
		console.log('[warning] worklist algorithm did not found a valid cfg!')
		return;
	}
	options = options || {};
	var direction = options.direction || 'forward';
	var merge = options.merge || worklist.merge(Set.union);
	var equals = options.equals || Set.equals;
	var list = new Queue();
	var predecessors;
	var successors;
	if (direction === 'forward') {
		list.push(cfg[0]);
		predecessors = worklist.predecessors;
		successors = worklist.successors;
	} else {
		list.push(cfg[1]);
		predecessors = worklist.successors;
		successors = worklist.predecessors;
	}
	var start = options.start || new Set();

	var output = new Map();
	var inputs = new Map();
	function predecessorsMappingHandler(node) {
		return output.get(node);
	}
	function updateSuccessorHandler(node) {
		list.push(node);
	}

	while (list.length) {
		var node = list.shift();
		var pre = predecessors(node)
			.map(predecessorsMappingHandler);
		var input = pre.length ? merge(pre) : start;
		inputs.set(node, input);
		var oldOutput = output.get(node);
		var out = transferFunction.call(node, input, list, oldOutput);
		if (!out || out instanceof Set) {
			out = {output: out, enqueue: true};
		}
		output.set(node, out.output);
		if (out.enqueue && (!oldOutput || !equals(out.output, oldOutput))) {
			successors(node).forEach(updateSuccessorHandler);
		}
	}
	return {inputs: inputs, outputs: output};
};

worklist.predecessors = function (node) {
	'use strict';
	return node.prev;
};
worklist.successors = function (node) {
	'use strict';
	return node.next;
};

worklist.merge = function (fn) {
	'use strict';
	return function (inputs) {
		if (inputs.length === 1) {
			return new Set(inputs[0]);
		}
		return inputs.reduce(fn);
	};
};

