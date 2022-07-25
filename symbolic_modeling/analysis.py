# -*- coding: utf-8 -*-

"""
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
	Library Analysis Module (LAM)

"""

import os
import sys
import time
import json
import uuid
import utils.utility as utilityModule
import utils.io as IOModule
import docker.neo4j.manage_container as dockerModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
import constants as constantsModule
import functools
from utils.logging import logger


DEBUG = False

def build_hpg_for_library(file_path, analyze=True, build=True, activate= False):

	"""
	@param {string} file_path: absolute path name of the library file
	@param {bool} analyze
	@param {bool} build
	@param {bool} activate
	@return {void} None
	"""

	library_name_with_extension = utilityModule.get_directory_last_part(file_path)
	library_name = library_name_with_extension.rstrip('.js')

	graphid = uuid.uuid4().hex
	database_name = 'neo4j'  

	container_name = 'neo4j_lib_{0}_{1}'.format(library_name, graphid)


	def _analyze():

		"""
		builds the property graph
		"""

		output_directory = utilityModule.remove_part_from_str(file_path, library_name_with_extension)
		
		command = "node %s --input=%s --output=%s --graphid=%s --mode=csv --lang=js"%(constantsModule.STATIC_ANALYZER_CLI_DRIVER_PATH, file_path, output_directory, graphid)
		IOModule.bash_command(command, capture_output=True, log_command=True)

	def _prepare_db():

		"""
		import model into a neo4j db
		"""

		logger.info('removing the old docker container if it exists')
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		dockerModule.remove_neo4j_database(database_name, container_name)
		time.sleep(5)

		dockerModule.create_neo4j_container(container_name)
		logger.info('waiting 5 seconds for the neo4j container to be ready.')
		time.sleep(5)

		logger.info('importing the model inside the container.')




		remove_str = constantsModule.DATA_DIR + '/'
		relative_import_path = utilityModule.remove_part_from_str(file_path, remove_str)
		relative_import_path = utilityModule.get_directory_without_last_part(relative_import_path)

		dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
		if not connection_success:
			logger.error('neo4j db import timed out!')
			sys.exit(1)
		else:
			logger.info('neo4j improted the hpg successfully.')



	def _activate_db():

		"""
		activates the given neo4j db
		"""

		dockerModule.start_neo4j_container(container_name)
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=120)
		if not connection_success:
			logger.error('neo4j db activation timed out!')
			sys.exit(1)
		else:
			logger.info('neo4j db activated successfully.')



	if analyze:
		_analyze()
	
	if build:
		_prepare_db()

	if activate and not build:
		_activate_db()

	return container_name


def query_library_database_for_signatures(tx, library_name, save_directory):

	"""
	runs cypher queries on libraries to find request sending functions
	@param {neo4j-pointer} tx
	@param {string} library_name
	"""

	xmlhttprequest= 'XMLHttpRequest'
	sendfunction = 'send'
	dispatchevent = 'dispatchEvent'
	addeventlistener = 'addEventListener'

	# TODO: add all signatures of interest here, and invoke `recurse` for each one
	RECURSE_SIGNATURES = [
		xmlhttprequest,
		sendfunction,
		dispatchevent,
		addeventlistener
	]

	processed_functions = []


	def __get_functions_with_function_expressions_query(function_name):

		"""
		queries to find functions with request sending statements
		"""

		# case 1)  var o = { function_name: function(){} }
		# Look for all nodes of type 'Property' with 'value'
		# relation to a node of 'FunctionExpression' type and 'key'
		# relation to an identifier as funciton name
		query1 = """
		MATCH (request { Type: 'Identifier', Code: '%s'})<-[:AST_parentOf*]-(function_expression { Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'value'}]-(property {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(function_name {Type: 'Identifier'})
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""%(function_name)

		# case 2: function declarations
		query2 = """
		MATCH (request { Type: 'Identifier', Code: '%s'})<-[:AST_parentOf*]-(function_declaration { Type: 'FunctionDeclaration'})-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		OPTIONAL MATCH (function_declaration)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN function_declaration, function_name, collect (distinct this_identifier) as this_list
		"""%(function_name)

		# case 3: var function_name = function(){}
		query3 = """
		MATCH (request { Type: 'Identifier', Code: '%s'})<-[:AST_parentOf*]-(function_expression { Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'init'}]-(var_declarator {Type: 'VariableDeclarator'})-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""%(function_name)

		#case 4:  obj.function_name = function(){}
		query4 = """
		MATCH (assignment {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'left'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(function_name {Type: 'Identifier'}),
		(assignment)-[:AST_parentOf {RelationType: 'right'}]-(function_expression {Type: 'FunctionExpression'})-[:AST_parentOf*]->(request { Type: 'Identifier', Code: '%s'})
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""%(function_name)
		queries = [query1, query2, query3, query4]
		return queries

	def __does_function_sends_request(function_dictionary):
		
		"""
		mark the interface function that sends the xhr request
		"""

		if 'id' not in function_dictionary:
			return False

		function_id = function_dictionary['id']
		function_type = function_dictionary['type']

		query = """
		MATCH (function {Id :'%s'})-[:AST_parentOf*]->(node {Type: 'Identifier', Code: 'send'})
		RETURN node
		"""%(function_id)
		results = tx.run(query)
		for record in results:
			if record['node'] is not None and record['node'] != '':
				return True

		return False

	def __find_request_sending_functions(function_dictionary):

		"""
		finds the functions that contain a request sending function or statement
		additionally, finds the this expression identifiers of those functions
		"""

		function_names = []
		this_list_nodes = []
		function_name = function_dictionary['name']
		if function_name not in processed_functions:
			processed_functions.append(function_name)
			queries = __get_functions_with_function_expressions_query(function_name)
			for query in queries:
				results = tx.run(query)
				for record in results:
					record_keys = record.__dict__
					record_keys = record_keys['_Record__keys']
					req_sending_function_name = record['function_name']['Code']
					if 'function_declaration' in record_keys:
						req_sending_function_id = record['function_declaration']['Id']
						function_type = 'FunctionDeclaration'
						loc = record['function_declaration']['Location']
					else:
						req_sending_function_id = record['function_expression']['Id']
						function_type = 'FunctionExpression'
						loc = record['function_expression']['Location']

					if record['this_list'] is not None:
						for node_item in record['this_list']:
							this_list_nodes.append(node_item)
					obj = {'id': req_sending_function_id, 'name': req_sending_function_name, 'type': function_type, 'loc': loc}
					function_names.append(obj)

		return [function_names, this_list_nodes]


	def _recurse_functions(function_dictionary, break_next=False):

		"""
		interface function: recursively gets the function names for sending a request
		"""
		out = []
		this_list_nodes = []

		if break_next:
			return [out, this_list_nodes]

		if function_dictionary['name'] not in RECURSE_SIGNATURES:
			if __does_function_sends_request(function_dictionary):
				break_next = True

		[function_details, this_list] = __find_request_sending_functions(function_dictionary)
		if len(this_list) > 0:
			this_list_nodes.extend(this_list)
		if len(function_details) > 0:
			out.extend(function_details)
			for item in function_details:
				[new_function_details, new_this_list] = _recurse_functions(item, break_next)
				if len(new_function_details):
					out.extend(new_function_details)
				if len(new_this_list):
					this_list_nodes.extend(new_this_list)

		return [out, this_list_nodes]


	# ----------------------------------------------------------------------------------- #
	## 
	def __get_finding_url_location_usage_queries():
		
		"""
		returns the queries for finding functions that have usages of window.location / top.location
		"""

		# case 1)  var o = { function_name: function(){} }
		query1 = """
		MATCH (t_property {Code: 'location', Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'property'}]-(t_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(t_object {Type: 'Identifier'}),
		(t_member_expr)<-[:AST_parentOf*]-(function_expression { Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'value'}]-(property {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(function_name {Type: 'Identifier'})
		WHERE (t_object.Code = 'window' OR t_object.Code = 'top')
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""

		# case 2: function declarations
		query2 = """
		MATCH (t_property {Code: 'location', Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'property'}]-(t_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(t_object {Type: 'Identifier'}),
		(t_member_expr)<-[:AST_parentOf*]-(function_declaration { Type: 'FunctionDeclaration'})-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		WHERE (t_object.Code = 'window' OR t_object.Code = 'top')
		OPTIONAL MATCH (function_declaration)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN function_declaration, function_name, collect (distinct this_identifier) as this_list
		"""

		# case 3: var function_name = function(){}
		query3 = """
		MATCH (t_property {Code: 'location', Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'property'}]-(t_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(t_object {Type: 'Identifier'}),
		(t_member_expr)<-[:AST_parentOf*]-(function_expression { Type: 'FunctionExpression'})<-[:AST_parentOf {RelationType: 'init'}]-(var_declarator {Type: 'VariableDeclarator'})-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		WHERE (t_object.Code = 'window' OR t_object.Code = 'top')
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""

		#case 4:  obj.function_name = function(){}
		query4 = """

		MATCH (t_property {Code: 'location', Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'property'}]-(t_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(t_object {Type: 'Identifier'}),
		(assignment {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'left'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(function_name {Type: 'Identifier'}),
		(assignment)-[:AST_parentOf {RelationType: 'right'}]-(function_expression {Type: 'FunctionExpression'})-[:AST_parentOf*]->(t_member_expr)
		WHERE (t_object.Code = 'window' OR t_object.Code = 'top')
		OPTIONAL MATCH (function_expression)-[:AST_parentOf*]->(filter_node)-[:AST_parentOf]->(this_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'object'}]->(this_expr {Type: 'ThisExpression'}), (this_member_expr)-[:AST_parentOf {RelationType: 'property'}]->(this_identifier {Type: 'Identifier'})
		WHERE filter_node.Type <> 'CallExpression'
		RETURN distinct(function_name) as function_name, function_expression, collect (distinct this_identifier) as this_list
		"""
		queries = [query1, query2, query3, query4]
		
		return queries


	def __find_window_location_read_functions(function_dictionary='INITIAL'):

		"""
		finds the functions that read or use window/top.location in an statement
		additionally, finds the this expression identifiers of those functions
		"""

		function_names = []
		this_list_nodes = []
		function_name = function_dictionary['name']

		if function_name not in processed_functions:
			if function_name == 'INITIAL':
				queries = __get_finding_url_location_usage_queries()
			else:
				processed_functions.append(function_name)
				queries = __get_functions_with_function_expressions_query(function_name)

			for query in queries:
				results = tx.run(query)
				for record in results:
					## was checking the jquery library ... here
					record_keys = record.__dict__
					record_keys = record_keys['_Record__keys']
					target_function_name = record['function_name']['Code']
					if 'function_declaration' in record_keys:
						target_function_id = record['function_declaration']['Id']
						function_type = 'FunctionDeclaration'
						loc = record['function_declaration']['Location']
					else:
						target_function_id = record['function_expression']['Id']
						function_type = 'FunctionExpression'
						loc = record['function_expression']['Location']

					if record['this_list'] is not None:
						for node_item in record['this_list']:
							this_list_nodes.append(node_item)
					obj = {'id': target_function_id, 'name': target_function_name, 'type': function_type, 'loc': loc}
					function_names.append(obj)

		return [function_names, this_list_nodes]


	def _recurse_win_loc_access(function_dictionary={'name': 'INITIAL'}, break_next=False):

		"""
		interface function: recursively gets the function names that access window/top.location
		"""
		out = []
		this_list_nodes = []

		if break_next:
			return [out, this_list_nodes]

		# if function_dictionary['name'] != xmlhttprequest and function_dictionary['name']!= sendfunction:
		# 	if __does_function_sends_request(function_dictionary):
		# 		break_next = True

		[function_details, this_list] = __find_window_location_read_functions(function_dictionary)
		if len(this_list) > 0:
			this_list_nodes.extend(this_list)
		if len(function_details) > 0:
			out.extend(function_details)
			for item in function_details:
				[new_function_details, new_this_list] = _recurse_win_loc_access(item, break_next)
				if len(new_function_details):
					out.extend(new_function_details)
				if len(new_this_list):
					this_list_nodes.extend(new_this_list)

		return [out, this_list_nodes]


	def __get_parameter_index_position(function_expression_str, parameter_str):
		
		"""
		returns the index of the parameter in the given function expression
		"""
		index = -1
		left_signature = '('
		right_signature = '){'
		left = function_expression_str.find(left_signature)
		right = function_expression_str.rfind(right_signature) 
		if left != -1 and right != -1:
			left = left + len(left_signature)
			right = right + len(right_signature)
			params = function_expression_str[left: right]
			params_list = params.split(',')
			for i in range(len(params_list)):
				p = params_list[i].strip()
				if p == parameter_str:
					index = i
					return index

		return index


	def __find_url_parameter(function_dictionary):
		
		"""
		finds the url argument of the request sending function
		@note: it may not be obvious from the function definition names
		which argument is the url
		"""

		# look for .open(a, url, ...)
		query = """
		MATCH (top_function { Id: '%s'})-[:AST_parentOf*]->(call_expr {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(open_identifier {Code: 'open'}),
		(call_expr)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(param {Type: 'Identifier'})
		RETURN param
		"""%(function_dictionary['id'])
		results = tx.run(query)
		for item in results:
			parameter = item['param']
			return parameter['Code']

		return ''

	def _get_function_signature(function_dictionary):

		"""
		gets the signature of a given function
		"""

		definition_type = function_dictionary['type']
		if definition_type == 'FunctionExpression':
			wrapper_node = neo4jQueryUtilityModule.getChildsOf(tx, {'Id': function_dictionary['id'], 'Type': definition_type}, relation_type='params')
			signature = neo4jQueryUtilityModule.get_code_expression(wrapper_node)[0]
			parameter = __find_url_parameter(function_dictionary)
			index = __get_parameter_index_position(signature, parameter)
			return [signature, parameter, index]

		elif definition_type == 'FunctionDeclaration':
			wrapper_node = neo4jQueryUtilityModule.getChildsOf(tx, {'Id': function_dictionary['id'], 'Type': definition_type})
			signature = neo4jQueryUtilityModule.get_code_expression(wrapper_node, short_form=True)[0]
			parameter = __find_url_parameter(function_dictionary)
			index = __get_parameter_index_position(signature, parameter)
			return [signature, parameter, index]		

		else:
			print(function_dictionary)


		return ['','','']


	def _get_function_details(node_id):

		"""
		@param {string} node_id
		@description finds the id of all `FunctionDeclaration` and 'FunctionExpression' nodes
		"""

		query="""
		MATCH (n {Id: '%s'})-[:AST_parentOf{RelationType: 'params'}]-(i {Type: 'Identifier'})
		WHERE n.Type='FunctionDeclaration'
		OR n.Type='FunctionExpression'
		RETURN n, collect(distinct i) as params
		"""%(str(node_id))
		results = tx.run(query)
		for node_item in results:
			node = node_item['n']
			params = node_item['params']
			params_name = [p['Code'] for p in params]
			return [node, params_name]

		return []

	def __get_unique_this_list(this_list_nodes):
		
		"""
		gets the unqiue this_list based on identifier names 
		(two identifier nodes with different neo4j id's but same name must be considered one, 
		since we only want to find their assigned value, not their uses)
		"""

		out = []
		names = []
		for node in this_list_nodes:
			name = node['Code'] 
			if name not in names:
				names.append(name)
				out.append(node)

		return out

	def __find_this_node_assignment_function_names(this_node):
		"""
		returns the function name that contain an assignment expression who assigns a value to the given ThisExpression
		"""

		# query = """
		# MATCH (assignment_expr {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'left'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(this_identifier { Code: '_sFormData'}),
		# p=shortestPath((function {Type: 'FunctionDeclaration'})-[:AST_parentOf*]->(assignment_expr)), 
		# (function)-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		# OPTIONAL MATCH (assignment {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'right'}]-> (real_function_name {Type: 'Identifier', Code: function_name.Code}),
		# (assignment )-[:AST_parentOf {RelationType: 'left'}]->(alias_member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(alias_name {Type: 'Identifier'}),
		# (function)-[:AST_parentOf*]-(es {Type: 'ExpressionStatement'})-[:AST_parentOf]->(assignment) 
		# RETURN function, function_name, alias_name
		# """%(this_node['Code'])

		query = """
		MATCH (assignment_expr {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'left'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(this_identifier { Code: '%s'}),
		p=shortestPath((function {Type: 'FunctionDeclaration'})-[:AST_parentOf*]->(assignment_expr)), 
		(function)-[:AST_parentOf {RelationType: 'id'}]->(function_name {Type: 'Identifier'})
		RETURN function, function_name
		"""%(this_node['Code'])

		out = {}
		results = tx.run(query)
		for record in results:
			out[record['function_name']['Code']] = record['function']
		return out


	def __find_function_name_aliases(function_definitions):
		
		out = {}

		for function_name in function_definitions:

			function_declaration = function_definitions[function_name]
			# object expressions
			query = """
			MATCH (alias_top_expr {Type: 'ExpressionStatement'})-[:AST_parentOf]->(assignment {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'left'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(target_property_name {Type: 'Identifier'}),
			(assignment)-[:AST_parentOf {RelationType: 'right'}]-> (function_name { Type: 'Identifier', Code: '%s'}),
			(alias_top_expr)<-[:AST_parentOf]-(same_parent_block)-[:AST_parentOf]->(n { Id: '%s'})
			RETURN distinct(target_property_name.Code) as name
			"""%(function_name, function_declaration['Id'])

			results = tx.run(query)
			for record in results:
				out[record['name']] = function_declaration # set the definition of alias to the real function

		return out



	def _find_functions_that_assign_to_this_expressions(this_list_nodes):
		"""
		find functions that assign a value to a given ThisExpression node
		"""

		out = {} # key= this_node, value= dictionary of functions that contain a assignment expression for a this_node
		for this_node in this_list_nodes:
			dict_function_names_with_assignment = __find_this_node_assignment_function_names(this_node)
			dict_function_names_with_assignment_aliases = __find_function_name_aliases(dict_function_names_with_assignment)
			functions_that_assign_to_this_expression = {**dict_function_names_with_assignment, **dict_function_names_with_assignment_aliases}
			out[this_node['Code']] = functions_that_assign_to_this_expression

		return out


	function_ids = []
	count = 0


	###############
	[chain_functions_evt1, this_list_evt] = _recurse_functions({'name': dispatchevent})
	chain_functions_evt_dispatch = [chain_functions_evt1] 

	[chain_functions_evt2, this_list_evt2] = _recurse_functions({'name': addeventlistener})
	chain_functions_evt_register = [chain_functions_evt2] 


	###############
	[chain_functions1, this_list] = _recurse_functions({'name': xmlhttprequest})
	chain_functions = [chain_functions1]

	# find functions that assign to this_expressions, e.g., for FormData
	this_list= __get_unique_this_list(this_list)
	other_functions = _find_functions_that_assign_to_this_expressions(this_list)

	################

	[chain_functions_win_loc_1, this_list_win_loc] = _recurse_win_loc_access()
	chain_functions_win_loc = [chain_functions_win_loc_1]

	###############


	save_here = os.path.join(save_directory, library_name + '_signature.json')
	with open(save_here, "w+") as fp:
		idx = 0
		rows = []
		for chain in chain_functions:
			if len(chain):
				for target_function in chain:
					if target_function['id'] not in function_ids:
						idx += 1
						count+=1
						function_ids.append(target_function['id'])

						row= {
							'id': target_function['id'],
							'location': target_function['loc'],
							'type': target_function['type'],
							'function': target_function['name'],
							'label': 'REQ'
						}
						func_details =  _get_function_details(target_function['id'])
						if len(func_details) > 0:
							func_params = func_details[1]
							row['params'] = func_params

						rows.append(row)

		for this_item_name in other_functions:
			this_item_functions = other_functions[this_item_name]
			for function_name in this_item_functions:
				function_def = this_item_functions[function_name]
				idx +=1
				count+=1

				row= {
					'id': function_def['Id'],
					'location': function_def['Location'],
					'type': function_def['Type'],
					'function': function_name,
					'affected_this_expression': 'this.'+this_item_name,
					'label': 'REQ'
				}
				func_details =  _get_function_details(row['id'])
				if len(func_details) > 0:
					func_params = func_details[1]
					row['params'] = func_params

				rows.append(row)


		for chain in chain_functions_win_loc:
			if len(chain):
				for target_function in chain:
					if target_function['id'] not in function_ids:
						idx += 1
						count+=1
						function_ids.append(target_function['id'])

						row= {
							'id': target_function['id'],
							'location': target_function['loc'],
							'type': target_function['type'],
							'function': target_function['name'],
							'label': 'WIN.LOC'
						}
						func_details =  _get_function_details(target_function['id'])
						if len(func_details) > 0:
							func_params = func_details[1]
							row['params'] = func_params

						rows.append(row)


		for chain in chain_functions_evt_dispatch:
			if len(chain):
				for target_function in chain:
					if target_function['id'] not in function_ids:
						idx += 1
						count+=1
						function_ids.append(target_function['id'])

						row= {
							'id': target_function['id'],
							'location': target_function['loc'],
							'type': target_function['type'],
							'function': target_function['name'],
							'label': 'E-DISPATCH'
						}
						func_details =  _get_function_details(target_function['id'])
						if len(func_details) > 0:
							func_params = func_details[1]
							row['params'] = func_params

						rows.append(row)

		for chain in chain_functions_evt_register:
			if len(chain):
				for target_function in chain:
					if target_function['id'] not in function_ids:
						idx += 1
						count+=1
						function_ids.append(target_function['id'])

						row= {
							'id': target_function['id'],
							'location': target_function['loc'],
							'type': target_function['type'],
							'function': target_function['name'],
							'label': 'E-REGISTER'
						}
						func_details =  _get_function_details(target_function['id'])
						if len(func_details) > 0:
							func_params = func_details[1]
							row['params'] = func_params

						rows.append(row)

		json.dump(rows, fp, indent=4)



# -------------------------------------------------------------------- #
#	Start: in-out symbolic relationships
# -------------------------------------------------------------------- #

def find_function_expressions(tx):

	"""
	@param {neo4j-pointer} tx
	@description finds the id of all `FunctionDeclaration` and 'FunctionExpression' nodes
	"""

	query="""
	MATCH (n)-[:AST_parentOf{RelationType: 'params'}]-(i {Type: 'Identifier'})
	WHERE n.Type='FunctionDeclaration'
	OR n.Type='FunctionExpression'
	RETURN n, collect(distinct i) as params
	"""
	out = []
	results = tx.run(query)
	for node_item in results:
		node = node_item['n']
		params = node_item['params']
		params_name = [p['Code'] for p in params]
		out.append([node, params_name])

	return out

def get_return_statements(tx, function_node_id):
	
	"""
	@param {neo4j-pointer} tx
	@param {string} function_node
	@description checks if a function node has any enclosed `ReturnStatement` in its body, and outputs ALL those statement
	"""

	query="""
	MATCH (n {Id: '%s'})-[:AST_parentOf*]->(ret {Type: 'ReturnStatement'})-[:AST_parentOf]-(m)
	RETURN ret
	"""%str(function_node_id) # Note: parameter m filters out returns without arguments like return;

	out = []
	results = tx.run(query)
	for node_item in results:
		node = node_item['ret']
		out.append(node)

	return out


def get_control_predicates(tx, function_node_id):

	# Check `test` relation of IfStatement, ForStatement, SwitchStatement, WhileStatement, etc,
	# for SwitchStatement, optional match discriminant
	query="""
	MATCH (n {Id: '%s'})-[:AST_parentOf*]->(control)-[:AST_parentOf {RelationType: 'test'}]->(test)
	OPTIONAL MATCH (control)-[:AST_parentOf {RelationType: 'discriminant'}]->(test2)
	RETURN test, test2
	"""%str(function_node_id)

	out = []
	results = tx.run(query)
	for node_item in results:
		test_node_1 = node_item['test']
		test_node_2 = node_item['test2']
		if test_node_1 is not None:
			out.append(test_node_1)
		if test_node_2 is not None:
			out.append(test_node_2)
	return out


# @functools.lru_cache(maxsize=512)
def get_value_of(tx, varname, context_node, calls=[]):

	out_values = []
	node_id = context_node['Id']
	arg = str(varname) + '__' +str(node_id)
	if arg in calls: # return call if same parameters already invoked
		return out_values

	if len(calls) > 100:
		return out_values

	if DEBUG:
		print("[+] get_value_of(%s, %s)"%(varname, node_id))

	query = """
	MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t) RETURN collect(distinct n_t) AS resultset
	"""%(node_id, varname)
	results = tx.run(query)
	for item in results: 
		current_nodes = item['resultset'] 
		for iterator_node in current_nodes:

			tree = neo4jQueryUtilityModule.getChildsOf(tx, iterator_node)
			contextNode = tree['node']
			if contextNode['Id'] == constantsModule.PROGRAM_NODE_INDEX: 
				continue
			ex = neo4jQueryUtilityModule.get_code_expression(tree)
			#loc = iterator_node['Location']
			[code_expr, literals, idents] = ex
			out_values.append([code_expr, literals, idents])
			new_varnames = utilityModule.get_unique_list(list(idents))

			# main recursion flow
			for new_varname in new_varnames:
				if new_varname == varname or new_varname in constantsModule.JS_DEFINED_VARS: continue

				call_arg = str(new_varname) + '__' +str(contextNode['Id'])
				calls.append(call_arg)
				v = get_value_of(tx, new_varname, contextNode, calls)
				out_values.extend(v)	

	return out_values


def get_function_name(tx, function_node):

	t = function_node['Type']
	loc = function_node['Location']
	function_node_id = function_node['Id']
	if t == 'FunctionDeclaration':
		query="""
		MATCH (n {Id: '%s'})-[:AST_parentOf {RelationType: 'id'}]->(name)
		WHERE name.Type = 'Identifier'
		OR name.Type = 'MemberExpression'
		RETURN name
		"""%(function_node_id)
	else:
		# handle all cases in one go: object expr, assignment expr, var declarator
		query="""
		MATCH (n {Id: '%s'})<-[:AST_parentOf]-(parent)-[:AST_parentOf]->(name)
		WHERE name.Type = 'Identifier'
		OR name.Type = 'MemberExpression'
		RETURN name
		"""%(function_node_id)

	results = tx.run(query)
	for item in results:
		node = item['name']
		if node['Type'] == 'Identifier':
			name = node['Code'] # return the function name
		else:
			tree = neo4jQueryUtilityModule.getChildsOf(tx, node)
			name = neo4jQueryUtilityModule.get_code_expression(tree)[0]
		return [name, loc, t]
	return ['Anonymous', loc, t]


def inout_relationship(tx):

	out_dep = { }
	out_control = { }
	function_names = {}
	functions= find_function_expressions(tx)
	for each_func_item in functions:

		each_func= each_func_item[0]
		each_func_params = each_func_item[1]
		fn_id = each_func['Id']
		
		out_dep[fn_id] = []
		out_control[fn_id] = []
		
		if DEBUG:
			print("-"*10)
			print("[+] inout_relationship -> function_id: %s"%fn_id)
			print("[+] inout_relationship -> function_params: %s"%str(each_func_params))
		
		return_statements = get_return_statements(tx, fn_id)
		for return_statement in return_statements:
			tree = neo4jQueryUtilityModule.getChildsOf(tx, return_statement)
			ex = neo4jQueryUtilityModule.get_code_expression(tree)
			[code_expr, literals, idents] = ex
			code_expr = code_expr.strip()
			if len(code_expr) == 0 or code_expr == '\"true\"' or code_expr == '\"false\"': 
				continue
			
			if DEBUG:
				print("[+] inout_relationship -> return: %s"%code_expr)

			cache = {}
			for p in each_func_params:
				if p in out_dep[fn_id]: 
					continue
				else:
					done = False
					for ident in idents:
						if ident in constantsModule.JS_DEFINED_VARS or ident == 'this' or ident == 'ThisExpression': continue
						if DEBUG:
							print("[+] inout_relationship -> tracking: %s"%ident)
						if ident not in cache:
							slices = get_value_of(tx, ident.strip(), return_statement)
							cache[ident] = slices
						else:
							slices = cache[ident]
						for each_slice in slices:
							slice_code = each_slice[0]
							if p in slice_code:
								if fn_id not in function_names:
									func_name = get_function_name(tx, each_func)
									function_names[fn_id] = func_name + [each_func_params]
								out_dep[fn_id].append(p)
								done = True
								break
						if done:
							break

		control_statements= get_control_predicates(tx, fn_id)
		for control_statement in control_statements:
			tree = neo4jQueryUtilityModule.getChildsOf(tx, control_statement)
			ex = neo4jQueryUtilityModule.get_code_expression(tree)
			[code_expr, literals, idents] = ex
			code_expr = code_expr.strip()

			if len(code_expr) == 0 or code_expr == '\"true\"' or code_expr == '\"false\"': 
				continue
			
			if DEBUG:
				print("[+] inout_relationship -> control: %s"%code_expr)
			
			for p in each_func_params:
				if p in out_control[fn_id]: 
					continue
				else:
					for ident in idents:
						if ident in constantsModule.JS_DEFINED_VARS: continue
						if p.strip() == ident.strip():
							if fn_id not in function_names:
								func_name = get_function_name(tx, each_func)
								function_names[fn_id] = func_name + [each_func_params]
							out_control[fn_id].append(p)
							break

	# if DEBUG:
	# 	print("[+] inout_relationship -> dependency:\n%s\n"%str(out_dep))
	# 	print("[+] inout_relationship -> control:\n%s\n"%str(out_control))
	# 	print("[+] inout_relationship -> function names:%s\n"%str(function_names))
	return [out_dep, out_control, function_names]


def save_to_json(data, library_name, save_directory):
	
	save_path = os.path.join(save_directory, library_name + ".json")
	dep = data[0]
	control = data[1]
	fnmap = data[2]
	rows = []
	with open(save_path, "w+") as fd:
		for function_id in fnmap:
			function = fnmap[function_id]
			d = dep[function_id]
			c = control[function_id]
			labels= []
			if len(d)>0:
				labels.append('out <-- %s'%(', '.join(d)))
			if len(c)>0:
				labels.append('out ~ %s'%(', '.join(c)))

			if len(labels) >0:
				row = {
					'id': function_id,
					'location': function[1],
					'type': function[2],
					'function': function[0],
					'params': function[3],
					'labels': str(labels)
				}
				rows.append(row)
		json.dump(rows, fd, indent=4)

# -------------------------------------------------------------------- #
#	End: in-out symbolic relationships
# -------------------------------------------------------------------- #

def run_queries(library_name, save_directory):
	
	"""
	@description runs the neo4j queries
	@param {string} library_name
	"""

	logger.info('running signature identification queries.')
	## task 1: signature identification
	neo4jDatabaseUtilityModule.exec_fn_within_transaction(query_library_database_for_signatures, library_name, save_directory)

	logger.info('running  symobolic relationship queries.')
	## task 2: symobolic relationships
	out = neo4jDatabaseUtilityModule.exec_fn_within_transaction(inout_relationship)

	save_to_json(out, library_name, save_directory)

def run_analyzer(file_path, analyze=True, build=True,  activate= False, query=True):
	
	"""
	@description starts the library analyzer and runs the neo4j queries
	@param {string} file_path: absolute path name of the library file
	@return {void} None
	"""

	start_time = time.perf_counter()
	container_name = build_hpg_for_library(file_path, analyze=analyze, build=build, activate=activate)
	if query:
		library_name = utilityModule.get_directory_last_part(file_path).rstrip('.js')
		directory = utilityModule.get_directory_without_last_part(file_path)
		run_queries(library_name, directory)

		end_time = time.perf_counter()

		with open(os.path.join(directory, 'analysis_time.out'), 'a+') as fd:
			fd.write('time: {0} seconds\n'.format(end_time-start_time))


	dockerModule.stop_neo4j_container(container_name)

