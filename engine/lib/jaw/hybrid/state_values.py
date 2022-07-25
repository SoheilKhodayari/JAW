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
	adds the state values collected by the crawler to the graph


	Usage:
	------------
	> from hpg_construction.lib.jaw.hybrid.state_values import StateValues

"""

import uuid 
import os, sys
import pandas as pd
import utils.utility as utilityModule
import constants as constantsModule


class StateValues:

	@staticmethod
	def add_requests_to_graph(base_path, requests_file_name, nodes_file='nodes.csv'):

		"""
		@param {string} base_path
		@param {string} requests_file_name
		@param {string} nodes_file
		@return {none}
		"""

		file_path = os.path.join(base_path, requests_file_name)
		fd = open(file_path, 'r')
		content = eval(fd.read())
		fd.close()
		requests = {}

		without_data_reqs = content['without_data']
		with_data_reqs = content['with_data']
		succ_reqs = content['succ']


		for req in without_data_reqs:
			ereq = eval(req)
			req_id = ereq['requestId']
			if req_id not in requests:
				requests[req_id] = {'url': ereq['url'], 'type': ereq['type'], 'method': ereq['method'], 'status': '', 'body': ''}


		for req in with_data_reqs:
			ereq = eval(req)
			req_id = ereq['requestId']
			if req_id not in requests:
				requests[req_id] = {'url': ereq['url'], 'type': ereq['type'], 'method': ereq['method'], 'body': ereq['requestBody'],  'status': ''}
			else:
				requests[req_id]['body'] = ereq['requestBody']

		for req in succ_reqs:
			ereq = eval(req)
			req_id = ereq['requestId']
			if req_id in requests:
				requests[req_id]['status'] = ereq['status']



		## Must use the same header as the AST Nodes to be able to bulk import into neo4j in one shot.
		## `Id:ID${d} Type${d} Kind${d} Code${d} Range${d} Location${d} Value${d} Raw${d} Async${d} Label:LABEL${d} SemanticType\n`
		## request method 					   --> Type field
		## request kind (e.g., xmlhttprequest) --> Kind field
		## request URL						   --> Value field
		## request body						   --> Raw field
		## request status code 				   --> Code field
		## label 							   --> RequestNode
		nodes_file_absolute = os.path.join(base_path, nodes_file)
		with open(nodes_file_absolute, 'a+') as fd:
			for request_id in requests:
				rr = requests[request_id]
				csv_line= '{0}{1}{4}{1}{3}{1}{6}{1}{1}{1}{2}{1}{5}{1}{1}RequestNode{1}\n'.format(uuid.uuid4(), constantsModule.outputCSVDelimiter, rr['url'], rr['type'], rr['method'], rr['body'], rr['status'])
				fd.write(csv_line)


	@staticmethod
	def add_events_to_graph(base_path, events_file_name, nodes_file='nodes.csv'):

		"""
		@param {string} base_path
		@param {string} events_file_name
		@param {string} nodes_file
		@return {none}
		"""

		file_path = os.path.join(base_path, events_file_name)
		fd = open(file_path, 'r')
		content = fd.readlines()
		fd.close()
		events = []
		for line in content:
			parts = []

			## what event did occur?
			event_name_start_index = utilityModule.find_nth(line, '\"', 1)
			event_name_end_index = utilityModule.find_nth(line, '\"', 2)
			event_name = line[event_name_start_index+1: event_name_end_index]
			event_name = event_name.strip()

			## what is the event target?
			event_target_start_index = utilityModule.find_nth(line, '\"', 3)
			event_target_end_index = utilityModule.find_nth(line, '\"', 5)
			event_target = line[event_target_start_index+1: event_target_end_index].replace('\"','')
			event_target = event_target.strip()

			# --------------- Unncessary Info Currently --------------------------------------------------- #
			##
			## what is the active element when the event occured?
			# event_active_start_index = utilityModule.find_nth(line, '\"', 5)
			# event_active_end_index = utilityModule.find_nth(line, '\"', 7)
			# event_active = line[event_active_start_index+1: event_active_end_index].replace('\"','')
			##
			## whether the target is the active element or not.
			# event_isactive_start_index = utilityModule.find_nth(line, '\"', 7)
			# event_isactive_end_index = -1
			# event_isactive = line[event_isactive_start_index+1: event_isactive_end_index].replace('\"','')
			# --------------------------------------------------------------------------------------------- #



			## Must use the same header as the AST Nodes to be able to bulk import into neo4j in one shot.
			## `Id:ID${d} Type${d} Kind${d} Code${d} Range${d} Location${d} Value${d} Raw${d} Async${d} Label:LABEL${d} SemanticType\n`
			## event name --> Type field
			## event target --> Value field
			## label --> EventNode (to be used for ORM)
			csv_line= '{0}{1}{2}{1}{1}{1}{1}{1}{3}{1}{1}{1}EventNode{1}\n'.format(uuid.uuid4(), constantsModule.outputCSVDelimiter, event_name, event_target)
			events.append(csv_line)


		nodes_file_absolute = os.path.join(base_path, nodes_file)
		with open(nodes_file_absolute, 'a+') as fd:
			for event_line in events:
				fd.write(event_line)


	@staticmethod
	def add_cookies_to_graph(base_path, cookies_file_name, nodes_file='nodes.csv'):

		"""
		@param {string} base_path
		@param {string} cookies_file_name
		@param {string} nodes_file
		@return {none}
		"""
		file_path = os.path.join(base_path, cookies_file_name)
		cookies = pd.read_pickle(file_path)


		nodes_file_absolute = os.path.join(base_path, nodes_file)
		with open(nodes_file_absolute, 'a+') as fd:
			for cookie_obj in cookies:
				## Must use the same header as the AST Nodes to be able to bulk import into neo4j in one shot.
				## `Id:ID${d} Type${d} Kind${d} Code${d} Range${d} Location${d} Value${d} Raw${d} Async${d} Label:LABEL${d} SemanticType\n`
				## cookie name 		--> Raw field
				## cookie value 	--> Value field
				## cookie httpOnly  --> Type field
				## label 			--> CookieNode
				csv_line = '{0}{1}{4}{1}{1}{1}{1}{1}{3}{1}{2}{1}{1}CookieNode{1}\n'.format(uuid.uuid4(), constantsModule.outputCSVDelimiter, cookie_obj['name'], cookie_obj['value'], cookie_obj['httpOnly'])
				fd.write(csv_line)

	@staticmethod
	def add_dom_tree_snapshot_to_graph(base_path, html_file_name, nodes_file='nodes.csv'):

		"""
		@param {string} base_path
		@param {string} html_file_name
		@param {string} nodes_file
		@return {none}

		Description:
		------------
		At this stage, this function only adds the path of the html file to a node in a graph
		later, when we import the csv to neo4j, we retrive this node, read its html path with the neomodel ORM
		and set the html code as another property of this node

		"""

		html_path = os.path.join(base_path, html_file_name)
		nodes_file_absolute = os.path.join(base_path, nodes_file)
		with open(nodes_file_absolute, 'a+') as fd:
			## Must use the same header as the AST Nodes to be able to bulk import into neo4j in one shot.
			## `Id:ID${d} Type${d} Kind${d} Code${d} Range${d} Location${d} Value${d} Raw${d} Async${d} Label:LABEL${d} SemanticType\n`
			## html path 		--> Location field
			## html code 		--> Code field
			## label 			--> DOMSnapshot
			csv_line = '{0}{1}{1}{1}{1}{1}{2}{1}{1}{1}{1}DOMSnapshot{1}\n'.format(uuid.uuid4(), constantsModule.outputCSVDelimiter, html_path)
			fd.write(csv_line)




