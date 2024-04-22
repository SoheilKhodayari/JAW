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
from utils.logging import logger as LOGGER
from datetime import datetime
import hpg_neo4j.query_utility as QU
import analyses.general.data_flow as DF
import analyses.vulnerability_types as enumVulnerabilityTypes
import analyses.request_hijacking.semantic_types as SemTypeDefinitions
import constants as constantsModule
import utils.utility as utilityModule




# ----------------------------------------------------------------------- #
#				Globals
# ----------------------------------------------------------------------- #


DEBUG = False


# ----------------------------------------------------------------------- #
#				Utility Functions
# ----------------------------------------------------------------------- #


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

def _unquote_url(url):
	
	"""
	@param {string} url
	@return {string} decoded url
	"""
	out = urllib.parse.unquote(url)
	out = out.replace('&amp;', '&')

	return out

def _get_all_occurences(needle, haystack):
	
	"""
	@param {string} needle
	@param {string haystack
	@description finds all occurences of needle in haystack
	@return {array} a list of start index occurences of needle in haystack
	"""
	out = [m.start() for m in re.finditer(needle, haystack)]
	return out


def _get_current_timestamp():
	
	"""
	@return {string} current date and time string
	"""
	now = datetime.now()
	dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
	return dt_string

def _get_unique_list(lst):
	
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array
	"""
	return list(set(lst))


def _get_orderd_unique_list(lst):
	
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array maintaining the original list order
	"""
	final_list = [] 
	for item in lst: 
		if item not in final_list: 
			final_list.append(item) 
	return final_list 

def _get_line_of_location(esprima_location_str):
	
	"""
	@param esprima_location_str
	@return start line numnber of esprima location object
	"""
	start_index = esprima_location_str.index('line:') + len('line:')
	end_index = esprima_location_str.index(',')
	out = esprima_location_str[start_index:end_index]
	return out

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


def _get_function_name_part(nid_string):
	
	"""
	@param {string} nid_string: string containing node id and location
	@return {string} function_name string
	"""
	end_index = nid_string.index('__nid=')
	return nid_string[:end_index]



def _get_value_of_identifer_or_literal(node):
	"""
	@param {PGNode} node
	@return {list} returns the pair of the value of a node and the node type  (identifer or literal)
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



# ----------------------------------------------------------------------- #
#		Semantic Type Association to Program Slices 
# ----------------------------------------------------------------------- #

def _get_domclob_semtype(source):
	
	if source.startswith("window"):
		return "WIN.DOMCLOB"
	elif source.startswith("document"):
		return "DOC.DOMCLOB"
	else:
		return ""

def _get_semantic_types(program_slices, num_slices, domclob_sources=[]):
	
	"""
	@param {list} program_slices: slices of JS program
	@param {int} num_slices: length of program_slices list
	@return {list} the semantic types associated with the given program slices.
	"""


	semantic_type = SemTypeDefinitions.NON_REACHABLE
	semantic_types = []



	# sources
	WEB_STORAGE_STRINGS = [
		'localStorage',
		'sessionStorage'
	]

	WIN_LOC_STRINGS = [
		'window.location',
		'win.location',
		'w.location',
		'location.href',
		'location.hash',
		'loc.href',
		'loc.hash',
		'History.getBookmarkedState',
	]

	WIN_NAME_STRINGS = [
		'window.name',
		'win.name'
	]

	DOM_READ_STRINGS = [
		'document.getElement',
		'document.querySelector',
		'doc.getElement',
		'doc.querySelector',
		'.getElementBy',
		'.getElementsBy',
		'.querySelector',
		'$(',
		'jQuery(',
		'.attr(',
		'.getAttribute(',
		'.readAttribute('
	]

	DOM_READ_COOKIE_STRINGS = [
		'document.cookie',
		'doc.cookie',
	]

	PM_STRINGS = [
		'event.data', 
		'evt.data'
	]

	DOC_REF_STRINGS = [
		'document.referrer',
		'doc.referrer',
		'd.referrer',
	]

	# push subscription
	PUSH_SUBSCRIPTION_API = [
		'pushManager.getSubscription', 
		'pushManager.subscribe',
		'pushManager',
	]


	for i in range(num_slices):
		program_slice = program_slices[i]
		code = program_slice[0]
		idents = program_slice[2]

		for item in domclob_sources:
			if item in code:
				semantic_type = _get_domclob_semtype(item)
				semantic_types.append(semantic_type)

		for item in WIN_LOC_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_WIN_LOC
				semantic_types.append(semantic_type)
				

		for item in WIN_NAME_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_WIN_NAME
				semantic_types.append(semantic_type)
				

		for item in DOC_REF_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_DOC_REF
				semantic_types.append(semantic_type)



		for item in PM_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_PM
				semantic_types.append(semantic_type)
				


		for item in DOM_READ_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_DOM_TREE
				semantic_types.append(semantic_type)
				

		for item in WEB_STORAGE_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_WEB_STORAGE
				semantic_types.append(semantic_type)
				

		for item in DOM_READ_COOKIE_STRINGS:
			if item in code:
				semantic_type = SemTypeDefinitions.RD_COOKIE
				semantic_types.append(semantic_type)
				

		for item in PUSH_SUBSCRIPTION_API:
			if item in code:
				semantic_type = SemTypeDefinitions.REQ_PUSH_SUB
				semantic_types.append(semantic_type)


		for identifier in idents:

			for item in WIN_LOC_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_WIN_LOC
					semantic_types.append(semantic_type)
					

			for item in WIN_NAME_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_WIN_NAME
					semantic_types.append(semantic_type)
					

			for item in DOC_REF_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_DOC_REF
					semantic_types.append(semantic_type)



			for item in PM_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_PM
					semantic_types.append(semantic_type)
					


			for item in DOM_READ_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_DOM_TREE
					semantic_types.append(semantic_type)
					

			for item in WEB_STORAGE_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_WEB_STORAGE
					semantic_types.append(semantic_type)
					

			for item in DOM_READ_COOKIE_STRINGS:
				if item in identifier:
					semantic_type = SemTypeDefinitions.RD_COOKIE
					semantic_types.append(semantic_type)
		
			for item in PUSH_SUBSCRIPTION_API:
				if item in identifier:
					semantic_type = SemTypeDefinitions.REQ_PUSH_SUB
					semantic_types.append(semantic_type)


	if len(semantic_types):
		return list(set(semantic_types))

	return [SemTypeDefinitions.NON_REACHABLE]


def _get_semantic_type_set(semantic_type_list):
	
	"""
	@param {list} semantic_type_list: list of types that may include duplicate semantic types
	@return {list} a unique semantic type list
	"""

	semantic_type_list = _get_unique_list(semantic_type_list)
	if len(semantic_type_list) > 1:
		if SemTypeDefinitions.NON_REACHABLE in semantic_type_list:
			semantic_type_list.remove(SemTypeDefinitions.NON_REACHABLE)
		return semantic_type_list	

	elif len(semantic_type_list) == 1:
		return semantic_type_list

	else:
		return [SemTypeDefinitions.NON_REACHABLE]

# ---------------------------------------------------------------------------------------- #
#		INTERFACE FUNCTION
# ---------------------------------------------------------------------------------------- #
# def run_traversals(tx, webpage_directory):

# 	# PROCEDURE:
# 	# find each taintable sink TS
# 	# for each TS, find each taintable variable TR
# 	# for each (TS, TR), check if the TR can be controlled via a security-sensitive source (e.g., dom clobbering source)

# 	filename_sinks = os.path.join(webpage_directory, "sinks.out.json")
# 	filename_sources = os.path.join(webpage_directory, "sources.out.json")

# 	# read sinks from disk 
# 	fd_sinks = open(filename_sinks, "r")
# 	content = json.load(fd_sinks)
# 	fd_sinks.close()
	
# 	# read sources from disk 
# 	fd_sources = open(filename_sources, "r")
# 	sources = json.load(fd_sources)
# 	fd_sources.close()

# 	sources = sources["sources"]
# 	source_keys = sources.keys()


# 	webpage_url = content["url"]
# 	webpage_sinks = content["sinks"]
	
# 	for sink_node in webpage_sinks:

# 		encountered_source = get_encountered_source(sink_node["sink_code"], source_keys)
# 		if encountered_source:

# 			with open(os.path.join(webpage_directory, "sink.flows.out"), "a+") as fd:
# 				to_be_written_to_fd = ['[*] Code: %s\n'%sink_node["sink_code"]]
# 				for item in to_be_written_to_fd:
# 					fd.write(item)


# 		elif sink_node["taint_possibility"] == True: 
# 			sink_identifiers = sink_node["sink_identifiers"]
# 			sink_cfg_node = get_ast_topmost(tx, {"Id": "%s"%sink_node["id"]})

# 			## DEBUG
# 			# expression_string = QU.get_code_expression(QU.getChildsOf(tx, sink_cfg_node))
# 			# print(sink_cfg_node["Type"])
# 			# print(sink_node["sink_code"])
# 			# print(expression_string[0])

# 			sink_slices = {}
# 			for each_sink_identifier in sink_identifiers:
# 				slices = DF.get_varname_value_from_context(each_sink_identifier, sink_cfg_node)
# 				sink_slices[each_sink_identifier] = slices

# 			with open(os.path.join(webpage_directory, "sink.flows.out"), "a+") as fd:

# 				to_be_written_to_fd = ['[*] Code: %s\n'%sink_node["sink_code"]]
# 				for varname in sink_slices:
# 					to_be_written_to_fd.append('\tVariable: %s\n'%varname)
# 					slices = sink_slices[varname]
# 					to_be_written_to_fd.extend(DF.pretty_get_program_slices(slices))

# 				for item in to_be_written_to_fd:
# 					fd.write(item)




def run_traversals(tx, webpage_url, webpage_directory, webpage_directory_hash='xxx', named_properties=[]):
	"""
	@param {string} webpage_url
	@param {string} webpage_directory
	@param {list} named_properties: `id` and `name` attributes in HTML that can be accessed through the `document` API
	@return {list} a list of candidate requests for hjacking
	"""

	sinks_file = os.path.join(webpage_directory, "sinks.out.json")
	if not os.path.exists(sinks_file):
		LOGGER.error('[TR] sinks.out file does not exist in %s'%webpage_directory)
		return -1

	sources_file = os.path.join(webpage_directory, "sources.out.json")
	if not os.path.exists(sources_file):
		LOGGER.error('[TR] sinks.out file does not exist in %s'%webpage_directory)
		return -1

	fd_sources = open(sources_file, "r")
	sources = json.load(fd_sources)
	fd_sources.close()
	sources = sources["sources"]
	source_keys = sources.keys()
	
	
	fd = open(sinks_file, 'r')
	sinks_json = json.load(fd)
	fd.close()
	sinks_list = sinks_json['sinks']

	storage = {}


	for sink_node in sinks_list:


		sink_identifiers = sink_node["sink_identifiers"]
		sink_taint_possiblity = sink_node["taint_possibility"]
		

		sink_id = str(sink_node["id"])
		sink_location = str(sink_node["location"])
		sink_type = sink_node["sink_type"]
		sink_code = sink_node["sink_code"]
		sink_cfg_node = QU.get_ast_topmost(tx, {"Id": "%s"%sink_id})

		# if DEBUG: 
		# 	print(QU.get_code_expression(QU.getChildsOf(tx, sink_cfg_node)))
		# 	print('sink_cfg_node', sink_cfg_node['Id'])
		

		nid = sink_type + '__nid=' + sink_id + '__Loc=' + sink_location

		sink_taintable_semantic_types = _get_semantic_types([[sink_code, [], []]], 1, source_keys)

		sink_node["taintable_semantic_types"] = sink_taintable_semantic_types
		sink_node["cfg_node_id"] = sink_cfg_node["Id"]

		storage[nid] = {
			"sink": sink_node,
			"variables": {}
		}


		for varname in sink_identifiers:
			slice_values = DF._get_varname_value_from_context(tx, varname, sink_cfg_node)

			if DEBUG: print(varname, slice_values)

			semantic_types = _get_semantic_types(slice_values,len(slice_values),source_keys)
			storage[nid]["variables"][varname]= {
				"slices": slice_values,
				"semantic_types": semantic_types
			}

			lst = storage[nid]["sink"]["taintable_semantic_types"]
			lst.extend(semantic_types)
			storage[nid]["sink"]["taintable_semantic_types"] = lst



	
	print_buffer = []
	json_buffer =  {} # TODO: store data in JSON format too: `sinks.flows.out.json`

	timestamp = _get_current_timestamp()
	sep = utilityModule.get_output_header_sep()
	sep_sub = utilityModule.get_output_subheader_sep()
	print_buffer.append(sep)
	print_buffer.append('[timestamp] generated on %s\n'%timestamp)
	print_buffer.append(sep+'\n')
	print_buffer.append('[*] webpage URL: %s\n\n'%webpage_url)
	print_buffer.append(sep_sub+'\n')

	json_buffer["url"] = webpage_url
	json_buffer["flows"] = []
	for sink_nid in storage:

		sink_node = storage[sink_nid]["sink"]

		print_buffer.append('[*] webpage: %s\n'%webpage_directory_hash)
		script_name = sink_node["script"].split('/')[-1]
		print_buffer.append('[*] script: %s\n'%script_name)
		semantic_types_for_sink = _get_unique_list(sink_node["taintable_semantic_types"])
		print_buffer.append('[*] semantic_types: {0}\n'.format(semantic_types_for_sink))
		print_buffer.append('[*] node_id: %s\n'%str(sink_node["id"]))
		print_buffer.append('[*] cfg_node_id: %s\n'%str(sink_node["cfg_node_id"]))
		print_buffer.append('[*] loc: %s\n'%sink_node["location"])
		print_buffer.append('[*] sink_type: %s\n'%(sink_node["sink_type"]))
		print_buffer.append('[*] sink_code: %s\n'%sink_node["sink_code"])

		json_flow_object = {
			"webpage": webpage_directory_hash,
			"script": script_name,
			"semantic_types": semantic_types_for_sink,
			"node_id": str(sink_node["id"]),
			"cfg_node_id": str(sink_node["cfg_node_id"]),
			"loc": sink_node["location"],
			"sink_type": sink_node["sink_type"],
			"sink_code": sink_node["sink_code"],
			"program_slices": {},
		}

		program_slices_dict = storage[sink_nid]["variables"]
		varnames = program_slices_dict.keys()
		counter = 1


		for varname in varnames:
			
			program_slices =  program_slices_dict[varname]["slices"]
			num_slices = len(program_slices)
			varname_semantic_types = program_slices_dict[varname]["semantic_types"]

			idx = 0
			for i in range(num_slices):
				idx +=1
				program_slice = program_slices[i]
				loc = _get_line_of_location(program_slice[3])
				code = program_slice[0]		

				if 'function(' in code:
					code = jsbeautifier.beautify(code) # pretty print function calls


				current_slice = { 
					"index": str(idx),
					"loc": loc,
					"code": code,
				}

				if i == 0 and varname in code:

					a = '\n%d:%s variable=%s\n'%(counter, str(varname_semantic_types), varname)
					counter += 1
					b = """\t%s (loc:%s)- %s\n"""%(str(idx), loc,code)
					print_buffer+= [a, b]

					if varname not in json_flow_object["program_slices"]:
						json_flow_object["program_slices"][varname] = {
							"semantic_types": varname_semantic_types, 
							"slices": [current_slice],
						}
					else:
						json_flow_object["program_slices"][varname]["slices"].append(current_slice)

				else:
					a = """\t%s (loc:%s)- %s\n"""%(str(idx), loc,code)
					print_buffer += [a]

					if varname not in json_flow_object["program_slices"]:
						json_flow_object["program_slices"][varname] = {
							"semantic_types": varname_semantic_types, 
							"slices": [current_slice],
						}
					else:
						json_flow_object["program_slices"][varname]["slices"].append(current_slice)

		json_buffer["flows"].append(json_flow_object)
		print_buffer.append('\n\n')
		print_buffer.append(sep_sub)

	output_file = os.path.join(webpage_directory, "sinks.flows.out")
	with open(output_file, "w+") as fd:
		for line in print_buffer:
			fd.write(line)

	output_file_json = os.path.join(webpage_directory, "sinks.flows.out.json")
	with open(output_file_json, "w+") as fd:
		json.dump(json_buffer, fd, ensure_ascii=False, indent=4)


	LOGGER.info('[TR] finished running the queries.')










