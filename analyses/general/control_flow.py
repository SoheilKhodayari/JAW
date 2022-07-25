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
	--------------
	Reachability analysis

	Algorithm:
	--------------
	1. given a node id, retrieve its parent function/scope.
	2. if no such function, assume it is triggered upon page `onload` 
	3. Search where this parent function is called 
	4. If nothing has been found, return `unreachable`
	5. If it is called inside an event listener, return `event-name` on `event-selector`
	6. goto 1

"""

import hpg_neo4j.query_utility as QU
import hpg_neo4j.db_utility as DU

def do_reachability_analysis(tx, node, input_is_top=False):

	# return values
	NORMAL_PAGE_LOAD = 'onPageLoad' # reachable at page load
	UNREACHABLE = 'unreachable' # not reachable

	if input_is_top:
		top_expression = node
	else:
		top_expression = QU.get_ast_topmost(tx, {'Id': node['Id']})
	
	query = """
	MATCH (n { Id: '%s'})<-[:CFG_parentOf*]-(block_node)
	WHERE block_node.Type = 'Program' OR block_node.Type = 'BlockStatement'
	OPTIONAL MATCH (block_node)<-[:AST_parentOf {RelationType: 'body'}]-(function_expr {Type: 'FunctionExpression'})
	OPTIONAL MATCH (function_expr)-[:AST_parentOf {RelationType: 'id'}]->(function_def_id {Type: 'Identifier'})
	RETURN block_node, function_expr, function_def_id
	"""%(top_expression['Id'])
	
	results = tx.run(query)
	for element in results:
		block_node = element['block_node']
		function_expr = element['function_expr']
		function_def_id = element['function_def_id']
		if block_node['Type'] == 'Program':
			return NORMAL_PAGE_LOAD
		else:
			if function_def_id is not None:
				# search for all locations where this `FunctionDefiniton` is called
				query1="""
				MATCH (call_expr {Type: 'CallExpression'})-[:AST_parentOf]->(callee { Type: 'Identifier', Code: '%s'})
				RETURN call_expr
				"""%(function_def_id['Code'])
				results1 = tx.run(query1)
				for element1 in results1:
					call_expr = element1['call_expr']
					tag = do_reachability_analysis(tx, call_expr)
					if tag != UNREACHABLE:
						return tag

				 # case 2: func name is used later in an event handler, e.g, YAHOO.util.Event.onContentReady('ajaxUI-history-field', SUGAR.ajaxUI.firstLoad);
				query2="""
				MATCH (callee { Type: 'Identifier', Code: '%s'})<-[:AST_parentOf*1..6]-(call_expr {Type: 'CallExpression'})
				RETURN call_expr
				"""%(function_def_id['Code'])
				results2 = tx.run(query2)
				output_event_registrators = []
				for element2 in results2:
					call_expr = element2['call_expr']
					top_expr = QU.get_ast_topmost(tx, call_expr)
					output_event_registrators.append([call_expr, top_expression, NORMAL_PAGE_LOAD]) # is top_expression required ? (e.g., for printing purposes of getAdvancedCodeExpression)

				if len(output_event_registrators) > 0:
					return output_event_registrators

				return UNREACHABLE

			else:
				if function_expr is None:
					return UNREACHABLE

				# 1) function expression is an argument of an event handler registrator
				query3="""
				MATCH (callee { Id: '%s'})<-[:AST_parentOf*1..6]-(call_expr {Type: 'CallExpression'})
				RETURN call_expr
				"""%(function_expr['Id'])
				results3 = tx.run(query3)
				output_event_registrators = []
				for element3 in results3:
					call_expr = element3['call_expr']
					top_expr = QU.get_ast_topmost(tx, call_expr)
					output_event_registrators.append([call_expr, top_expression]) # is top_expression required ? (e.g., for printing purposes of getAdvancedCodeExpression). or NOT?

				if len(output_event_registrators) > 0:
					return output_event_registrators				

				# 2) function expression is in an object expression
				# @Note: for member expressions, we find all objects with the same pointer name in call expressions (consider all potential cases, but may end in false positive)
				query4="""
				MATCH (func_expr { Id: '%s'})<-[:AST_parentOf {RelationType: 'value'}]-(prop {Type: 'Property'})<-[:AST_parentOf {RelationType: 'properties'}]-(obj_expr {Type: 'ObjectExpression'})<-[:AST_parentOf]-(t)<-[:AST_parentOf]-(tt)
				OPTIONAL MATCH (t)-[r:AST_parentOf]->(c1_name {Type: 'Identifier'}) 
				WHERE r.RelationType='left' or r.RelationType='id'
				OPTIONAL MATCH (t)-[r:AST_parentOf]->(c2_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(c2_name {Type: 'Identifier'}) 
				WHERE r.RelationType='left' or r.RelationType='id'
				RETURN tt, c1_name, c2_name
				"""
				results4 = tx.run(query4)
				for element4 in results4:
					top_expr = element4 ['tt']
					function_name = element4['c1_name']
					if function_name is None:
						function_name = element4['c2_name']
					if function_name is None:
						continue

					query5="""
					MATCH (callee { Type: 'Identifier', Code: '%s'})<-[:AST_parentOf*1..8]-(call_expr {Type: 'CallExpression'})
					RETURN call_expr
					"""%(function_name['Code'])
					results5= tx.run(query5)
					for element5 in results5:
						call_expr = element5['call_expr']
						tag = do_reachability_analysis(tx, call_expr)
						if tag != UNREACHABLE:
							return tag

				return UNREACHABLE

