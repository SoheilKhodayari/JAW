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
	Detecting DOM clobbering vulnerabilities

	Usage:
	-----------
	> import analyses.domclobbering.domc_cypher_queries as DOMCTraversalsModule

"""


import os
import sys
import time
import json
import constants as constantsModule
from utils.logging import logger
import hpg_neo4j.query_utility as QU
import analyses.vulnerability_types as enumVulnerabilityTypes
import analyses.general.data_flow as DF


def get_cfg_level_nodes_for_statements():

	esprimaCFGLevelNodeTypes= [
		"EmptyStatement",
		"DebuggerStatement",
		"ExpressionStatement",
		"VariableDeclaration",
		"ReturnStatement",
		"LabeledStatement",
	    "BreakStatement",
	    "ContinueStatement",
	    "IfStatement",
	    "SwitchStatement",
	    "WhileStatement",
	    "DoWhileStatement",
	    "ForStatement",
	    "ForInStatemen",
	    "ThrowStatement",
	    "TryStatement",
	    "WithStatement",
	    # "FunctionDeclaration",
	]

	return esprimaCFGLevelNodeTypes


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



def get_node_by_id(tx, node_id):
	"""
	@param {neo4j-pointer} tx
	@param {id} node id
	@return node
	"""

	query = """
	MATCH (n {Id: '%s'})
	RETURN n
	"""%(node_id)

	results = tx.run(query)
	for record in results:
		n = record['n']
		return n

	return None



def get_ast_topmost(tx, node):

	"""
	@param {neo4j-pointer} tx
	@param {neo4j-node} node
	@return topmost parent of an AST node
	"""

	CFG_LEVEL_STATEMENTS = get_cfg_level_nodes_for_statements()

	if "Type" in node:
		node_type = node["Type"]
	else:
		node = get_node_by_id(tx, node["Id"]) # re-assign the input parameter here
		node_type = node["Type"]

	if node_type in CFG_LEVEL_STATEMENTS:
		return node_type

	
	done = False
	iterator = node
	while not done:
		parent = get_ast_parent(tx, iterator)
		if parent is None:
			done = True
			return iterator

		if parent['Type'] in CFG_LEVEL_STATEMENTS:
			done = True
			break
		else:
			iterator = parent # loop

	return parent



def get_sink_statements(tx, webpage_directory):
	
	pass





# ---------------------------------------------------------------------------------------- #
#		INTERFACE FUNCTION
# ---------------------------------------------------------------------------------------- #
def run_traversals(tx, webpage_directory):

	# PROCEDURE:
	# find each taintable sink TS
	# for each TS, find each taintable variable TR
	# for each (TS, TR), check if the TR can be controlled via a security-sensitive source (e.g., dom clobbering source)

	filename_sinks = os.path.join(webpage_directory, "sinks.out.json")
	
	# read sinks from disk 
	fd_sinks = open(filename_sinks, "r")
	content = json.load(fd_sinks)
	fd_sinks.close()
	
	webpage_url = content["url"]
	webpage_sinks = content["sinks"]
	
	for sink_node in webpage_sinks:
		if sink_node["taint_possibility"] == True: #and sink_node['id'] == 54780:
			sink_identifiers = sink_node["sink_identifiers"]
			sink_cfg_node = get_ast_topmost(tx, {"Id": "%s"%sink_node["id"]})

			## DEBUG
			# expression_string = QU.get_code_expression(QU.getChildsOf(tx, sink_cfg_node))
			# print(sink_cfg_node["Type"])
			# print(sink_node["sink_code"])
			# print(expression_string[0])

			sink_slices = {}
			for each_sink_identifier in sink_identifiers:
				slices = DF.get_varname_value_from_context(each_sink_identifier, sink_cfg_node)
				sink_slices[each_sink_identifier] = slices

			with open(os.path.join(webpage_directory, "sink.flows.out"), "a+") as fd:

				to_be_written_to_fd = ['[*] Code: %s\n'%sink_node["sink_code"]]
				for varname in sink_slices:
					to_be_written_to_fd.append('\tVariable: %s\n'%varname)
					slices = sink_slices[varname]
					to_be_written_to_fd.extend(DF.pretty_get_program_slices(slices))

				for item in to_be_written_to_fd:
					fd.write(item)















