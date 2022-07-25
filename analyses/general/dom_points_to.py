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
	Finds the reference of a DOM query using a DOM snapshot


	Usage:
	------------
	example:
		> from hpg_analysis.general.dom_points_to import DOMUtils
		> element = DOMUtils.resolve_dom_query("document.getElementsByTagName('div')[0]")



"""
import subprocess
import time
import os
import constants as constantsModule
import hpg_neo4j.orm as ORMModule
from bs4 import BeautifulSoup

class DOMUtils:

	@classmethod
	def resolve_dom_query_with_snapshot(cls, query, snapshot_node_id):
		"""
		@param {string} query: a DOM query
		@param {string} snapshot_node_id: the node id of the HTML DOM snapshot
		@return {string}: the target DOM element the query references
		"""	
		snapshot = ORMModule.DOMSnapshot.nodes.get_or_none(Id=snapshot_node_id)
		if snapshot is None:
			return None
		return cls.resolve_dom_query_with_snapshot_obj(query, snapshot)


	@classmethod
	def resolve_dom_query(cls, query):
		"""
		@param {string} query: a DOM query
		@description: uses the first HTML tree found in the property graph as input. Suitable when the graph contains only one DOM snapshot
		@return {string}: the target DOM element the query references using the first DOM snapshot found in the graph
		"""

		dom_tree_nodes = ORMModule.DOMSnapshot.nodes.all()
		if len(dom_tree_nodes) > 0:
			first_dom_snapshot = dom_tree_nodes[0]
			return cls.resolve_dom_query_with_snapshot_obj(query, first_dom_snapshot)
		return None


	@staticmethod
	def resolve_dom_query_with_snapshot_obj(query, snapshot, bs4=False):
		"""
		@param {string} query: a DOM query
		@param {DOMSnapshot} snapshot: the HTML DOM snapshot object output by the neomodel ORM wrapper
		@param {bool} bs4: whether to return the output DOM element in BeautifulSoup format
		@return {string}: the target DOM element the query references
		"""	
		
		html = snapshot.Code


		template_file = os.path.join(constantsModule.BASE_DIR, 'hpg_construction/lib/jaw/dom-points-to/template.example.js')
		fd = open(template_file, 'r')
		content = fd.read()
		fd.close()
		content = content.replace('<INPUT_DOM_QUERY>', query)
		content = content.replace('<INPUT_HTML>', html)

		# the node js program to run 
		output_program = os.path.join(constantsModule.BASE_DIR, 'hpg_construction/lib/jaw/dom-points-to/template.js')
		# the results will be stored here by the node js program
		results_program = os.path.join(constantsModule.BASE_DIR, 'hpg_construction/lib/jaw/dom-points-to/resolution.out')
		with open(output_program, 'w+') as fd:
			fd.write(content)
		content = '' # flush memory

		cmd = 'node %s'%output_program
		p = subprocess.Popen(cmd, shell=True, stdout = subprocess.PIPE)
		p.wait()

		fd = open(results_program, 'r')
		result = fd.read()
		fd.close()

		if bs4:
			return BeautifulSoup(result,'html.parser')
		else:
			return result










