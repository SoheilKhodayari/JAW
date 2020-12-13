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
	-------------
	A series of static methods to find various JavaScript sink expressions for HTTP requests
	
"""

class HttpRequestSinkExpressions:

	@staticmethod
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

	@staticmethod
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


	@staticmethod
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


	@staticmethod
	def getAjaxCallExpressions(tx):
		
		"""
		@param {pointer} tx
		@return bolt result (t, n, a): where t= top level exp statement, n = callExpression, a=URL argument of the $.ajax() function
		"""

		# query1="""
		# MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf {RelationType: 'expression'}]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'ajax'}),
		# (n1)-[:AST_parentOf {RelationType: 'object'}]->(n2 {Type: 'Identifier' }),
		# (n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(n3 {Type: 'ObjectExpression'})-[:AST_parentOf {RelationType: 'properties'}]->(n4 {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(n5 {Type: 'Identifier', Code: 'url'}),
		# (n4)-[:AST_parentOf {RelationType: 'value'}]->(a)
		# RETURN t, n, a
		# """
		# results1 = tx.run(query1)


		# argument a can be ObjectExpression, Identifier, or MemberExpression
		# variable relation length will capture function chains, e.g., $.ajax({}).done().success().failure() etc.
		query2="""
		MATCH (t {Type: 'ExpressionStatement'})-[:AST_parentOf*1..10]->(n {Type: 'CallExpression'})-[:AST_parentOf {RelationType: 'callee'}]-> (n1 {Type: 'MemberExpression'})-[:AST_parentOf {RelationType: 'property'}]->(req {Type: 'Identifier', Code: 'ajax'}),
		(n1)-[:AST_parentOf {RelationType: 'object'}]->(n2 {Type: 'Identifier' }),
		(n)-[:AST_parentOf {RelationType: 'arguments', Arguments: '{\"arg\":0}'}]->(a)
		OPTIONAL MATCH (a)-[:AST_parentOf {RelationType: 'properties'}]->(n4 {Type: 'Property'})-[:AST_parentOf {RelationType: 'key'}]->(n5 {Type: 'Identifier', Code: 'url'}),
		(n4)-[:AST_parentOf {RelationType: 'value'}]->(aa)
		RETURN t, n, a, aa
		"""
		results2 = tx.run(query2)

		return results2


	@staticmethod
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



	@staticmethod
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


	@staticmethod
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

	@staticmethod
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


	@staticmethod
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


	@staticmethod
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


