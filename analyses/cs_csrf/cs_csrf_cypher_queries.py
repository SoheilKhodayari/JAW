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
	Detecting Client-Side CSRF vulnerabilities

	Usage:
	-----------
	> import analyses.cs_csrf.cs_csrf_cypher_queries as CSRFTraversalsModule

"""

import subprocess
import hashlib
import urllib.parse
import os
import time
import re
import sys
import pickle
import functools
import jsbeautifier
import itertools
import difflib
import json

import constants as constantsModule
import utils.utility as utilityModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
import analyses.cs_csrf.semantic_types as CSRFSemanticTypes

from utils.logging import logger
from neo4j import GraphDatabase
from datetime import datetime





# ----------------------------------------------------------------------- #
#				Globals
# ----------------------------------------------------------------------- #


DEBUG = False

# ----
# @Syntactic queries (deprecated)
# a set of queries for syntactic matching
SYNTACTIC_QUERIES_ACTIVE = False

# ----
# Ad-hoc queries: expensive for large property graphs 

# pure query-based PDG analsis of 1-Level only;
AD_HOC_QUERY_1_ACTIVE = False

# query support for value flow and dependency, simple function resolutions with argument support, events 
AD_HOC_QUERY_2_ACTIVE = False 

# support for pointsTo & aliasing
AD_HOC_QUERY_3_ACTIVE = False 

# more support for pointsTo & aliasing
AD_HOC_QUERY_4_ACTIVE = False 

# ----
# Main queries:
# detect what parts of the xhr data are tainted from which parts of the program
# detection through forward or backward type propagation and program slicing.
MAIN_QUERY_ACTIVE = True



# ----------------------------------------------------------------------- #
#				Utility Functions
# ----------------------------------------------------------------------- #




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
#			Experimental Utils
# ----------------------------------------------------------------------- #

def getValueOf(tx, varname, rootContextNode):
	"""
	@param tx {pointer} neo4j transaction pointer
	@param varname {string} variable whose value is to be resolved
	@rootContextNode {node object} context of the given variable to resolve
	@return {list} an array of triple elemenets containing information regarding inferred variable values, their literals and identifiers
	"""

	outValues = [] #list of values (its a list due to potential assigments of different values in (dynamic-valued) if-conditions)
	PROGRAM_NODE_INDEX = '1' # program node

	# for PDG relations
	query = """
	MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t) RETURN collect(distinct n_t) AS resultset
	"""%(rootContextNode['Id'], varname)

	results = tx.run(query)
	for item in results: 
		childNodes = item['resultset'] 
		for childNode in childNodes:
			tree = getChildsOf(tx, childNode)
			contextNode = tree['node']
			if contextNode['Id'] == PROGRAM_NODE_INDEX: 
				continue
			ex = getCodeExpression(tree)
			[code_expr, literals, idents] = ex
			outValues.append(ex)
			
			new_varnames = _get_unique_list(list(idents)) 
			for new_varname in new_varnames:
				if new_varname == varname: continue
				v = getValueOf(tx, new_varname, contextNode)
				outValues.extend(v)	

	return outValues


def wrapTryExceptOn(statement):
	"""
	@param {string} statement
	@return {string} statement wrapped over try/except block
	"""
	code = """try:\t%s\nexcept:\n\tpass\n"""%(statement)
	return code

def resolveValueOf(tx, varname, rootContextNode):
	"""
	@param tx {pointer} neo4j transaction pointer
	@param varname {string} variable whose value is to be resolved
	@rootContextNode {node object} context of the given variable to resolve
	@return {list} an array of inferred variable values
	"""

	outValues = []
	bases = []
	extensions = []
	values = getValueOf(tx, varname, rootContextNode)

	if DEBUG: print("getValueOf: %s "%values)
	values = getResolvedPointsTo(values)
	if DEBUG: print("getResolvedPointsTo: %s "%values)
	values = getFunctionResolvedValues(values)
	if DEBUG: print("getFunctionResolvedValues: %s "%values)

	if len(values):
		ordered_expr = values[::-1]
		program = [element[0] for element in ordered_expr]
		p = itertools.permutations(program)

		## @TODO: run-time improvement!
		# this way of exec per statement correctly ignores unknown methods or functions & is slow!
		for perm in p:
			exec('%s=\"\"'%varname) # reset varname
			new_perm = [wrapTryExceptOn(st) for st in perm]
			new_code = '\n'.join(new_perm)
			try:
				exec(new_code)
				v = eval(varname)
				if v not in outValues:
					outValues.append(v)
			except Exception as e:
				print("type error: " + str(e))

	return outValues



def getResolvedPointsTo(values):
	"""
	@param {list} values
	@return {list} pointTo resolved array
	"""
	new_values = []
	to_resolve = []
	resolve_names = []
	resolved = []
	for ii in range(len(values)):
		item = values[ii]
		expr = item[0]
		lits = item[1]
		idents = item[2]
		if '.' in expr:
			parts = expr.split(" ")
			for part in parts:
				if '.' in part:
					members = part.split('.')
					for k in range(len(members)-1): # do not resolve the last one as it is already resolved
						stripped_member = members[k].strip()
						to_resolve.append([ii, stripped_member])
						resolve_names.append(stripped_member)

	for jj in range(len(values)):
		resolver = values[jj]
		resolver_expr = resolver[0]
		cont = True
		for o in resolve_names:
			if o in resolver_expr:
				cont = False
				break
		if cont: 
			continue

		# at this point resolver_expr can resolve values of to_resolve list
		assignmentSymbol = "="
		assignmentIndex = resolver_expr.index(assignmentSymbol)
		left = resolver_expr[:assignmentIndex].strip()
		right =resolver_expr[assignmentIndex+1:].strip()

		for item in to_resolve:
			item_idx = item[0]
			item_name = item[1]
			if item_name == left:
				new = values[item_idx][0].replace(" "+left+ ".", " "+right+".") # disallow replace within word-parts
				values[item_idx][0] = new
				values[item_idx][2].append(right) # add the new identifier

	return values


def getFunctionResolvedValues(values):
	"""
	@param {list} values:  resolved values, the result of 'resolveValueOf' function
	@return {list} values with the function calls resolved as variables
	"""
	vals = []
	functions = []
	for idx in range(len(values)):
		value = values[idx]
		literals = value[1]
		idents = value[2]
		parts = value[0].split(" ")
		
		done = False

		resolve_func = []
		arg_stack = []
		new_parts = []
		for i in range(len(parts)-1):
			if not (parts[i] in idents and parts[i+1] in idents):
				new_parts.append(parts[i])
		i = 0
		while not done:
			if new_parts[i] in literals:
				arg_stack.append(new_parts[i])
			if new_parts[i] in idents and new_parts[i-1] in literals and i >=1: # @Note functions without values would be treated like identifiers, so the middle condition does not (correctly) check that case!
				resolve_func.append([new_parts[i], arg_stack[::-1]])
				arg_stack = []
			if i == len(new_parts)-1:
				done = True
				break
			i = i + 1

		if len(resolve_func):
			functions.append([idx, resolve_func])


	toIgnoreIndexes =  [] # modified statements containing function calls + function definitions
	# resolve the value and add its result
	for j in range(len(values)):
		v = values[j]
		resolveExpression = v[0]
		name = resolveExpression.split(" ")[0]
		for funcItem in functions:
			resolveIndex = funcItem[0]
			funcDescriptions = funcItem[1]
			for func in funcDescriptions:
				# @Note: multiple functions of the same expr to be resolved
				funcName = func[0]
				if  name == funcName:
					callParams = func[1]
					border = len(resolveExpression) - 2*len(callParams)
					positionalArguments = resolveExpression[border:].split(" ")[::-1]
					resolveExpression = resolveExpression[:border] #remove positional arguments
					for k in range(len(callParams)):
						resolveExpression = resolveExpression.replace(positionalArguments[k], callParams[k])
					idss = values[resolveIndex][2]
					litss = values[resolveIndex][1]

					# 1. append the function body with the arguments replaced with passed params
					new_ids = v[2] + idss
					for arg in positionalArguments:
						new_ids = list(filter(lambda e: e != arg, new_ids)) # remove the positional args from identifiers list in of function body
					vals.append([resolveExpression, v[1] + litss, new_ids]) 
					toIgnoreIndexes.append(j)

					# 2. append the original expr contating function calls with removing the function params and treat it as a variable
					original_expr = values[resolveIndex][0]
					for arg in callParams:
						original_expr = original_expr.replace(arg, "")
					vals.append([original_expr, litss, idss])
					toIgnoreIndexes.append(resolveIndex)

	for p in range(len(values)):
		if p not in toIgnoreIndexes:
			item = values[p]
			vals.append(item)

	# break the 'assignment' statements if a function body;
	# Note: this will not break other things like method invocations, etc, as not required
	outVals = []
	for qq in range(len(vals)):
		item = vals[qq]
		item_expr = item[0]
		item_literals = item[1]
		item_idents = item[2]
		item_expr_list = item_expr.split(" ")
		break_indexes = []
		for q in range(len(item_expr_list)-1):
			# two idents or literals or their combination must not occur next to each other in the list without an operator in between them!
			if  (item_expr_list[q] in item_idents or item_expr_list[q] in item_literals) and \
				(item_expr_list[q+1] in item_idents or item_expr_list[q+1] in item_literals):
				breaked = True
				break_indexes.append(q)
		
		rest = []
		for iii in range(len(break_indexes)):
			if iii == 0:
				subexpression = item_expr_list[:break_indexes[iii]+1]
				rest = item_expr_list[break_indexes[iii]+1:]
	
			elif len(break_indexes) >=2:
				subexpression = item_expr_list[break_indexes[iii-1]+1: break_indexes[iii]+1]
				rest = item_expr_list[break_indexes[iii]+1:]

			outVals.append([' '.join(subexpression), item_literals, item_idents])

		if len(break_indexes):
			if len(rest):
				outVals.append([' '.join(rest), item_literals, item_idents])
		else:
			outVals.append(item)

	return outVals

# ----------------------------------------------------------------------- #
#		Semantic Type Association to Program Slices 
# ----------------------------------------------------------------------- #

def _get_semantic_type(program_slices, num_slices, document_vars, find_endpoint_tags=False):
	
	"""
	@param {list} program_slices: slices of JS program
	@param {int} num_slices: length of program_slices list
	@param {list} document_vars: fields in HTML forms accessbile by the 'document' DOM API
	@return {list} the semantic types associated with the given program slices.
	"""


	semantic_type = CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE
	semantic_types = []

	# API patterns to match to asscoiate a program slice string to a semantic type
	WEB_STORAGE_STRINGS = [
		'localStorage',
		'sessionStorage'
	]

	WIN_LOC_STRINGS = [
		'window.location',
		'location.href',
		'location.hash',
		'History.getBookmarkedState'
	]

	WIN_NAME_STRINGS = [
		'window.name'
	]

	DOM_READ_STRINGS = [
		'document.getElement',
		'.getElementBy',
		'.getElementsBy',
		'$(',
		'jQuery(',
		'.attr(',
		'.getAttribute(',
		'.readAttribute('
	]

	DOM_READ_COOKIE_STRINGS = [
		'document.cookie'
	]

	PM_STRINGS = [
		'event.data', 
		'evt.data'
	]

	DOC_REF_STRINGS = [
		'document.referrer'
	]

	if find_endpoint_tags:
			code = program_slices
			for var in document_vars:
				if var in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in WEB_STORAGE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_LOC_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_LOC_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_NAME_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
					semantic_types.append(semantic_type)
					break

			for item in DOC_REF_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_COOKIE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in PM_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
					semantic_types.append(semantic_type)
					break


	else:
		for i in range(num_slices):
			program_slice = program_slices[i]
			code = program_slice[0]
			idents = program_slice[2]


			for var in document_vars:
				if var in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)

			for item in WIN_LOC_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_LOC_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOM_READ
					semantic_types.append(semantic_type)
					break

			for item in WEB_STORAGE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
					semantic_types.append(semantic_type)
					break

			for item in DOM_READ_COOKIE_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
					semantic_types.append(semantic_type)
					break

			for item in WIN_NAME_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
					semantic_types.append(semantic_type)
					break

			for item in DOC_REF_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
					semantic_types.append(semantic_type)
					break

			for item in PM_STRINGS:
				if item in code:
					semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
					semantic_types.append(semantic_type)
					break

			for identifier in idents:

				for item in WEB_STORAGE_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_LOCAL_STORAGE_READ
						semantic_types.append(semantic_type)
						break

				for item in DOM_READ_COOKIE_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_COOKIE_READ
						semantic_types.append(semantic_type)
						break

				for item in WIN_NAME_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_WIN_NAME_READ
						semantic_types.append(semantic_type)
						break

				for item in DOC_REF_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_DOC_REF_READ
						semantic_types.append(semantic_type)
						break

				for item in PM_STRINGS:
					if item in identifier:
						semantic_type = CSRFSemanticTypes.SEM_TYPE_PM_READ
						semantic_types.append(semantic_type)
						break

	if len(semantic_types):
		return semantic_types

	return [CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE]


def _get_semantic_type_set(semantic_type_list):
	
	"""
	@param {list} semantic_type_list: list of types that may include duplicate semantic types
	@return {list} a unique semantic type list
	"""

	semantic_type_list = _get_unique_list(semantic_type_list)
	if len(semantic_type_list) > 1:
		if CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE in semantic_type_list:
			semantic_type_list.remove(CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE)
		return semantic_type_list	

	elif len(semantic_type_list) == 1:
		return semantic_type_list

	else:
		return [CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE]


# ----------------------------------------------------------------------- #
#				End Utils
# ----------------------------------------------------------------------- #

def getWindowOpenCallExpressions(tx):
	
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the xhr.open() function
	"""

	query="""
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'open'}),
	(n1)-[:AST_parentOf {RelationType: 'object'}]->(callee),
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(a)
	WHERE callee.Code= 'window'
	RETURN t, n, a
	"""
	results = tx.run(query)
	return results


def getXhrOpenCallExpressions(tx):
	
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the xhr.open() function
	"""

	query="""
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'open'}),
	(n1)-[:AST_parentOf {RelationType: 'object'}]->(callee),
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
	WHERE callee.Code <> 'window'
	RETURN t, n, a
	"""
	results = tx.run(query)
	return results



def getFetchCallExpressions(tx):
	
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the fetch() function
	"""

	query="""
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (req {Type: 'Identifier', Code: 'fetch'}), 
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(a)
	RETURN t, n, a
	"""
	results = tx.run(query)
	return results



def getAjaxCallExpressions(tx):
	
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the $.ajax() function
	"""

	# argument a can be ObjectExpression, Identifier, or MemberExpression
	# variable relation length will capture function chains, e.g., $.ajax({}).done().success().failure() etc.
	query="""
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf*1..10]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'ajax'}),
	(n1)-[:AST_parentOf {RelationType: 'object'}]->(n2 {Type: 'Identifier' }),
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(a)
	OPTIONAL MATCH (a)-[:AST_parentOf {RelationType: 'properties'}]->(n4 {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(n5 {Type: 'Identifier', Code: 'url'}),
	(n4)-[:AST_parentOf {RelationType: 'value'}]->(aa)
	RETURN t, n, a, aa
	"""
	results = tx.run(query)

	return results


def xhrPostCallExpressions(tx):
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=options argument of the xhrPost(endpoint, options) function

	@Note: xhrPost is used e.g., in tinytinyrss
	"""
	query="""
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (req {Type: 'Identifier', Code: 'xhrPost'}), 
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
	RETURN t, n, a
	"""
	results = tx.run(query)
	return results




def getAsyncRequestCallExpressions(tx):
	
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the asyncRequest() function
	"""

	query="""
	MATCH (t)-[:AST_parentOf]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]->(n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'asyncRequest'}),
	(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
	OPTIONAL MATCH (tt)-[:AST_parentOf]->(t) WHERE tt.Type='VariableDeclaration' OR tt.Type='ExpressionStatement'
	RETURN  tt, t, n, a
	"""
	results = tx.run(query)
	return results



def getSetFormCallExpressions(tx):

	"""
	@param {pointer} tx
	@return 
	"""

	query = """
	MATCH (call_expression {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-(member_expression {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(set_form {Code:'setForm', Type: 'Identifier'}),
	(call_expression)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(arg), (t)-[:AST_parentOf]->(call_expression)
	OPTIONAL MATCH (tt)-[:AST_parentOf]->(t) WHERE tt.Type='VariableDeclaration' OR tt.Type='ExpressionStatement'
	RETURN tt, t, call_expression as n, arg as a
	"""
	results = tx.run(query)
	return results


def getPageSpeedExpressions(tx):
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the asyncRequest() function
	"""

	query = """
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(call_expr {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]->(member_expr {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(run {Type: 'Identifier', Code: 'Run'}),
	(member_expr)-[:AST_parentOf {RelationType: 'object'}]->(inner_member_expression {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(ci {Type: 'Identifier', Code: 'CriticalImages'}), (inner_member_expression)-[:AST_parentOf {RelationType: 'object'}]->(ps {Type: 'Identifier', Code: 'pagespeed'}),
	(call_expr)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
	RETURN t, call_expr AS n, a
	"""
	results = tx.run(query)
	return results


def getAjaxSettingObjectExpressions(tx):
	"""
	@param {pointer} tx
	@return bolt result (t, n, a): where t= top level exp statement, n = ObjectExpression, a=URL argument of the ajaxSettings{} 
	"""

	query = """
	MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf*1..5]->(call_expr {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'arguments'}]->(obj_expr {Type: 'ObjectExpression'})-[:AST_parentOf {RelationType: 'properties'}]->(ajaxSettingsProperty {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(ajaxSettingsIdentifier {Type: 'Identifier', Code: 'ajaxSettings'}),
	(ajaxSettingsProperty)-[:AST_parentOf {RelationType: 'value'}]->(ajaxSettingsObjExpr {Type: 'ObjectExpression'})-[:AST_parentOf {RelationType: 'properties'}]->(urlProperty {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(url {Type: 'Identifier', Code: 'url'}),
	(urlProperty)-[:AST_parentOf {RelationType: 'value'}]->(a)
	RETURN t, ajaxSettingsProperty AS n, a
	"""
	results = tx.run(query)
	return results



def getHttpRequestCallExpressionUrlArgument(tx, node, function_type):
	
	"""
	@param {pointer} tx
	@param {node} node: 'CallExpression' node 
	@param {string} function_type: options are ajax, fetch, open
	@return bolt result (n, a): where t= top level exp statement, n = callExpression, a=URL argument of the request-sending function
	"""

	nodeId = node['Id']
	out = []
	query = ''
	if function_type == 'fetch':
		query="""
		MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n { Id: '%s', Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (req {Type: 'Identifier', Code: 'fetch'}), 
		(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(a)
		RETURN t, n, a
		"""%(nodeId)
	elif function_type == 'open':
		query="""
		MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n { Id: '%s', Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'open'}), 
		(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
		RETURN t, n, a
		"""%(nodeId)
	elif function_type == 'ajax':
		query="""
		MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n { Id: '%s', Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'ajax'}),
		(n1)-[:AST_parentOf {RelationType: 'object'}]->(n2 {Type: 'Identifier', Code: '$'}),
		(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(n3 {Type: 'ObjectExpression'})-[:AST_parentOf {RelationType: 'properties'}]->(n4 {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(n5 {Type: 'Identifier', Code: 'url'}),
		(n4)-[:AST_parentOf {RelationType: 'value'}]->(a)
		RETURN t, n, a
		"""%(nodeId)
	elif function_type == 'asyncRequest':
		query="""
		MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n { Id: '%s', Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]->(n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'asyncRequest'}),
		(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":1}'}]->(a)
		RETURN t, n, a
		"""%(nodeId)
	if len(query):
		out = tx.run(query)
	return out



def getCodeExpression(wrapperNode):

	"""
	@param {dict} wrapperNode
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = []
	literals = []
	node = wrapperNode['node']
	children = wrapperNode['children']
	
	if 'Type' in node:
		ntype = node['Type']
	else:
		ntype = ''

	if ntype == 'Literal':
		value =  node['Value']
		if value:
			value = "\"%s\""%value
			literals.append(value)
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'Identifier':
		value =  node['Code']
		if value:
			idents.append(value)
			return [value, literals, idents]
		else:
			return ['', literals, idents]

	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression' or ntype == 'VariableDeclarator':
		opertor = node['Code']
		[right, lits1, ids1] = getCodeExpression(children[0])
		[left, lits2, ids2] = getCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents.extend(ids1)
		idents.extend(ids2)
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = getCodeExpression(children[0])
		[left, lits2, ids2] = getCodeExpression(children[1])
		value = str(left) + opertor + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents.extend(ids1)
		idents.extend(ids2)
		return [value, literals, idents]

	else:
		expr = []
		for childWrapperNode in children:
			result = getCodeExpression(childWrapperNode)
			currentExpr = result[0]
			lits = result[1]
			ids = result[2]
			expr.append(currentExpr)
			literals.extend(lits)
			idents.extend(ids)

		return [ ' '.join(expr), literals, idents]
	
def getAdvancedCodeExpression(wrapperNode, is_argument = False, relation_type=''):

	"""
	@param {dict} wrapperNode
	@return {list} a list containing the code expression string of a given cypher node + the identifiers + the literals
	"""

	idents = {}
	literals = []

	node = wrapperNode['node']
	children = wrapperNode['children']
	
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
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'IfStatement':

		if len(children) == 2:
			[consequent, lits2, ids2] = getAdvancedCodeExpression(children[0])
			[test, lits1, ids1] = getAdvancedCodeExpression(children[1])
			value = 'if(%s){ %s }'%(test, consequent)

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			return [value, literals, idents]
		elif len(children) == 3:
			[alternate, lits1, ids1] = getAdvancedCodeExpression(children[0])
			[consequent, lits2, ids2] = getAdvancedCodeExpression(children[1])
			[test, lits3, ids3] = getAdvancedCodeExpression(children[2])
			value = 'if(%s){ %s } else{ %s }'%(test, consequent, alternate)

			literals.extend(lits1)
			literals.extend(lits2)
			literals.extend(lits3)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
			idents = {**idents, **ids3}

			return [value, literals, idents]

	elif ntype == 'ConditionalExpression':
		
		[alternate, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[consequent, lits2, ids2] = getAdvancedCodeExpression(children[1])
		[test, lits3, ids3] = getAdvancedCodeExpression(children[2])
		value = '(%s)? %s: %s'%(test, consequent, alternate)

		literals.extend(lits1)
		literals.extend(lits2)
		literals.extend(lits3)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		idents = {**idents, **ids3}

		return [value, literals, idents]

	elif ntype == 'NewExpression':
		[callee, lits1, ids1] = getAdvancedCodeExpression(children[0])
		literals.extend(lits1)
		idents = {**idents, **ids1}
		value = 'new '+ callee + '()'
		return [value, literals, idents]

	elif ntype == "Property":
		[key, lits1, ids1] = getAdvancedCodeExpression(children[1])
		[value, lits2, ids2] = getAdvancedCodeExpression(children[0])
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
				[prop, lits, ids]= getAdvancedCodeExpression(ch)
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
				[prop, lits, ids]= getAdvancedCodeExpression(ch)
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
			[callee, lits1, ids1] = getAdvancedCodeExpression(children[0])
			args = ''
			value = str(callee) + '(' +  args + ')'
			return [value, literals, idents]

		else:
			args = []
			callee = ''
			for i in range(len(children)):
				ch = children[i]
				[expr_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
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
		[arg, lits, ids] = getAdvancedCodeExpression(ch)
		idents = {**idents, **ids}
		literals.extend(lits)
		value = arg+ operator
		return [value, literals, idents]

	elif ntype == 'VariableDeclaration':
		# can also add node['Kind'] to the return value (e.g., var, let, const)
		kind = node['Kind']
		declarations = []
		for ch in children:
			[expr_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
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
			[left, lits, ids] = getAdvancedCodeExpression(children[0])
			literals.extend(lits)
			idents = {**idents, **ids}
			value = left;
			return [value, literals, idents]
		else:
			opertor = node['Code']
			[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
			[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
			value = str(left) + ' ' + opertor + ' ' + str(right)
			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}
		return [value, literals, idents]


	elif ntype == 'BinaryExpression' or ntype == 'AssignmentExpression':
		opertor = node['Code']
			
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])
		value = str(left) + ' ' + opertor + ' ' + str(right)
		literals.extend(lits1)
		literals.extend(lits2)
		idents = {**idents, **ids1}
		idents = {**idents, **ids2}
		return [value, literals, idents]

	elif ntype == 'MemberExpression':
		opertor = '.'
		[right, lits1, ids1] = getAdvancedCodeExpression(children[0])
		[left, lits2, ids2] = getAdvancedCodeExpression(children[1])

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
				[body, lits_i, ids_i] = getAdvancedCodeExpression(ch)
			else:
				[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)
				args.append(arg_i)

			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'catch( ' + ','.join(args) + ' ){ %s'%(body) + ' }'
		return [value, literals, idents]	

	elif ntype == 'TryStatement':
		if len(children) == 2:

			[catch_block, lits2, ids2] = getAdvancedCodeExpression(children[0])
			[try_block, lits1, ids1] = getAdvancedCodeExpression(children[1])

			literals.extend(lits1)
			literals.extend(lits2)
			idents = {**idents, **ids1}
			idents = {**idents, **ids2}

			value = 'try{ %s } %s'%(try_block, catch_block)
			return [value, literals, idents] 

		elif len(children) == 3:
			[finally_block, lits3, ids3] = getAdvancedCodeExpression(children[0])
			[catch_block, lits2, ids2] = getAdvancedCodeExpression(children[1])
			[try_block, lits1, ids1] = getAdvancedCodeExpression(children[2])

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
				[block, lits_i, ids_i] = getAdvancedCodeExpression(ch)	
			else:
				[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch)

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
				[block, lits_i, ids_i] = getAdvancedCodeExpression(ch)	
			else:
				if i == n_childs-1: # function name
					[fname, lits_i, ids_i] = getAdvancedCodeExpression(ch) 
					function_name = fname
				else:
					[arg_i, lits_i, ids_i] = getAdvancedCodeExpression(ch) 
					args.append(arg_i)


			literals.extend(lits_i)
			idents = {**idents, **ids_i}

		args = args[::-1]
		value = 'function %s('%(function_name) + ','.join(args) + '){ ' + block + ' }'
		return [value, literals, idents]	


	else:
		expr = []
		for childWrapperNode in children:
			result = getAdvancedCodeExpression(childWrapperNode)
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




def getIdentifierLocalAndGlobalValues(tx, varname):
	"""
	gets the expected value(s) of an identifier from local and global scopes
	@param tx {pointer} neo4j transaction pointer
	@param {string} varname: identifier to resolve
	@return {list} list of back traces for the given identifer
	"""

	stack = []
	query = """
		MATCH (n { Type:'Identifier', Code: '%s'})<-[:AST_parentOf {RelationType: 'id'}]-(vdtor {Type: 'VariableDeclarator'})<-[:AST_parentOf {RelationType:'declarations'}]-(vdtion),
		(vdtor)-[:AST_parentOf {RelationType: 'init'}]->(value)
		RETURN vdtion, value
	"""%(varname)
	results = tx.run(query)

	for pair in results:
		# must at most one pair exist, otherwise, there are 2 or more potential values defined for a single variable at different scopes!
		top_variable_declaration = pair['vdtion']
		init_value = pair['value']
		recurse = False
		if init_value['Type'] == 'Literal':
			expression = '%s %s = \"%s\"'%(top_variable_declaration['Kind'], varname, init_value['Value'])
		elif init_value['Type'] == 'Identifier':
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, init_value['Code'])
			recurse = True
		elif init_value['Type'] == 'FunctionExpression':
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, 'function(){ ... }')
		else:
			init_tree = getChildsOf(tx, init_value)
			ce = getAdvancedCodeExpression(init_tree)
			expression = '%s %s = %s'%(top_variable_declaration['Kind'], varname, ce[0]) 	
			
		knowledge = {varname: {'top': top_variable_declaration, 'init': init_value, 'expression': expression}} 
		stack.append(knowledge)

		if recurse:
			new_varname = init_value['Code']
			child_stack = getIdentifierLocalAndGlobalValues(tx, new_varname)
			stack.extend(child_stack)



	return stack

def getProgramSliceFormat(back_traces):
	"""
	@param {list} back_traces: output of getIdentifierLocalAndGlobalValues
	@return {list} format compatible with getAdvancedCodeExpression function
	"""
	output = []
	for dict_item in back_traces:
		varname = list(dict_item)[0]
		knowledge_value = dict_item[varname]
		
		expression = knowledge_value['expression']
		top = knowledge_value['top']
		location = top['Location']
		init = knowledge_value['init']

		lits = []
		idents = []
		
		if init['Type'] == 'Literal':
			lits.append(init['Value'])
		elif init['Type'] == 'Identifier':
			idents.append(init['Code'])

		item = [expression, lits, idents, location]
		output.append(item)

	return output

def isVariableAFunctionArgumentInCurrentScope(tx, varname, varname_nid):
	"""
	@DEPRECATED
	@param {pointer} tx: neo4j transaction pointer
	@param {string} varname
	@param {string} varname_nid: node id of varname
	@return {tuple<bool,list>} boolean + the top function if true + function_name
	"""

	# Case 1: Function Expression as Variable Decleration, e.g., var f = function(varname) { ... }
	query1 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'id'}]-(vd {Type: 'VariableDeclarator'})-[:AST_parentOf {RelationType: 'init'}]->(n {Type:'FunctionExpression'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)

	# Case 2: Function Expression as Dictionary Key, e.g., f: function(varname) { ... }
	query2 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'key'}]-(vd {Type: 'Property'})-[:AST_parentOf {RelationType: 'value'}]->(n {Type:'FunctionExpression'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)

	# Case 3: Function Declaration, e.g., function f(varname) { ...}
	query3 = """
	MATCH (fname {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'id'}]-(n {Type:'FunctionDeclaration'})-[:AST_parentOf {RelationType: 'params'}]-(arg { Type:'Identifier', Code: '%s'}),
	(n)-[:AST_parentOf {RelationType: 'body'}]->(block {Type: 'BlockStatement'})-[:AST_parentOf|:CFG_parentOf*]->(variable { Id:'%s', Type:'Identifier', Code: '%s'}) 
	RETURN distinct(n) as top, fname
	"""%(varname, varname_nid, varname)


	res = tx.run(query1)   # queries should only find one function!
	for item in res:
		fn1 = item['top']
		func_name_node = item['fname']
		return [True, fn1, func_name_node]

	res = tx.run(query2)
	for item in res:
		fn2 = item['top']
		func_name_node = item['fname']
		return [True, fn2, func_name_node]

	res = tx.run(query3)
	for item in res:
		fn3 = item['top']
		func_name_node = item['fname']
		return [True, fn3, func_name_node]

	return [False, None, None]


def getFunctionCallValuesOfFunctionDefinitions(tx, functionDefNode):
	"""
	navigates the call graph to find the bindings between 'function-call arguments' & 'function definition params'
	@param {pointer} tx: neo4j transaction pointer
	@param {node} functionDefNode: a 'FunctionExpression' or 'FunctionDeclaration' node of esprima AST
	@return {dictionary} { call_line: {p1: val1, p2:val2}, call_line: {p1: val1, p2: val2}, ... }
	"""
	out = {}
	query = """
	MATCH (param)<-[:AST_parentOf {RelationType: 'params'}]-(functionDef { Id: '%s' })<-[:CG_parentOf]-(caller {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'arguments'}]-> (arg) RETURN collect(distinct param) as params, caller, collect(distinct arg) AS args
	"""%(functionDefNode['Id'])


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
				[param, param_type] = _get_value_of_identifer_or_literal(params[i])
				argument_type = args[i]['Type']
				if argument_type== 'MemberExpression':
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'MemberExpression'
				elif argument_type== 'ObjectExpression':
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = 'ObjectExpression'
				elif argument_type== 'Literal' or argument_type== 'Identifier':
					[arg, arg_type] = _get_value_of_identifer_or_literal(args[i])
					identifiers = None
				else:
					tree = getChildsOf(tx, args[i])
					ce = getAdvancedCodeExpression(tree)
					identifiers =  ce[2]
					arg = ce[0]
					arg_type = argument_type

				out[key][param] = {'Value': arg, 'Type':arg_type, 'ResolveIdentifiers': identifiers}

	return out


def getThisPointerResolution(tx, this_node):
	
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


# ----------------------------------------------------------------------- #
#			Main: Taint Analsis
# ----------------------------------------------------------------------- #

@functools.lru_cache(maxsize=512)
def getValueOfWithLocationChain(tx, varname, rootContextNode, recurse_counter=0, PDG_on_variable_declarations_only=False, context_scope=''):
	"""
	@param tx {pointer} neo4j transaction pointer
	@param varname {string} variable whose value is to be resolved
	@rootContextNode {node object} context of the given variable to resolve
	@return {list} an array of 3D elements containing information regarding the inferred variable values, their literals and identifiers
	"""

	# list of values (return a list due to potential assigments of different values in conditional branches)
	out_values = [] 

	# stores a map: funcDef id -->> getFunctionCallValuesOfFunctionDefinitions(funcDef)
	knowledge_database = {} 

	# context node identifer
	nodeId = rootContextNode['Id']

	def _get_non_anonymous_call_expr_top_node(call_expr):
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

	def _get_function_def_of_block_stmt(block_stmt_node):
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

	def _get_all_call_values_of(varname, func_def_node):
		
		key = func_def_node['Id']
		if key in knowledge_database:
			knowledge = knowledge_database[key]
		else:
			knowledge = getFunctionCallValuesOfFunctionDefinitions(tx, func_def_node)	
			knowledge_database[key] = knowledge

		ret = {}
		for nid, values in knowledge.items():
			if varname in values:
				ret[nid] = values[varname]

		return ret

	def _check_if_function_has_param(varname, func_def_node):

		query="""
		MATCH (n { Id: '%s'})-[:AST_parentOf {RelationType: 'params'}]-(arg) RETURN collect(distinct arg) as args
		"""%(func_def_node['Id'])
		results = tx.run(query)
		for item in results:
			args = item['args']
			arg_values = [_get_value_of_identifer_or_literal(node)[0] for node in args]
			if varname in arg_values:
				return True
			else:
				return False

		return False


	if PDG_on_variable_declarations_only:
		# for VariableDeclaration PDG relations
		query = """
		MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t {Type: 'VariableDeclaration'}) RETURN collect(distinct n_t) AS resultset
		"""%(nodeId, varname)
	else:
		# for all PDG relations
		query = """
		MATCH (n_s { Id: '%s' })<-[:PDG_parentOf { Arguments: '%s' }]-(n_t) RETURN collect(distinct n_t) AS resultset
		"""%(nodeId, varname)

	results = tx.run(query)
	for item in results: 
		currentNodes = item['resultset'] 
		for iteratorNode in currentNodes:
			if iteratorNode['Type'] == 'BlockStatement': 
				# the parameter 'varname' is a function argument

				func_def_node = _get_function_def_of_block_stmt(iteratorNode) # check if func def has a varname parameter 
				if func_def_node['Type'] == 'FunctionExpression' or func_def_node['Type'] == 'FunctionDeclaration':

					match_signature = _check_if_function_has_param(varname, func_def_node)
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

								
								top_level_of_call_expr = _get_non_anonymous_call_expr_top_node({'Id': call_expr_id})
								recurse= getValueOfWithLocationChain(tx, each_argument['Value'], top_level_of_call_expr, context_scope=context_id_of_call_scope)
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
								top_level_of_call_expr = _get_non_anonymous_call_expr_top_node({'Id': call_expr_id})
								recurse= getValueOfWithLocationChain(tx, top_most, top_level_of_call_expr, context_scope=context_id_of_call_scope)
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
										
										top_level_of_call_expr = _get_non_anonymous_call_expr_top_node({'Id': call_expr_id})
										recurse= getValueOfWithLocationChain(tx, each_additional_identifier, top_level_of_call_expr, context_scope=context_id_of_call_scope)
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


								## check if further PDG analysis is required for these identifiers (e.g., arguments of call expressions)
								# call_expr_id = _get_node_id_part(nid)
								# context_id_of_call_scope = '[scope-id=%s]'%call_expr_id  
								# additional_identifiers = each_argument['ResolveIdentifiers']
								# for each_additional_identifier in additional_identifiers:
								# 	top_level_of_call_expr = _get_non_anonymous_call_expr_top_node({'Id': call_expr_id})
								# 	recurse= getValueOfWithLocationChain(tx, each_additional_identifier, top_level_of_call_expr, context_scope=context_id_of_call_scope)
								# 	out_values.extend(recurse)	


							# ThisExpression Pointer Analysis
							# NOTE: this code block must be executed for ALL branches, so we have to place it outside of all conditional branches
							additional_identifiers = each_argument['ResolveIdentifiers']
							if additional_identifiers is not None:
								if 'ThisExpression' in additional_identifiers:
									this_expression_node_id = additional_identifiers['ThisExpression']
									pointer_resolutions = getThisPointerResolution(tx, {'Id': this_expression_node_id })
									for item in pointer_resolutions['methods']:
										owner_item = item['owner']
										owner_top = item['top']
										tree_owner = getChildsOf(tx, owner_item)
										tree_owner_exp = getAdvancedCodeExpression(tree_owner)[0]
										location_line = owner_item['Location']
										out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope,tree_owner_exp, this_expression_node_id)
										out = [out_line.lstrip(),
											  [],
											  [tree_owner_exp[0]],
											  location_line]
										out_values.append(out)

										# def-use analysis over resolved `this` pointer
										if owner_item != '' and owner_item is not None and owner_item!= constantsModule.WINDOW_GLOBAL_OBJECT and owner_item['Type'] == 'Identifier':
											recurse_values = getValueOfWithLocationChain(tx, tree_owner_exp, owner_top, PDG_on_variable_declarations_only=True)
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
												tree_owner = getChildsOf({'Id': target_node_id})
												tree_owner_exp = getAdvancedCodeExpression(tree_owner)
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
											tree_owner = getChildsOf({'Id': target_node_id})
											tree_owner_exp = getAdvancedCodeExpression(tree_owner)
											location_line = tree_owner['Location']
											out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
											out = [out_line.lstrip(),
												  [],
												  [tree_owner_exp],
												  location_line]
											out_values.append(out) 				


				continue


			tree = getChildsOf(tx, iteratorNode)
			contextNode = tree['node']
			if contextNode['Id'] == constantsModule.PROGRAM_NODE_INDEX: 
				continue
			ex = getAdvancedCodeExpression(tree)
			loc = iteratorNode['Location']
			[code_expr, literals, idents] = ex
			if context_scope != '':
				code_expr = context_scope + '  ' + code_expr 
			out_values.append([code_expr, literals, idents, loc])
			new_varnames = _get_unique_list(list(idents))

			# handle `this` expressions
			if 'ThisExpression' in new_varnames:
				this_expression_node_id = idents['ThisExpression']
				pointer_resolutions = getThisPointerResolution(tx, {'Id': this_expression_node_id })
				for item in pointer_resolutions['methods']:
					owner_item = item['owner']
					owner_top = item['top']
					tree_owner = getChildsOf(tx, owner_item)
					tree_owner_exp = getAdvancedCodeExpression(tree_owner)[0]
					location_line = owner_item['Location']
					out_line = '%s this --(points-to)--> %s [this-nid: %s]'%(context_scope, tree_owner_exp, this_expression_node_id)
					out = [out_line.lstrip(),
						  [],
						  [tree_owner_exp[0]],
						  location_line]
					out_values.append(out)

					# def-use analysis over resolved `this` pointer
					if owner_item != '' and owner_item is not None and owner_item!= constantsModule.WINDOW_GLOBAL_OBJECT and owner_item['Type'] == 'Identifier':
						recurse_values = getValueOfWithLocationChain(tx, tree_owner_exp, owner_top, PDG_on_variable_declarations_only=True)
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
							tree_owner = getChildsOf({'Id': target_node_id})
							tree_owner_exp = getAdvancedCodeExpression(tree_owner)
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
						tree_owner = getChildsOf({'Id': target_node_id})
						tree_owner_exp = getAdvancedCodeExpression(tree_owner)
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
						wrapper_node_function_definition = getChildsOf(tx, item)
						ce_function_definition = getAdvancedCodeExpression(wrapper_node_function_definition)
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
				v = getValueOfWithLocationChain(tx, new_varname, contextNode, context_scope = context_scope)
				out_values.extend(v)	



	return out_values



# ----------------------------------------------------------------------- #
#			Reachability Analysis
# ----------------------------------------------------------------------- #


# Algorithm
# 1. given a node id, retrieve its parent function/scope.
# 2. if no such function, assume it is triggered upon page `onload` 
# 3. Search where this parent function is called 
# 4. If nothing has been found, return `unreachable`
# 5. If it is called inside an event listener, return `event-name` on `event-selector`
# 6. goto 1

def do_reachability_analysis(tx, node, input_is_top=False):

	# return values
	NORMAL_PAGE_LOAD = 'onPageLoad'
	UNREACHABLE = 'unreachable'

	if input_is_top:
		top_expression = node
	else:
		top_expression = neo4jQueryUtilityModule.get_ast_topmost(tx, {'Id': node_id})
	
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
					top_expr = neo4jQueryUtilityModule.get_ast_topmost(tx, call_expr)
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
					top_expr = neo4jQueryUtilityModule.get_ast_topmost(tx, call_expr)
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


# ----------------------------------------------------------------------- #
#			Main: Detection
# ----------------------------------------------------------------------- #

def run_traversals(tx, navigation_url, webpage_directory, folder_name_of_url='xxx', document_vars=[]):
	"""
	@param {string} navigation_url: base url to test 
	@param {string} webpage_directory: path to save analyzer template
	@param {list} document_vars: fields in HTML forms accessbile by the 'document' DOM API
	@description query the graph database and finds the potential forgeable client-side requests
	@return {array} a list of candidate forgeable HTTP requests
	"""

	document_props = document_vars

	out = []
	hash_or_amp_params = []
	
	# -------------------------------------------------------------------------- #
	#		Syntactic Queries 
	# -------------------------------------------------------------------------- #
	## @Deprecteed: these will not run by default. 
	## remains here for ideas for lator.
	if SYNTACTIC_QUERIES_ACTIVE:
		query="""
		MATCH (n {Type: 'Literal'})
		WHERE (n.Value =~ '(?i).*ajax.*loc.*' OR n.Value =~ '(?i).*loc.*ajax.*')
		RETURN n
		"""
		results = tx.run(query)
		for record in results: 
			string_param = record['n']['Value']
			if "line" in string_param and "column" in string_param and "type" in string_param and "}" in string_param and "{" in string_param:
				continue
			if string_param not in hash_or_amp_params:
					hash_or_amp_params.append(string_param)

		query = """
		MATCH (n)
		WHERE n.Code='window' OR n.Code='location' OR n.Code='hash'
		WITH collect(DISTINCT n) AS networkNodes
		UNWIND networkNodes AS x
		UNWIND networkNodes AS y
		MATCH p=(x)-[*3]-(y)
		WHERE x <> y
		WITH collect(DISTINCT x) AS pNodes
		UNWIND pNodes AS n2
		MATCH (n1 {Type: 'Literal'})-[*1]-(n2)
		WHERE n1.Value=~'.*#.*'
		RETURN n1
		"""
		results = tx.run(query)
		for record in results: 
			string_param = record['n1']['Value']
			if string_param not in hash_or_amp_params:
				hash_or_amp_params.append(string_param)

		query = """
		MATCH p=(n1)-[*5]-(n2) 
		WHERE n1.Type='Literal'
		AND n1.Value=~'.*#.*' 
		AND (n2.Code='window' OR n2.Code='location')
		RETURN n1
		"""
		results = tx.run(query)
		for record in results: 
			string_param = record['n1']['Value']
			if string_param not in hash_or_amp_params:
				hash_or_amp_params.append(string_param)



		query = """
		MATCH p=(n1)-[*5]-(n2)
		WHERE n1.Type='Literal'
		AND n1.Value=~'.*#.*'
		AND n2.Value=~'.*(asyncRequest|ajax|xhr|request|open|conn|fetch|XMLHttpRequest|send).*'
		RETURN n1
		"""
		results = tx.run(query)
		for record in results: 
			string_param = record['n1']['Value']
			if string_param not in hash_or_amp_params:
				hash_or_amp_params.append(string_param)

		# PDG_parentOf Relations: check IfStatements that depend on a variable whose value is like .*#.*
		query = """
		MATCH p=(n1 {Type: 'Literal'} )-[*3]-(n2 {Type: 'IfStatement'}) 
		WHERE n1.Value=~'.*#.*' 
		AND any(r in relationships(p) WHERE n2.Code CONTAINS r.Arguments)
		Return n1
		"""
		results = tx.run(query)
		for record in results: 
			string_param = record['n1']['Value']
			if string_param not in hash_or_amp_params:
				hash_or_amp_params.append(string_param)

	# -------------------------------------------------------------------------- #
	#		End Syntactic Queries
	# -------------------------------------------------------------------------- #



	# @ID: Query Nr. 1
	# @Description: Finds all the relationship between sink and source where:
	#		*sink* = AssignmentExpression with left handside operand of window.location.hash, 
	#				   and right handside operand of identifier or literal (in case of identifier, the value is derived by PDG analysis up to 1 Level)
	#		*source* = ExpressionStatement or Variable Declaration that contains ajax-request sending keywords
	if AD_HOC_QUERY_1_ACTIVE:
		query="""
		MATCH (w {Code: 'window'})<-[:AST_parentOf{RelationType: 'object'}]-(p {Type: 'MemberExpression'})-[:AST_parentOf{RelationType: 'property'}]->(l {Code: 'location'}), 
		(p)<-[:AST_parentOf{RelationType: 'object'}]-(gp {Type: 'MemberExpression'})-[:AST_parentOf{RelationType: 'property'}]->(h {Code: 'hash'}), 
		(gp)<-[:AST_parentOf {RelationType: 'left'}]-(t {Type: 'AssignmentExpression'})-[:AST_parentOf{RelationType: 'right'}]->(v),
		(t)<-[:AST_parentOf {RelationType: 'expression'}]-(topsource {Type: 'ExpressionStatement'}),
		(n {Type: 'Identifier'})<-[:AST_parentOf  {RelationType: 'property'}]-(parent)<-[:AST_parentOf*1..3]-(topsink)
		WHERE v.Type = 'Identifier' OR v.Type = 'Literal'	 
		AND n.Code =~ '.*(ajax|open|fetch|XMLHttpRequest|send).*' AND (topsink.Type = 'ExpressionStatement' OR topsink.Type = 'VariableDeclaration')
		WITH  v AS val, topsink AS si, topsource AS sc 
		MATCH (topsource)<-[:PDG_parentOf*1..100 {Arguments: val.Code}]-(vv {Type: 'VariableDeclaration'})-[:AST_parentOf]->(decl {Type: 'VariableDeclarator'})-[:AST_parentOf {RelationType: 'init'}]->(lit {Type: 'Literal'}) 
		WHERE val.Type = 'Identifier'
		RETURN
		CASE EXISTS( (sc)-[:CFG_parentOf|:PDG_parentOf*1..100]->(si) )
		WHEN True Then
			 CASE val.Type
			 WHEN 'Identifier' Then collect (distinct lit)
			 ELSE collect (distinct val)
			 END
		WHEN False Then null
		END AS res
		"""
		results = tx.run(query)
		for record in results: 
			nodes = record['res']
			if nodes is None: continue
			for node in nodes:
				value = node['Value']
				hash_or_amp_params.append(value)



	# @ID: Query Nr. 2
	# @Description: Finds all the relationship between sink and source where:
	#		*sink* = AssignmentExpression with left handside operand of window.location.hash, 
	#				   and right handside operand of identifier or literal (in case of identifier, the value is derived by PDG analysis up to N levels)
	#		*source* = ExpressionStatement or Variable Declaration that contains ajax-request sending keywords
	if AD_HOC_QUERY_2_ACTIVE:
		query="""
		MATCH (w {Code: 'window'})<-[:AST_parentOf{RelationType: 'object'}]-(p {Type: 'MemberExpression'})-[:AST_parentOf{RelationType: 'property'}]->(l {Code: 'location'}), 
		(p)<-[:AST_parentOf{RelationType: 'object'}]-(gp {Type: 'MemberExpression'})-[:AST_parentOf{RelationType: 'property'}]->(h {Code: 'hash'}), 
		(gp)<-[:AST_parentOf {RelationType: 'left'}]-(t {Type: 'AssignmentExpression'})-[:AST_parentOf{RelationType: 'right'}]->(v),
		(t)<-[:AST_parentOf {RelationType: 'expression'}]-(topsource {Type: 'ExpressionStatement'}),
		(n {Type: 'Identifier'})<-[:AST_parentOf  {RelationType: 'property'}]-(parent)<-[:AST_parentOf*1..3]-(topsink)
		WHERE v.Type = 'Identifier' OR v.Type = 'Literal' OR v.Type = 'CallExpression'
		AND n.Code =~ '.*(ajax|open|fetch|XMLHttpRequest|send).*' AND (topsink.Type = 'ExpressionStatement' OR topsink.Type = 'VariableDeclaration')
		WITH  v AS val, topsink AS si, topsource AS sc 
		RETURN
		CASE EXISTS( (sc)-[:CFG_parentOf|:PDG_parentOf|:ERDG|:EDG_parentOf*1..100]->(si) )
		WHEN True Then [val, sc]
		WHEN False Then null
		END AS res
		"""
		results = tx.run(query)
		visited = []
		for record in results: 
			item = record['res']
			if item is None: continue
			else:
				node = item[0]
				topElement = item[1]
				if node['Id'] not in visited:
					visited.append(node['Id'])
					if node['Type'] == 'Literal':
						resolved = node['Value']
						hash_or_amp_params.append(resolved)
					elif node['Type'] == 'Identifier':
						# Identifier to be resolved from top node context
						context = topElement
						values = resolveValueOf(tx, node['Code'], context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)
					elif node['Type'] == 'CallExpression':
						context = topElement
						callExpressionWrapperNode = getChildsOf(tx, node)
						codeExpr = getCodeExpression(callExpressionWrapperNode)
						varname = codeExpr[0]
						values = resolveValueOf(tx, varname, context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)


	# @ID: Query Nr. 3
	# @Description: pointToAnalysis for window.location.hash
	#		There are 2 different cases:
	# 			CASE 1 Example: wlh = wl.hash ; wlh = '#value'; -> Our query: (find target identifier=wlh and look for its value v in an AssignmentExpression)
	# 			CASE 2 Example: wl.hash = '#value'
	#		** This query only addresses CASE 1 ** 
	##@Note obj {Type: 'Identifier'} - here the value Type is not specified to both capture any number of member expressions: e.g.,
	# window.location.hash (2 member expression) and wl.hash (1 member expression)
	if AD_HOC_QUERY_3_ACTIVE:
		query="""
		MATCH (obj)<-[:AST_parentOf {RelationType: 'object'}]-(wl {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(wlh {Type: 'Identifier', Code: 'hash'}), 
		(wl)<-[r1:AST_parentOf]-(p)-[r2:AST_parentOf]->(tIdent {Type: 'Identifier'}),
		(targetIdent {Type: 'Identifier'})<-[:AST_parentOf {RelationType: 'left'}]-(t {Type: 'AssignmentExpression'})-[:AST_parentOf{RelationType: 'right'}]->(v),
		(t)<-[:AST_parentOf {RelationType: 'expression'}]-(topsource {Type: 'ExpressionStatement'}),
		(n {Type: 'Identifier'})<-[:AST_parentOf  {RelationType: 'property'}]-(parent)<-[:AST_parentOf*1..3]-(topsink)
		WHERE (p.Type = 'AssignmentExpression' OR p.Type = 'VariableDeclarator') AND 
			  (r1.RelationType = 'init' or r1.RelationType = 'right') AND
			  (r2.RelationType = 'left' OR r2.RelationType = 'id') AND
			  (targetIdent.Code = tIdent.Code) AND
			  (v.Type = 'Identifier' OR v.Type = 'Literal' OR v.Type = 'CallExpression') AND
			  (n.Code =~ '.*(ajax|open|fetch|XMLHttpRequest|send).*') AND
			  (topsink.Type = 'ExpressionStatement' OR topsink.Type = 'VariableDeclaration')
		WITH  v AS val, topsink AS si, topsource AS sc 
		RETURN
		CASE EXISTS( (sc)-[:CFG_parentOf|:PDG_parentOf|:ERDG|:EDG_parentOf*1..100]->(si) )
		WHEN True Then [val, sc]
		WHEN False Then null
		END AS res
		"""
		results = tx.run(query)
		visited = []
		for record in results: 
			item = record['res']
			if item is None: continue
			else:
				node = item[0]
				topElement = item[1]
				if node['Id'] not in visited:
					visited.append(node['Id'])
					if node['Type'] == 'Literal':
						resolved = node['Value']
						hash_or_amp_params.append(resolved)
					elif node['Type'] == 'Identifier':
						# Identifier to be resolved from top node context
						context = topElement
						values = resolveValueOf(tx, node['Code'], context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)
					elif node['Type'] == 'CallExpression':
						context = topElement
						callExpressionWrapperNode = getChildsOf(tx, node)
						codeExpr = getCodeExpression(callExpressionWrapperNode)
						varname = codeExpr[0]
						values = resolveValueOf(tx, varname, context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)

	# @ID: Query Nr. 4
	# @Description: pointToAnalysis for window.location.hash
	#		There are 2 different cases:
	# 			CASE 1 Example: wlh = wl.hash ; wlh = '#value';
	# 			CASE 2 Example: wl.hash = '#value'
	#		** This query only addresses CASE 2 ** 
	if AD_HOC_QUERY_4_ACTIVE:
		query="""
		MATCH (obj)<-[:AST_parentOf {RelationType: 'object'}]-(wl {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(wlh {Type: 'Identifier', Code: 'hash'}), 
		(wl)<-[:AST_parentOf {RelationType: 'left'}]-(p {Type: 'AssignmentExpression'})-[:AST_parentOf {RelationType: 'right'}]->(v),
		(p)<-[:AST_parentOf {RelationType: 'expression'}]-(topsource {Type: 'ExpressionStatement'}),
		(n {Type: 'Identifier'})<-[:AST_parentOf  {RelationType: 'property'}]-(parent)<-[:AST_parentOf*1..3]-(topsink)
		WHERE
			(v.Type = 'Literal' or v.Type = 'Identifier' or v.Type = 'CallExpression') AND
			(n.Code =~ '.*(ajax|open|fetch|XMLHttpRequest|send).*') AND
			(topsink.Type = 'ExpressionStatement' OR topsink.Type = 'VariableDeclaration')
		WITH  v AS val, topsink AS si, topsource AS sc 
		RETURN
		CASE EXISTS( (sc)-[:CFG_parentOf|:PDG_parentOf|:ERDG|:EDG_parentOf*1..100]->(si) )
		WHEN True Then [val, sc]
		WHEN False Then null
		END AS res
		"""
		results = tx.run(query)
		visited = []
		for record in results: 
			item = record['res']
			if item is None: continue
			else:
				node = item[0]
				topElement = item[1]
				if node['Id'] not in visited:
					visited.append(node['Id'])
					if node['Type'] == 'Literal':
						resolved = node['Value']
						hash_or_amp_params.append(resolved)
					elif node['Type'] == 'Identifier':
						# Identifier to be resolved from top node context
						context = topElement
						values = resolveValueOf(tx, node['Code'], context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)
					elif node['Type'] == 'CallExpression':
						context = topElement
						callExpressionWrapperNode = getChildsOf(tx, node)
						codeExpr = getCodeExpression(callExpressionWrapperNode)
						varname = codeExpr[0]
						values = resolveValueOf(tx, varname, context)
						for o in values:
							if o not in hash_or_amp_params:
								hash_or_amp_params.append(o)

	# @ID: Query Nr. 5
	# @Description: 
	#	Finds asynchronous HTTP requests (sinks) and associates a semantic type to them
	#	i.e., is any sink value traces back to the defined semantic types
	if MAIN_QUERY_ACTIVE:
		r1 = getXhrOpenCallExpressions(tx)
		r2 = getFetchCallExpressions(tx)
		r3 = getAjaxCallExpressions(tx)
		r4 = getAsyncRequestCallExpressions(tx)
		r5 = getSetFormCallExpressions(tx)
		r6 = getPageSpeedExpressions(tx)
		r7 = getWindowOpenCallExpressions(tx)
		r8 = xhrPostCallExpressions(tx)
		r9 = getAjaxSettingObjectExpressions(tx)


		request_storage = {}   # key: call_expression_id, value: structure of request url for that call expression

		for call_expr in r1:
			n = call_expr['n'] # call expression
			a = call_expr['a'] # argument: Literal, Identifier, BinaryExpression, etc
			t = call_expr['t'] # top level expression statement
			request_fn = 'XMLHttpRequest.open'

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]

			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals


		for call_expr in r2:
			n = call_expr['n']
			a = call_expr['a'] 
			t = call_expr['t'] 
			request_fn = 'Fetch'

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals

		for call_expr in r3:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			aa = call_expr['aa']
			request_fn = 'ajax'

			# override arg a if aa is object expression to take the ajax url properly
			if aa is not None and a is not None:
				if a["Type"] == "ObjectExpression":
					a = aa

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]


			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals


		for call_expr in r4:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			tt = call_expr['tt']
			request_fn = 'Connect.asyncRequest'
			if tt is not None:
				t = tt # fix the actual top level from VariableDeclarator to VariableDeclaration

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]

			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid =  request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[] ,'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():

				vals = getValueOfWithLocationChain(tx, ident, t)
				request_storage[nid]['expected_values'][ident] = vals



		for call_expr in r5:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			tt = call_expr['tt']
			request_fn = 'Connect.setForm'

			if tt is not None:
				t = tt # fix the actual top level

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid =  request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}

			for ident, ident_id in ce[2].items():
				vals = getValueOfWithLocationChain(tx, ident, t)
				request_storage[nid]['expected_values'][ident] = vals

		for call_expr in r6:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			request_fn = 'pagespeed.CriticalImages.Run'


			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid =  request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}

			for ident, ident_id in ce[2].items():
				vals = getValueOfWithLocationChain(tx, ident, t)
				request_storage[nid]['expected_values'][ident] = vals


		for call_expr in r7:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			request_fn = 'window.open'

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]

			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals


		for call_expr in r8:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			request_fn = 'xhrPost'

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals


		for call_expr in r9:
			n = call_expr['n'] 
			a = call_expr['a'] 
			t = call_expr['t'] 
			request_fn = 'Ajax'

			wrapper_node_top_expression = getChildsOf(tx, t)
			top_expression_code = getAdvancedCodeExpression(wrapper_node_top_expression)[0]
			if 'function(' in top_expression_code:
				top_expression_code = jsbeautifier.beautify(top_expression_code)

			wrapper_node= getChildsOf(tx, a)
			ce = getAdvancedCodeExpression(wrapper_node)
			nid = request_fn + '__nid=' + n['Id'] + '__Loc=' + str(n['Location'])
			request_storage[nid] = {'reachability':[], 'endpoint_code': ce[0], 'expected_values': {}, 'top_expression': top_expression_code, 'id_set': {'TopExpression': t['Id'], 'CallExpression': n['Id'], 'Argument': a['Id']}}
			for ident, ident_id in ce[2].items():
				if ident in ce[0]:
					vals = getValueOfWithLocationChain(tx, ident, t)
					request_storage[nid]['expected_values'][ident] = vals


		# path to store the general template file for WIN.LOC dependencies of all URLs			
		general_template_output_path = utilityModule.get_directory_without_last_part(webpage_directory.rstrip('/'))
		general_template_output_pathname = os.path.join(general_template_output_path, "sinks.flows.out")

		# path to store all templates of the current URL
		template_output_pathname = os.path.join(webpage_directory, "sink.flows.out")
		with open(general_template_output_pathname, 'a+') as gt_fd:
			with open(template_output_pathname, "w+") as fd:
				timestamp = _get_current_timestamp()
				sep = utilityModule.get_output_header_sep()
				sep_templates = utilityModule.get_output_subheader_sep()
				fd.write(sep)
				fd.write('[timestamp] generated on %s\n'%timestamp)
				fd.write(sep+'\n')
				fd.write('[*] NavigationURL: %s\n\n'%navigation_url)

				for each_request_key in request_storage:
					node_id = _get_node_id_part(each_request_key) # node id of 'CallExpression' node
					location = _get_location_part(each_request_key)
					location = _get_line_of_location(location)
					request_fn = _get_function_name_part(each_request_key)

					program = request_storage[each_request_key]
					request_variable = program['endpoint_code']
					program_slices_keypair = program['expected_values']
					request_top_expression_code = program['top_expression']
					id_set = program['id_set']
					reachability_results = program['reachability']
					request_tags = []
					print_buffer = []

					endpoint_tags = _get_semantic_type(request_variable, 0, document_props, find_endpoint_tags=True)
					request_tags.extend(endpoint_tags)

					counter = 1
					for each_identifier in program_slices_keypair.keys():
						program_slices = program_slices_keypair[each_identifier]
						num_slices = len(program_slices)
						
						if num_slices == 0: # if each_identifier can not be resolved locally, apply heuristics ##@TODO: check this throughly to eliminate non-relevant stuff!
							do_heuristic_search = True  # changed to false for typo3 crm
							if do_heuristic_search:
								identifier_heurisitc_values = getIdentifierLocalAndGlobalValues(tx, each_identifier)
								program_slices = getProgramSliceFormat(identifier_heurisitc_values)
								num_slices = len(program_slices)

						tags = _get_semantic_type(program_slices, num_slices, document_props)
						tags = _get_unique_list(tags)
						request_tags.extend(tags)

						for i in range(num_slices):
							program_slice = program_slices[i]
							loc = _get_line_of_location(program_slice[3])
							code = program_slice[0]

							if 'function(' in code:
								code = jsbeautifier.beautify(code) # pretty print function calls

							c = None
							if i == 0 and each_identifier in code:

								a = '\n%s:%s variable=%s\n'%(counter, str(tags), each_identifier)
								counter = counter + 1
								b = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, b, c]
								else:
									print_buffer+= [a, b]

							else:
								a = """(loc:%s)- %s\n"""%(loc,code)
								if c is not None:
									print_buffer += [a, c]
								else:
									print_buffer += [a]

					print_buffer = _get_orderd_unique_list(print_buffer) # remove duplicates, if any
					tag_set = _get_semantic_type_set(request_tags)
					if not ( len(tag_set) == 1 and CSRFSemanticTypes.SEM_TYPE_NON_REACHABLE in tag_set ):
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))


						gt_fd.write(sep_templates)
						gt_fd.write('[*] NavigationURL: %s\n'%navigation_url)
						gt_fd.write('[*] Hash: %s\n'%folder_name_of_url)
						gt_fd.write('[*] Tags: %s\n'%(str(tag_set)))
						gt_fd.write('[*] NodeId: %s\n'%str(id_set))
						gt_fd.write('[*] Location: %s\n'%location)
						gt_fd.write('[*] Function: %s\n'%request_fn)
						gt_fd.write('[*] Template: %s\n'%(request_variable))
						gt_fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))
						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
							gt_fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines
						gt_fd.write(sep_templates)
					else:
						fd.write(sep_templates)
						fd.write('[*] Tags: %s\n'%(str(tag_set)))
						fd.write('[*] NodeId: %s\n'%str(id_set))
						fd.write('[*] Location: %s\n'%location)
						fd.write('[*] Function: %s\n'%request_fn)
						fd.write('[*] Template: %s\n'%(request_variable))
						fd.write('[*] Top Expression: %s\n'%(request_top_expression_code))

						i = 0
						for item in print_buffer:
							if item.startswith('(loc:'):
								item = '\t%s '%(i) + item
								i = i + 1
							else:
								i = 0
							fd.write(item)
						fd.write(sep_templates+'\n') # add two newlines

	
	hashSymbol = "#"
	if not navigation_url.endswith(hashSymbol):
		navigation_url = navigation_url+ hashSymbol
	for each_candidate_param in hash_or_amp_params:
		each_candidate_param = each_candidate_param.lstrip(hashSymbol)
		out.append(navigation_url+each_candidate_param)

	return out





	