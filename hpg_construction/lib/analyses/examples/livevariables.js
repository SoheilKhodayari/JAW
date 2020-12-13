/**
 * From the repository: analyses (https://github.com/Swatinem/analyses)
 * @license LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0-standalone.html)
 */
var walkes = require('walkes');
var worklist = require('../');
var Set = require('../set');

module.exports = liveVariables;

function liveVariables(cfg) {
	return worklist(cfg, function (input) {
		if (this.type || !this.astNode)
			return input;
		var kill = this.kill = this.kill || findAssignments(this.astNode);
		var generate = this.generate = this.generate || findVariables(this.astNode);
		return Set.union(Set.minus(input, kill), generate);
	}, {direction: 'backward'}).outputs;
}

function findAssignments(astNode) {
	var variables = new Set();
	walkes(astNode, {
		AssignmentExpression: function (node, recurse) {
			if (node.left.type === 'Identifier')
				variables.add(node.left.name);
			recurse(node.right);
		},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		VariableDeclarator: function (node, recurse) {
			variables.add(node.id.name);
			if (node.init)
				recurse(node.init);
		}
	});
	return variables;
}
function findVariables(astNode) {
	var variables = new Set();
	walkes(astNode, {
		AssignmentExpression: function (node, recurse) {
			if (node.left.type !== 'Identifier')
				recurse(node.left);
			recurse(node.right);
		},
		FunctionDeclaration: function () {},
		FunctionExpression: function () {},
		Identifier: function (node) {
			variables.add(node.name);
		},
		MemberExpression: function (node, recurse) {
			recurse(node.object);
		},
		Property: function (node, recurse) {
			recurse(node.value);
		},
		VariableDeclarator: function (node, recurse) {
			recurse(node.init);
		}
	});
	return variables;
}

