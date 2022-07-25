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
    Creating a UAST by mapping esprima AST nodes to Joern output, 
    in order to be able have a 2nd static analysis engine for our analyses as well

    @Note: the implementation of this UAST feature is in-progress!

*/

const constantsModule = require('./../../lib/jaw/constants');
const JSParser = require('./../parsers/jsparser');
const esprima = require('esprima');
const uastSyntax = require('./syntax');

/**
 * Maps parser-dependent AST to a universal AST (Joern Schema)
 * @constructor
 */
function UASTMapper() {

}


/**
 * Maps an abstract syntax tree of JS esprima to Joern Schema
 * @param {json} ast
 * @returns {Object} an obj containing the graph nodes and edges
 */
UASTMapper.prototype.mapJS = async function (ast){

	var g_nodes = [];
	var g_edges = [];

	/* 
    -----------------------------
   	Esprima node types
	-----------------------------
	acessible through esprima.Syntax.*
	
    AssignmentExpression: 'AssignmentExpression',
    AssignmentPattern: 'AssignmentPattern',
    ArrayExpression: 'ArrayExpression',
    ArrayPattern: 'ArrayPattern',
    ArrowFunctionExpression: 'ArrowFunctionExpression',
    AwaitExpression: 'AwaitExpression',
    BlockStatement: 'BlockStatement',
    BinaryExpression: 'BinaryExpression',
    BreakStatement: 'BreakStatement',
    CallExpression: 'CallExpression',
    CatchClause: 'CatchClause',
    ClassBody: 'ClassBody',
    ClassDeclaration: 'ClassDeclaration',
    ClassExpression: 'ClassExpression',
    ConditionalExpression: 'ConditionalExpression',
    ContinueStatement: 'ContinueStatement',
    DoWhileStatement: 'DoWhileStatement',
    DebuggerStatement: 'DebuggerStatement',
    EmptyStatement: 'EmptyStatement',
    ExportAllDeclaration: 'ExportAllDeclaration',
    ExportDefaultDeclaration: 'ExportDefaultDeclaration',
    ExportNamedDeclaration: 'ExportNamedDeclaration',
    ExportSpecifier: 'ExportSpecifier',
    ExpressionStatement: 'ExpressionStatement',
    ForStatement: 'ForStatement',
    ForOfStatement: 'ForOfStatement',
    ForInStatement: 'ForInStatement',
    FunctionDeclaration: 'FunctionDeclaration',
    FunctionExpression: 'FunctionExpression',
    Identifier: 'Identifier',
    IfStatement: 'IfStatement',
    ImportDeclaration: 'ImportDeclaration',
    ImportDefaultSpecifier: 'ImportDefaultSpecifier',
    ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
    ImportSpecifier: 'ImportSpecifier',
    Literal: 'Literal',
    LabeledStatement: 'LabeledStatement',
    LogicalExpression: 'LogicalExpression',
    MemberExpression: 'MemberExpression',
    MetaProperty: 'MetaProperty',
    MethodDefinition: 'MethodDefinition',
    NewExpression: 'NewExpression',
    ObjectExpression: 'ObjectExpression',
    ObjectPattern: 'ObjectPattern',
    Program: 'Program',
    Property: 'Property',
    RestElement: 'RestElement',
    ReturnStatement: 'ReturnStatement',
    SequenceExpression: 'SequenceExpression',
    SpreadElement: 'SpreadElement',
    Super: 'Super',
    SwitchCase: 'SwitchCase',
    SwitchStatement: 'SwitchStatement',
    TaggedTemplateExpression: 'TaggedTemplateExpression',
    TemplateElement: 'TemplateElement',
    TemplateLiteral: 'TemplateLiteral',
    ThisExpression: 'ThisExpression',
    ThrowStatement: 'ThrowStatement',
    TryStatement: 'TryStatement',
    UnaryExpression: 'UnaryExpression',
    UpdateExpression: 'UpdateExpression',
    VariableDeclaration: 'VariableDeclaration',
    VariableDeclarator: 'VariableDeclarator',
    WhileStatement: 'WhileStatement',
    WithStatement: 'WithStatement',
    YieldExpression: 'YieldExpression'
    */


    /* 
    -----------------------------
    Esprima assignment operators 
	-----------------------------
 	a +=b	a = a + b	Adds 2 numbers and assigns the result to the first.
	a -= b	a = a - b	Subtracts 2 numbers and assigns the result to the first.
	a *= b	a = a*b	Multiplies 2 numbers and assigns the result to the first.
	a /=b	a = a/b	Divides 2 numbers and assigns the result to the first.
	a %= b	a = a%b	Computes the modulus of 2 numbers and assigns the result to the first.
	a<<=b	a = a<<b	Performs a left shift and assigns the result to the first operand.
	a>>=b	a = a>>b	Performs a sign-propagating right shift and assigns the result to the first operand.
	a>>>=b	a = a>>>b	Performs a zero-fill right shift and assigns the result to the first operand.
	a&= b	a = a&b	Performs a bitwise AND and assigns the result to the first operand.
	a^= b	a = a^b	Performs a bitwise XOR and assigns the result to the first operand.
	a |=b	a = a|b	Performs a bitwise OR and assigns the result to the first operand.
	-----------------------------
	*/

    const esprimaAssignmentOperators = {
		'assignment': '=',
		'assignmentPlus' :'+=',
		'assignmentMinus'	:'-=',
		'assignmentMultiplication'	:'*=',
		'assignmentExponentiation'	:'**=',
		'assignmentDivision'	:'/=',
		'assignmentModulo'	:'%=',
		'assignmentShiftLeft'	:'<<=',
		'ssignmentLogicalShiftRight'	:'>>=',
		'assignmentArithmeticShiftRight'	:'>>>=',
		'assignmentAnd'	:'&=',
		'assignmentOr'	:'|=',
		'assignmentXor'	:'^='
 	}



	/* traverse the graph */
    await JSParser.traverseAST(ast, function(node){

    	if(node.type === esprima.Syntax.AssignmentExpression){
    		
    		// add edges to left and right children
    		if(node.left && node.left._id){
    			g_edges.push({
    				'fromId': node._id,
    				'toId': node.left._id // TODO: when is node.left node added to the graph? MUST set the ORDER to 1 on that node
    			})
    		}
    		if(node.right && node.right._id){
    			g_edges.push({
    				'fromId': node._id,
    				'toId': node.right._id // TODO: when is node.right node added to the graph? MUST set the ORDER to 2 on that node
    			});
    		}

    		// left: ArrayPattern, Identifier,
    		// right: CallExpression, FunctionExpression, ArrayPattern, Identifier, Literal, BinaryExpression

    		// add the operator node 
    		if(node.operator){ // check if operator property exists

    			if(node.operator == esprimaAssignmentOperators.assignment){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignment,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentPlus){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentPlus,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentMinus){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentMinus,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentMultiplication){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentMultiplication,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentExponentiation){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentExponentiation,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentDivision){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentDivision,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentModulo){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentModulo,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentShiftLeft){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentShiftLeft,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.ssignmentLogicalShiftRight){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_ssignmentLogicalShiftRight,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentArithmeticShiftRight){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentArithmeticShiftRight,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentAnd){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentAnd,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentOr){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentOr,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}

    			if(node.operator == esprimaAssignmentOperators.assignmentXor){
    				g_nodes.push({
    					'NodeId': node._id,
    					'NodeType': uastSyntax.op_assignmentXor,
    					'Operator': node.operator,
    					'Location': node.loc,
    				})
    			}
    		} // [ end if node.operator ] 
    	} // [ end if node.type =  esprima.Syntax.AssignmentExpression ]

    	else if (node.type == esprima.Syntax.Identifier) {
    		// map to IDENTIFIER only
    		// TODO: mapping to METHOD_PARAMETER_IN should take place on function expression nodes 

    		g_nodes.push({
    			'NodeId': node._id,
    			'NodeType': uastSyntax.IDENTIFIER,
    			'Location': node.loc,
    			'CODE': node.name,
    			'NAME': node.name,
    			'ORDER': '',
    			'ARGUMENT_INDEX': '',
    			'TYPE_FULL_NAME': ''
    		});
    	} // [end if node.type == esprima.Syntax.Identifier]



    });



    return {'nodes': g_nodes, 'edges': g_edges}

}



var mapper = new UASTMapper();
module.exports = mapper;

