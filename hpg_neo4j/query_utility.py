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
	---------------
	Neo4j utility functions

	Usage:
	---------------
	> import hpg_neo4j.query_utility as neo4jQueryUtilityModule


"""


# -------------------------------------------------------------------------- #
#		Neo4j Utility Queries
# -------------------------------------------------------------------------- #


def get_cfg_level_nodes_for_statements():

	TOP_LEVEL_NODES = [
		"ExpressionStatement",
		"VariableDeclaration",
	]

	return TOP_LEVEL_NODES


def get_ast_parent(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return immediate parent of an AST node
	"""

	query = """
	MATCH (parent)-[:AST_parentOf]->(child {Id: '%s'})
	RETURN parent
	"""%(node['Id'])

	results = tx.run(query)
	for record in results:
		child = record['parent']
		return child

	return None


def get_ast_topmost(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return topmost parent of an AST node
	"""
	parent = get_ast_parent(tx, node)

	CFG_LEVEL_STATEMENTS = get_cfg_level_nodes_for_statements()
	done = False
	while not done:
		grand_parent = get_ast_parent(tx, parent)
		if grand_parent is None:
			done = True
			return parent

		if grand_parent['Type'] in CFG_LEVEL_STATEMENTS:
			done = True
			break
		else:
			parent = grand_parent # loop

	return grand_parent

def get_code_expression(wrapper_node, is_argument = False, relation_type='', short_form=True):

	"""
	@param {dict} wrapper_node
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = {}
	literals = []

	node = wrapper_node['node']
	children = wrapper_node['children']
	
	if 'Type' in node:
		ntype = node['Type']
	else:
		ntype = ''

	if ntype == 'Literal':
		value =  node['Value']
		raw = node['Raw']
		if value:
			if (value == '{}') and (raw.strip('\'').strip("\"").strip() != value):
				value = "\"%s\""%raw
				literals.append(value)
				return [value, literals, idents]
			else:
				value = "\"%s\""%value
				literals.append(value)
				return [value, literals, idents]
		else:
			return ['\"\"', literals, idents]

	elif ntype == 'Identifier':
		value =  node['Code']
		if value:
			nid = str(node['Id'])
			idents[value] = nid
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'ThisExpression':
		nid = str(node['Id'])
		idents['ThisExpression']= nid # add ThisStatment to Idents for Pointer Resolution
		return ['this', literals, idents]


	elif ntype == 'LogicalExpression':

		opertor = node['Code']
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]
		
	elif ntype == 'IfStatement':

		if len(children) == 2:
			[consequent, lits2, ids2] = get_code_expression(children[0])
			[test, lits1, ids1] = get_code_expression(children[1])
			value = 'if(%s){ %s }'%(test, consequent)

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			return [value, literals, idents]
		elif len(children) == 3:
			[alternate, lits1, ids1] = get_code_expression(children[0])
			[consequent, lits2, ids2] = get_code_expression(children[1])
			[test, lits3, ids3] = get_code_expression(children[2])
			value = 'if(%s){ %s } else{ %s }'%(test, consequent, alternate)

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			return [value, literals, idents]

	elif ntype == 'ConditionalExpression':
		
		[alternate, lits1, ids1] = get_code_expression(children[0])
		[consequent, lits2, ids2] = get_code_expression(children[1])
		[test, lits3, ids3] = get_code_expression(children[2])
		value = '(%s)? %s: %s'%(test, consequent, alternate)

		literals.extend(lits1)
		literals.extend(lits2)
		literals.extend(lits3)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		idents = {**idents, **ids3}

		return [value, literals, idents]

	elif ntype == 'NewExpression':
		[callee, lits1, ids1] = get_code_expression(children[0])
		literals.extend(lits1)
		idents = {**idents, **ids1}
		value = 'new '+ callee + '()'
		return [value, literals, idents]

	elif ntype == "Property":
		[key, lits1, ids1] = get_code_expression(children[1])
		[value, lits2, ids2] = get_code_expression(children[0])
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		literals.extend(lits1)
		literals.extend(lits2)
		value = ["%s: %s"%(str(key), str(value)), literals, idents]
		return [value, literals, idents]

	elif ntype == 'ObjectExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= get_code_expression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '{ '  + ', '.join(tempt) + ' }'
			return [value, literals, idents]
		else:
			return ['{ }', literals, idents]

	elif ntype == 'ArrayExpression':
		if len(children) > 0:
			tempt = []
			for ch in children:
				[prop, lits, ids]= get_code_expression(ch)
				idents = {**idents, **ids}
				literals.extend(lits)
				if(isinstance(prop, list)):
					tempt.append(prop[0])
				else:
					tempt.append(prop)

			value = '[ '  + ', '.join(tempt) + ' ]'
			return [value, literals, idents]
		else:
			return ['[ ]', literals, idents]

	elif ntype == 'CallExpression':

		if len(children) == 0: # call with no argument 
			[callee, lits1, ids1] = get_code_expression(children[0])
			args = ''
			value = str(callee) + '(' +  args + ')'
			return [value, literals, idents]

		else:
			args = []
			callee = ''
			for i in range(len(children)):
				ch = children[i]
				[expr_i, lits_i, ids_i] = get_code_expression(ch)
				idents = {**idents, **ids_i}
				literals.extend(lits_i)
				if i == len(children)-1:
					# this is the name of the caller
					if(isinstance(expr_i, list)):
						callee = expr_i[0]
					else:
						callee = expr_i
				else:
					# this is a call argument
					if(isinstance(expr_i, list)):
						args.append(expr_i[0])
					else:
						args.append(expr_i)

			args = args[::-1] # reverse the args list order 
			value = str(callee) + '(' + ', '.join(args) + ')'
			return [value, literals, idents]

	elif ntype == 'UpdateExpression':
		operator = node['Code']
		ch = children[0]
		[arg, lits, ids] = get_code_expression(ch)
		idents = {**idents, **ids}
		literals.extend(lits)
		value = arg+ operator
		return [value, literals, idents]

	elif ntype == 'VariableDeclaration':
		# can also add node['Kind'] to the return value (e.g., var, let, const)
		kind = node['Kind']
		declarations = []
		for ch in children:
			[expr_i, lits_i, ids_i] = get_code_expression(ch)
			idents = {**idents, **ids_i}
			literals.extend(lits_i)

			if(isinstance(expr_i, list)):
				code = expr_i[0]
			else:
				code = expr_i
			code = expr_i
			declarations.append(code)

		declarations = declarations[::-1]
		value = str(kind) + ' ' + ', '.join(declarations)
		return [value, literals, idents]

	elif ntype == 'VariableDeclarator':

		if len(children) == 1:
			[left, lits, ids] = get_code_expression(children[0])
			literals.extend(lits)
			idents = {**idents, **ids}
			value = left;
			return [value, literals, idents]
		else:
			opertor = node['Code']
			[right, lits1, ids1] = get_code_expression(children[0])
			[left, lits2, ids2] = get_code_expression(children[1])
			value = str(left) + ' ' + opertor + ' ' + str(right)
			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
		return [value, literals, idents]


	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression':
		opertor = node['Code']
			
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = get_code_expression(children[0])
		[left, lits2, ids2] = get_code_expression(children[1])

		if node['Computed'] == 'true' or right in lits1: # if right is literal
			value = str(left) + '[' + str(right) + ']'
		else: # right is identifer or compound member expr
			value = str(left) + opertor + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'CatchClause':
		args = []
		body = ''
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[body, lits_i, ids_i] = get_code_expression(ch)
			else:
				[arg_i, lits_i, ids_i] = get_code_expression(ch)
				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'catch( ' + ','.join(args) + ' ){ %s'%(body) + ' }'
		return [value, literals, idents]	
		
	elif ntype == 'TryStatement':
		if len(children) == 2:

			[catch_block, lits2, ids2] = get_code_expression(children[0])
			[try_block, lits1, ids1] = get_code_expression(children[1])

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			value = 'try{ %s } %s'%(try_block, catch_block)
			return [value, literals, idents] 

		elif len(children) == 3:
			[finally_block, lits3, ids3] = get_code_expression(children[0])
			[catch_block, lits2, ids2] = get_code_expression(children[1])
			[try_block, lits1, ids1] = get_code_expression(children[2])

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			value = 'try{ %s } %s finally{ %s }'%(try_block, catch_block, finally_block)
			return [value, literals, idents] 

	elif ntype == 'FunctionExpression':
		args = []
		block = '...'
		for ch in children:
			if ch['node']['Type'] == 'BlockStatement':
				[block, lits_i, ids_i] = get_code_expression(ch)	
			else:
				[arg_i, lits_i, ids_i] = get_code_expression(ch)

				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function(' + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	

	elif ntype == 'FunctionDeclaration':
		args = []
		function_name = 'function_name'
		block = '...'
		n_childs = len(children)
		for i in range(n_childs):
			ch = children[i]
			if ch['node']['Type'] == 'BlockStatement':
				if not short_form:
					[block, lits_i, ids_i] = get_code_expression(ch)	
			else:
				if i == n_childs-1: # function name
					[fname, lits_i, ids_i] = get_code_expression(ch) 
					function_name = fname
				else:
					[arg_i, lits_i, ids_i] = get_code_expression(ch)
					args.append(arg_i)


				literals.extend(lits_i)
				idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function %s('%(function_name) + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	

	else:
		expr = []
		for childWrapperNode in children:
			result = get_code_expression(childWrapperNode)
			currentExpr = result[0]
			lits = result[1]
			ids = result[2]
			expr.append(currentExpr)
			literals.extend(lits)
			idents = {**idents, **ids}

		expr = expr[::-1]
		if is_argument:
			return [ ','.join(expr), literals, idents]
		else:
			return [ '; '.join(expr), literals, idents]



def getChildsOf(tx, node, relation_type=''):
	"""
	@param {pointer} tx
	@param {node object} node
	@param {string} relation_type
	@return {dict}: wrapperNode= a dict containing the parse tree with its root set to input node, format: {'node': node, 'children': [child_node1, child_node2, ...]} 
	"""

	outNode =  {'node': node, 'children': []} # wrapper around neo4j node
	nodeId = node['Id']
	if relation_type != '':
		query= """
		MATCH (root { Id: '%s' })-[:AST_parentOf { RelationType: '%s'}]->(child) RETURN collect(distinct child) AS resultset
		"""%(nodeId, relation_type)
	else:
		query= """
			MATCH (root { Id: '%s' })-[:AST_parentOf]->(child) RETURN collect(distinct child) AS resultset
			"""%(nodeId)

	results = tx.run(query)
	for item in results:
		childNodes = item['resultset']
		for childNode in childNodes:
			outNode['children'].append(getChildsOf(tx, childNode))
	return outNode


