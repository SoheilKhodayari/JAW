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
	---------
	Data flow utility traversal functions 
	
	Usage:
	---------
	import hpg_analysis.general.dataflow

	Test Run:
	---------
	python3 -m hpg_analysis.general.dataflow

"""

import hpg_neo4j.query_utility as QU
import hpg_neo4j.db_utility as DU
import constants as constantsModule
import neomodel


## ------------------------------------------------------------------------------- ## 
## Utility Functions
## ------------------------------------------------------------------------------- ## 
def pretty_print_program_slices(slices):
	"""
	Description:
	---------------
	gets the program slices from get_varname_value_from_context() function
	and pretty prints them

	@param {list} slices
	@return {void}
	"""

	def _get_line_of_location(esprima_location_str):
		"""
		@param esprima_location_str
		@return start line numnber of esprima location object
		"""
		start_index = esprima_location_str.index('line:') + len('line:')
		end_index = esprima_location_str.index(',')
		out = esprima_location_str[start_index:end_index]
		return out


	for i in range(len(slices)):
		s= slices[i]
		location =_get_line_of_location(s[-1])
		print("Slice %s- [[ Line: %s ]]: %s\n"%(i+1, location, s[0]))


# def example_usage_data_flow():
# 	"""
# 	Example function demonstrating the usage of pretty_print_program_slices()
# 	"""
# 	varname = 'a'
# 	context_node = {'Id': 15}
# 	slices = get_varname_value_from_context(varname, context_node)
# 	pretty_print_program_slices(slices)



def _get_location_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} node id string
	"""
	start_index = nid_string.index('__Loc=') + len('__Loc=')
	return nid_string[start_index:]

def _get_node_id_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} location string
	"""
	start_index = nid_string.find('__nid=')
	if start_index != -1:
		start_index = start_index + len('__nid=')
	else:
		start_index = 0 # handle the case where function name is not stored at the begining

	end_index = nid_string.index('__Loc=')
	return nid_string[start_index:end_index]


	
## ------------------------------------------------------------------------------- ## 
## Interface Functions
## ------------------------------------------------------------------------------- ## 


def get_varname_value_from_context(varname, context_node):
	"""
	Description:
	------------
	Data flow analysis

	@param {string} varname
	@param {dict} context_node: node specifying the CFG-level statement where varname is defined
	@return {list}: a 2d list where each entry is of the following format
		[program_slice, literals, dict of identifer mapped to identifer node is, location dict]

	"""
	return DU.exec_fn_within_transaction(_get_varname_value_from_context, varname, context_node)



def get_this_pointer_resolution(tx, this_node):
	
	"""
	@param {pointer} tx: neo4j db handle
	@param {dict|node} this_node: `ThisExpression` node 
	@description
	   `ThisExpression` pointer analysis
		1. In a method, this refers to the owner object.
		2. Alone, this refers to the global object.
		3. In a function, this refers to the global object.
		4. In a function, in strict mode, this is undefined.
		5. In an event, this refers to the element that received the event.
		6. Methods like call(), and apply() can refer this to any object.
	@return {dict} pointer resolutions of the given `ThisExpression`
	"""


	global SITE_ID
	this_expression_node_id = this_node['Id']
	out = {'events':[], 'methods': []}

	###  STEP 1: inspect if pointer-analysis is already done and is in DB
	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'top', Arguments: 'pointsTo=window'}]->(top_node)
	return top_node as top
	"""%(this_expression_node_id)
	results = tx.run(pointer_query)

	shouldTerminate = False
	for item in results:
		top = item['top']
		owner = owner = constantsModule.WINDOW_GLOBAL_OBJECT
		out['methods'].append({'top': top, 'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'top'}]->(top_node),
	(this_node { Id: '%s'})-[:pointsTo {RelationType: 'owner'}]->(owner_node)
	return top_node as top, owner_node as owner
	"""%(this_expression_node_id, this_expression_node_id)
	results = tx.run(pointer_query)
	for item in results:
		top = item['top']
		owner = item['owner']
		out['methods'].append({'top': top, 'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	pointer_query="""
	MATCH (this_node { Id: '%s'})-[:pointsTo {RelationType: 'owner', Arguments: 'pointsTo=eventSelector'}]->(owner_node)
	return owner_node as owner
	"""%(this_expression_node_id)
	results = tx.run(pointer_query)
	for item in results:
		owner = item['owner']
		out['events'].append({'owner': owner})
		shouldTerminate = True
	if shouldTerminate:
		return out

	### ---- END STEP 1 ---- ###

	### STEP 2: do the pointer-analysis 

	# handle ThisStatement in events
	query="""
	MATCH (this_st {Id: '%s'})<-[:AST_parentOf*1..10]-(n {Type: 'FunctionExpression'})<-[r:ERDG]-(top_node)
	RETURN r
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		relation = item['r']
		out['events'].append({'relation': relation}) # r['args'].split('___')[1] = id of the node that `this` refers to it


	# handle ThisStatement in functions (may resolve to global object, i.e., window, or to the owner object, if they are lator assigned to a member expression)
	# assignment expr, or var declaration:    										   (right/init)		assign_expr/declarator
	query="""
		MATCH (this_st { Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf]-(expr)-[r:AST_parentOf]->(function_name), (expr)<-[:AST_parentOf]-(top)
		WHERE r.Type= 'left' OR r.Type= 'id'
		OPTIONAL MATCH (p1 {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'right'}]->(c1 {Type: 'Identifier', Value: function_name.Code}), 
		(p1)-[:AST_parentOf {RelationType: 'left'}]->(c2 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(owner {Type: 'Identifier'})
		OPTIONAL MATCH (function_name)-[:AST_parentOf {RelationTYpe: 'object'}]->(true_owner {Type: 'Identifier'})
		RETURN
		CASE function_name.Type
		WHEN 'Identifier' THEN [top, function_name, owner]
		WHEN 'MemberExpression' THEN [top, true_owner]
		ELSE 'xx'
		END
	"""%this_expression_node_id
	# if owner is null,  then `this` refers to global object: the window
	# if owner is not null, `this` referes to the owner
	results = tx.run(query)
	for item in results:
		if 'true_owner' in item:
			owner = item['true_owner']
			top = item['top']
			out['methods'].append({'top': top, 'owner': owner})
		if 'function_name' in item and 'owner' in item:
			fname = item['function_name']
			owner= item['owner']
			top = item['top']
			if owner is None or owner == '':
				owner = constantsModule.WINDOW_GLOBAL_OBJECT
				out['methods'].append({'top': top, 'owner': owner})
			else:
				out['methods'].append({'top': top, 'owner': owner})

	## handle the object expression case
	query="""
	MATCH (this_st {Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'value'}]-(prop {Type: 'Property'})<-[:AST_parentOf {RelationType: 'properties'}]-(expr {Type: 'ObjectExpression'})<-[r:AST_parentOf]-(t)<-[:AST_parentOf]-(tt)
	WHERE (r.RelationType= 'right' OR r.RelationType= 'init' OR r.RelationType = 'arguments')
	AND (t.Type = 'AssignmentExpression' OR t.Type='VariableDeclarator' OR t.Type= 'CallExpression')
	AND (tt.Type = 'ExpressionStatement' OR tt.Type='VariableDeclaration')
	OPTIONAL MATCH (t)-[r2:AST_parentOf]->(c1 {Type: 'Identifier'}) WHERE r2.RelationType = 'left' OR r2.RelationType = 'id'
	OPTIONAL MATCH (t)-[:AST_parentOf]->(c3)-[AST_parentOf {RelationType: 'object'}]->(c2 {Type: 'Identifier'})
	RETURN tt, c2, c1
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		owner = item['c2']
		top = item['tt']
		if owner is None:
			owner = item['c1']
		if owner is not None:
			out['methods'].append({'top': top, 'owner': owner})


	query="""
	MATCH (this_st { Id: '%s'})<-[:AST_parentOf*]-(n {Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'arguments'}]-(top_call_expression)-[:AST_parentOf {RelationType: 'callee'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(the_event_target_top),
	(member_expr)-[:AST_parentOf {RelationType: 'property'}]->(prop {Type: 'Identifier', Code: 'on'}), (top_call_expression)<-[:AST_parentOf]-(top)
	RETURN the_event_target_top, top
	"""%this_expression_node_id
	results = tx.run(query)
	for item in results:
		owner = item['the_event_target_top']
		top = item['top']
		out['methods'].append({'top': top, 'owner': owner})


	# store the results in DB for future use
	if len(out['methods']) > 0:
		for element in out['methods']:
			top_node = element['top']
			owner_node = element['owner']
			if owner_node == constantsModule.WINDOW_GLOBAL_OBJECT:
				top_node_id= top_node['Id']
				build_relationship_query="""
				MATCH (this_node { Id: '%s'}), (top_node { Id: '%s'}))
				CREATE (this_node)-[:pointsTo {RelationType: 'top', Arguments: 'pointsTo=window'}]->(top_node)
				"""%(this_expression_node_id)
			else:
				top_node_id = top_node['Id']
				owner_node_id = owner_node['Id']
				build_relationship_query="""
				MATCH (this_node { Id: '%s'}), (top_node { Id: '%s'}), (owner_node { Id: '%s'})
				CREATE (this_node)-[:pointsTo {RelationType: 'top'}]->(top_node)
				CREATE (this_node)-[:pointsTo {RelationType: 'owner'}]->(owner_node)
				"""%(this_expression_node_id, top_node_id, owner_node_id)
			tx.run(build_relationship_query)

	if len(out['events']) > 0:
		for element in out['events']:
			owner_node_id = item['Arguments'].split('___')[1]
			build_relationship_query="""
			MATCH (this_node { Id: '%s'}), (owner_node { Id: '%s'})
			CREATE (this_node)-[:pointsTo {RelationType: 'owner', Arguments: 'pointsTo=eventSelector'}]->(owner_node)
			"""%(this_expression_node_id, owner_node_id)
			tx.run(build_relationship_query)

	### ---- END STEP 2 ---- ###

	return out


## ------------------------------------------------------------------------------- ## 
## General Functions
## ------------------------------------------------------------------------------- ## 

def get_value_of_identifer_or_literal(node):
	"""
	Description:
	-------------
	gets the value of a node (identifer or literal)

	@param {dict} an identifier or literal node  
	@returns {list} a pair of node value and type. If the input is not literal or identifier, it returns empty.
	"""
	if node['Type'] == 'Identifier':
		return [node['Code'], node['Type']]
	elif node['Type'] == 'Literal':
		value = node['Value']
		raw = node['Raw']
		if value == '{}' and (raw.strip('\'').strip("\"").strip() != value):
			return [node['Raw'], node['Type']]
		else:
			return [node['Value'], node['Type']]

	return ['', '']


def get_function_call_values_of_function_definitions(tx, function_def_node):
	"""
	Description:
	-------------
	navigates the call graph to find the bindings between 'function-call arguments' & 'function definition params'

	@param {pointer} tx: neo4j transaction pointer
	@param {node} function_def_node: a 'FunctionExpression' or 'FunctionDeclaration' node of esprima AST
	@return {dictionary} { call_line: {p1: val1, p2:val2}, call_line: {p1: val1, p2: val2}, ... }
	"""

	out = {}
	query = """
	MATCH (param)<-[:AST_parentOf {RelationType: 'params'}]-(functionDef { Id: '%s' })<-[:CG_parentOf]-(caller {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'arguments'}]-> (arg) RETURN collect(distinct param) as params, caller, collect(distinct arg) AS args
	"""%(function_def_node['Id'])


	results = tx.run(query)
	for each_binding in results:
		call_expression = each_binding['caller']
		args = each_binding['args']
		params = each_binding['params']
		if len(args) < len(params):
			params = params[::-1] # must reverse this list to match in case of call with lower number of arguments than definition

		call_location_line = call_expression['Location']
		call_nid = call_expression['Id']
		key = call_nid + '__Loc=' + call_location_line
		out[key] = {}

		for i in range(len(params)):
		
			if i <= len(args)-1: # handle the case the function is called with lesser arguments than its definition
				[param, param_type] = get_value_of_identifer_or_literal(params[i])
				argument_type = args[i]['Type']
				if argument_type== 'MemberExpression':
					tree = QU.getChildsOf(tx, args[i])
					ce = QU.get_code_expression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'MemberExpression'
				elif argument_type== 'ObjectExpression':
					tree = QU.getChildsOf(tx, args[i])
					ce = QU.get_code_expression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'ObjectExpression'
				elif argument_type== 'Literal' or argument_type== 'Identifier':
					[arg, arg_type] = get_value_of_identifer_or_literal(args[i])
					identifiers = None
				else:
					tree = QU.getChildsOf(tx, args[i])
					ce = QU.get_code_expression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = argument_type

				out[key][param] = {'Value': arg, 'Type':arg_type, 'ResolveIdentifiers': identifiers}

	return out


def check_if_function_has_param(tx, varname, func_def_node):

	query="""
	MATCH (n { Id: '%s'})-[:AST_parentOf {RelationType: 'params'}]-(arg) RETURN collect(distinct arg) as args
	"""%(func_def_node['Id'])
	results = tx.run(query)
	for item in results:
		args = item['args']
		arg_values = [get_value_of_identifer_or_literal(node)[0] for node in args]
		if varname in arg_values:
			return True
		else:
			return False

	return False


def get_non_anonymous_call_expr_top_node(tx, call_expr):
	"""
	gets the top level node of a non-anonymous call expression
	@param {node} call_expr
	@return VariableDeclaration or ExpressionStatemnet node
	"""
	query = """
	MATCH (n)-[:AST_parentOf]->(callExpr { Id: '%s', Type: 'CallExpression'}) RETURN n
	"""%(call_expr['Id'])
	results = tx.run(query)
	for item in results:
		top_level = item['n']
		return top_level
	return call_expr

def get_function_def_of_block_stmt(tx, block_stmt_node):
	"""
	gets the function definition of a block statement node
	"""
	query = """
	MATCH (funcDef)-[:AST_parentOf]->(blockSt { Id: '%s', Type: 'BlockStatement'}) RETURN funcDef
	"""%(block_stmt_node['Id'])
	results = tx.run(query)
	for record in results:
		funcDef = record['funcDef']
		return funcDef
	return None


## ------------------------------------------------------------------------------- ## 
## Internal Functions
## ------------------------------------------------------------------------------- ## 

def _get_varname_value_from_context(tx, varname, context_node, PDG_on_variable_declarations_only=False, context_scope=''):
	"""
	Description:
	-------------
	function for the data flow analysis
	
	@param tx {pointer} neo4j transaction pointer
	@param {string} varname
	@param {dict} context_node: node specifying the CFG-level statement where varname is defined
	@param {bool} PDG_on_variable_declarations_only: internal val to keep state in recursions
	@param {string} context_scope: internal val to keep context scope in recursions
	@return {list}: a 2d list where each entry is of the following format
		[program_slice, literals, dict of identifer mapped to identifer node is, location dict]
	"""


	## ------------------------------------------------------------------------------- ## 
	## Globals and utility functions
	## ------------------------------------------------------------------------------- ## 

	# output
	out_values = [] 
	# stores a map: funcDef id -->> get_function_call_values_of_function_definitions(funcDef)
	knowledge_database = {} 
	# context node identifer
	node_id = context_node['Id']

	def _get_all_call_values_of(varname, func_def_node):
		
		key = func_def_node['Id']
		if key in knowledge_database:
			knowledge = knowledge_database[key]
		else:
			knowledge = get_function_call_values_of_function_definitions(tx, func_def_node)	
			knowledge_database[key] = knowledge

		ret = {}
		for nid, values in knowledge.items():
			if varname in values:
				ret[nid] = values[varname]

		return ret



	## ------------------------------------------------------------------------------- ## 
	## Main logic 
	## ------------------------------------------------------------------------------- ## 

	if PDG_on_variable_declarations_only:
		# for VariableDeclaration PDG relations
		query = """
		MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t {Type: 'VariableDeclaration'}) RETURN collect(distinct n_t) AS resultset
		"""%(node_id, varname)
	else:
		# for all PDG relations
		query = """
		MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t) RETURN collect(distinct n_t) AS resultset
		"""%(node_id, varname)

	results = tx.run(query)
	for item in results: 
		currentNodes = item['resultset'] 
		for iteratorNode in currentNodes:
			if iteratorNode['Type'] == 'BlockStatement': 
				# the parameter 'varname' is a function argument

				func_def_node = get_function_def_of_block_stmt(tx, iteratorNode) # check if func def has a varname parameter 
				if func_def_node['Type'] == 'FunctionExpression' or func_def_node['Type'] == 'FunctionDeclaration':

					match_signature = check_if_function_has_param(tx, varname, func_def_node)
					if match_signature:
						if context_scope == '':
							out = ['%s = %s'%(varname, constantsModule.LOCAL_ARGUMENT_TAG_FOR_FUNC),
								  [],
								  [varname],
								  iteratorNode['Location']]
						else:
							out = ['%s %s = %s'%(context_scope, varname, constantsModule.LOCAL_ARGUMENT_TAG_FOR_FUNC),
								  [],
								  [varname],
								  iteratorNode['Location']]					
						out_values.append(out)
						
						varname_values_within_call_expressions = _get_all_call_values_of(varname, func_def_node)
						for nid in varname_values_within_call_expressions:
							each_argument = varname_values_within_call_expressions[nid]

							location_line = _get_location_part(nid)

							if each_argument['Type'] == 'Literal':
								if context_scope == '':
									out = ['%s <--(invocation-value)-- \"%s\"'%(varname, each_argument['Value']),
										  [each_argument['Value']],
										  [varname],
										  location_line]
								else:
									out = ['%s %s <--(invocation-value)-- \"%s\"'%(context_scope, varname, each_argument['Value']),
										  [each_argument['Value']],
										  [varname],
										  location_line]

								out_values.append(out)

							elif each_argument['Type'] == 'Identifier':

								call_expr_id = _get_node_id_part(nid)
								# use this as an id to mark variables in this scope when doing def-use analsis
								context_id_of_call_scope = '[scope-id=%s]'%call_expr_id  

								if context_scope == '':
									out = ['%s <--(invocation-value)-- [def-scope-id=%s] %s'%(varname, call_expr_id, each_argument['Value']),
										  [],
										  [varname, each_argument['Value']],
										  location_line]
								else:
									out = ['%s %s <--(invocation-value)-- [def-scope-id=%s] %s'%(context_scope, varname, call_expr_id, each_argument['Value']),
											  [],
											  [varname, each_argument['Value']],
											  location_line]

								out_values.append(out)

								
								top_level_of_call_expr = get_non_anonymous_call_expr_top_node(tx, {'Id': call_expr_id})
								recurse= _get_varname_value_from_context(tx, each_argument['Value'], top_level_of_call_expr, context_scope=context_id_of_call_scope)
								out_values.extend(recurse)

							elif each_argument['Type'] == 'MemberExpression':

								call_expr_id = _get_node_id_part(nid)
								context_id_of_call_scope = '[scope-id=%s]'%call_expr_id  

								if context_scope == '':
									out = ['%s <--(invocation-value)-- [def-scope-id=%s] %s'%(varname, call_expr_id, each_argument['Value']),
										  [],
										  [varname, each_argument['Value']],
										  location_line]
								else:
									out = ['%s %s <--(invocation-value)-- [def-scope-id=%s] %s'%(context_scope, varname, call_expr_id, each_argument['Value']),
											  [],
											  [varname, each_argument['Value']],
											  location_line]						
								out_values.append(out)	

								# PDG on member expressions-> do PDG on the top most parent of it!
								top_most = each_argument['Value'].split('.')[0]
								call_expr_id = _get_node_id_part(nid)
								top_level_of_call_expr = get_non_anonymous_call_expr_top_node(tx, {'Id': call_expr_id})
								recurse= _get_varname_value_from_context(tx, top_most, top_level_of_call_expr, context_scope=context_id_of_call_scope)
								out_values.extend(recurse)

							elif each_argument['Type'] == 'ObjectExpression':
								
								call_expr_id = _get_node_id_part(nid)
								context_id_of_call_scope = '[scope-id=%s]'%call_expr_id  

								if context_scope == '':
									out = ['%s <--(invocation-value)-- [def-scope-id=%s] %s'%(varname, call_expr_id, each_argument['Value']),
										  [],
										  [varname, each_argument['Value']],
										  location_line]
								else:
									out = ['%s %s <--(invocation-value)-- [def-scope-id=%s] %s'%(context_scope, varname, call_expr_id, each_argument['Value']),
											  [],
											  [varname, each_argument['Value']],
											  location_line]

								out_values.append(out)	

								additional_identifiers = each_argument['ResolveIdentifiers']
								if additional_identifiers is not None:
									for each_additional_identifier in additional_identifiers:
										
										top_level_of_call_expr = get_non_anonymous_call_expr_top_node(tx, {'Id': call_expr_id})
										recurse= _get_varname_value_from_context(tx, each_additional_identifier, top_level_of_call_expr, context_scope=context_id_of_call_scope)
										out_values.extend(recurse)	


							else: 
								# expression statements, call expressions (window.location.replace(), etc)
								if context_scope == '':
									out = ['%s <--(invocation-value)-- %s'%(varname, each_argument['Value']),
										  [],
										  [varname, each_argument['Value']],
										  location_line]
									
								else:
									out = ['%s %s <--(invocation-value)-- %s'%(context_scope, varname, each_argument['Value']),
										  [],
										  [varname, each_argument['Value']],
										  location_line]

								out_values.append(out)				



							## ThisExpression Pointer Analysis
							## NOTE: this code block must be executed for ALL branches, so we have to place it outside of all conditional branches
							additional_identifiers = each_argument['ResolveIdentifiers']
							if additional_identifiers is not None:
								if 'ThisExpression' in additional_identifiers:
									this_expression_node_id = additional_identifiers['ThisExpression']
									pointer_resolutions = get_this_pointer_resolution(tx, {'Id': this_expression_node_id })
									for item in pointer_resolutions['methods']:
										owner_item = item['owner']
										owner_top = item['top']
										tree_owner = QU.getChildsOf(tx, owner_item)
										tree_owner_exp = QU.get_code_expression(tree_owner)[0]
										location_line = owner_item['Location']
										out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope,tree_owner_exp, this_expression_node_id)
										out = [out_line.lstrip(),
											  [],
											  [tree_owner_exp[0]],
											  location_line]
										out_values.append(out)

										# def-use analysis over resolved `this` pointer
										if owner_item != '' and owner_item is not None and owner_item!= constantsModule.WINDOW_GLOBAL_OBJECT and owner_item['Type'] == 'Identifier':
											recurse_values = _get_varname_value_from_context(tx, tree_owner_exp, owner_top, PDG_on_variable_declarations_only=True)
											out_values.extend(recurse_values)


									# handle `this` that resolves to DOM elements in events 
									for element in pointer_resolutions['events']:
										if 'relation' in element:
											# fetched via analysis
											item = element['relation']
											target_node_id = item['Arguments'].split('___')[1]
											if target_node_id == 'xx': 
												continue
											else:
												tree_owner = QU.getChildsOf({'Id': target_node_id})
												tree_owner_exp = QU.get_code_expression(tree_owner)
												location_line = tree_owner['Location']
												out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
												out = [out_line.lstrip(),
													  [],
													  [tree_owner_exp],
													  location_line]
												out_values.append(out) 
										else:
											# fetched from DB
											item = element['owner']
											target_node_id = item['Id']		
											tree_owner = QU.getChildsOf({'Id': target_node_id})
											tree_owner_exp = QU.get_code_expression(tree_owner)
											location_line = tree_owner['Location']
											out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
											out = [out_line.lstrip(),
												  [],
												  [tree_owner_exp],
												  location_line]
											out_values.append(out) 				


				continue


			tree = QU.getChildsOf(tx, iteratorNode)
			contextNode = tree['node']
			if contextNode['Id'] == constantsModule.PROGRAM_NODE_INDEX: 
				continue
			ex = QU.get_code_expression(tree)
			loc = iteratorNode['Location']
			[code_expr, literals, idents] = ex
			if context_scope != '':
				code_expr = context_scope + '  ' + code_expr 
			out_values.append([code_expr, literals, idents, loc])
			new_varnames = list(set((list(idents)))) # get unique vars

			# handle `this` expressions
			if 'ThisExpression' in new_varnames:
				this_expression_node_id = idents['ThisExpression']
				pointer_resolutions = get_this_pointer_resolution(tx, {'Id': this_expression_node_id })
				for item in pointer_resolutions['methods']:
					owner_item = item['owner']
					owner_top = item['top']
					tree_owner = QU.getChildsOf(tx, owner_item)
					tree_owner_exp = QU.get_code_expression(tree_owner)[0]
					location_line = owner_item['Location']
					out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
					out = [out_line.lstrip(),
						  [],
						  [tree_owner_exp[0]],
						  location_line]
					out_values.append(out)

					# def-use analysis over resolved `this` pointer
					if owner_item != '' and owner_item is not None and owner_item!= constantsModule.WINDOW_GLOBAL_OBJECT and owner_item['Type'] == 'Identifier':
						recurse_values = _get_varname_value_from_context(tx, tree_owner_exp, owner_top, PDG_on_variable_declarations_only=True)
						out_values.extend(recurse_values)


				# handle `this` that resolves to DOM elements in events 
				for element in pointer_resolutions['events']:
					if 'relation' in element:
						# fetched via analysis
						item = element['relation']
						target_node_id = item['Arguments'].split('___')[1]
						if target_node_id == 'xx': 
							continue
						else:
							tree_owner = QU.getChildsOf({'Id': target_node_id})
							tree_owner_exp = QU.get_code_expression(tree_owner)
							location_line = tree_owner['Location']
							out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
							out = [out_line.lstrip(),
								  [],
								  [tree_owner_exp],
								  location_line]
							out_values.append(out) 
					else:
						# fetched from DB
						item = element['owner']
						target_node_id = item['Id']		
						tree_owner = QU.getChildsOf({'Id': target_node_id})
						tree_owner_exp = QU.get_code_expression(tree_owner)
						location_line = tree_owner['Location']
						out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
						out = [out_line.lstrip(),
							  [],
							  [tree_owner_exp],
							  location_line]
						out_values.append(out) 


			# main recursion flow
			for new_varname in new_varnames:
				if new_varname == varname or new_varname in constantsModule.JS_DEFINED_VARS: continue

				# check if new_varname is a function call
				# i.e., it has a `callee` relation to a parent of type `CallExpression`
				new_varname_id = idents[new_varname]
				check_function_call_query="""
				MATCH (n { Id: '%s' })<-[:AST_parentOf {RelationType: 'callee'}]-(fn_call {Type: 'CallExpression'})-[:CG_parentOf]->(call_definition)
				RETURN call_definition
				"""%(new_varname_id)
				call_definition_result = tx.run(check_function_call_query)
				is_func_call = False
				for definition in call_definition_result:
					item = definition['call_definition']
					if item is not None:
						is_func_call = True
						wrapper_node_function_definition = QU.getChildsOf(tx, item)
						ce_function_definition = QU.get_code_expression(wrapper_node_function_definition)
						location_function_definition = item['Location']
						body = ce_function_definition[0]
						body = jsbeautifier.beautify(body)
						out_line = """%s %s\n\t\t\t %s"""%(context_scope, constantsModule.FUNCTION_CALL_DEFINITION_BODY, body)
						out = [out_line.strip(),
							  [],
							  [],
							  location_function_definition]
						if out not in out_values:
							# avoid returning/printing twice
							out_values.append(out)

				if is_func_call:
					continue
				v = _get_varname_value_from_context(tx, new_varname, contextNode, context_scope = context_scope)
				out_values.extend(v)	



	return out_values







