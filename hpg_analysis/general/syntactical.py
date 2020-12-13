# -*- coding: utf-8 -*-

"""
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


	Description:
	------------
	Utility Traversals for Syntactical Operations on AST

	Usage:
	-----------
	import hpg_analysis.general.syntactical

"""



import hpg_neo4j.orm as ORM


class SyntaxTree:

	@staticmethod
	def get_orm_handle():
		return ORM.ASTNode


	@staticmethod
	def get_literals():
		return ORM.ASTNode.nodes.filter(Type='Literal').all()

	@staticmethod
	def get_literal_strings():
		strings = []
		nodes = SyntaxTree.get_literal_nodes()
		for n in nodes:
			if n.Value is not None and n.Raw.startswith("'"):
				strings.append(n.Value)
		return strings

	@staticmethod
	def get_literal_variables():
		variables = []
		nodes = SyntaxTree.get_literal_nodes()
		for n in nodes:
			if n.Value is not None and not n.Raw.startswith("'"):
				variables.append(n.Value)
		return variables		

	@staticmethod
	def get_identifiers():
		return ORM.ASTNode.nodes.filter(Type='Identifier').all()	

	@staticmethod
	def get_variable_declarations():
		return ORM.ASTNode.nodes.filter(Type='VariableDeclaration').all()

	@staticmethod
	def get_variable_declarators():
		return ORM.ASTNode.nodes.filter(Type='VariableDeclarator').all()

	@staticmethod
	def get_call_expressions():
		return ORM.ASTNode.nodes.filter(Type='CallExpression').all()

	@staticmethod
	def get_yield_expressions():
		return ORM.ASTNode.nodes.filter(Type='YieldExpression').all()

	@staticmethod
	def get_function_expressions():
		return ORM.ASTNode.nodes.filter(Type='FunctionExpression').all()

	@staticmethod
	def get_function_declarations():
		return ORM.ASTNode.nodes.filter(Type='FunctionDeclaration').all()

	@staticmethod
	def get_class_expressions():
		return ORM.ASTNode.nodes.filter(Type='ClassExpression').all()

	@staticmethod
	def get_expression_statements():
		return ORM.ASTNode.nodes.filter(Type='ExpressionStatement').all()

	@staticmethod
	def get_this_expressions():
		return ORM.ASTNode.nodes.filter(Type='ThisExpression').all()	

	@staticmethod
	def get_conditional_expressions():
		return ORM.ASTNode.nodes.filter(Type='ConditionalExpression').all()	

	@staticmethod
	def get_if_statements():
		return ORM.ASTNode.nodes.filter(Type='IfStatement').all()	

	@staticmethod
	def get_assignment_expressions():
		return ORM.ASTNode.nodes.filter(Type='AssignmentExpression').all()	

