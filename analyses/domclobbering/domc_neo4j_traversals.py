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
	------------
	> import analyses.domclobbering.domc_neo4j_traversals as DOMCTraversalsModule


"""


import os
import sys
import time
import constants as constantsModule
import utils.io as IOModule
from utils.logging import logger

import analyses.domclobbering.domc_cypher_queries as DOMCTraversalsModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
import docker.neo4j.manage_container as dockerModule

 

def get_name_from_url(url):

	"""
	 @param url: eTLD+1 domain name
	 @return converts the url to a string name suitable for a directory by removing the colon and slash symbols

	"""
	return url.replace(':', '-').replace('/', '')



def run_traversals(tx):

	query="""
	MATCH (n {Type: 'Program'}) 
	RETURN n
	"""
	records = tx.run(query)
	for item in records:
		print(item['n'])


def build_and_analyze_hpg(seed_url):

	"""	
	@param {string} seed_url
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.
	
	"""
	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		logger.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))

	webapp_pages = os.listdir(webapp_data_directory)
	# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
	webapp_pages = [item for item in webapp_pages if len(item) == 64]


	# neo4j config
	build = True
	build_container = True
	query = True
	stop_container = True

	# must use the default docker container db name which is the only active db in docker
	database_name = 'neo4j'  
	container_name = 'neo4j_container_'

	# de-compress the hpg 
	IOModule.decompress_graph(webpage)

	for each_webpage in webapp_pages:

		relative_import_path = os.path.join(webapp_folder_name, each_webpage)
		container_name = container_name + each_webpage
		webpage = os.path.join(webapp_data_directory, each_webpage)
		logger.warning('HPG for: %s'%(webpage))
		

		# import the CSV files into an active neo4j database inside a docker container
		if build:
			nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
			rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
			if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
				logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
				continue
			
			# must build a container only once
			if build_container: 

				# remove the old container & database if it exists 
				dockerModule.stop_neo4j_container(container_name)
				dockerModule.remove_neo4j_container(container_name)
				dockerModule.remove_neo4j_database(database_name, container_name)
				time.sleep(5)

				dockerModule.create_neo4j_container(container_name)
				logger.info('waiting 5 seconds for the neo4j container to be ready.')
				time.sleep(5)

			logger.info('importing data inside container.')
			dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
			logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
			connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
			if not connection_success:
				sys.exit(1)
		else:
			dockerModule.start_neo4j_container(container_name)
			logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
			connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
			if not connection_success:
				sys.exit(1)


		# compress the hpg after the model import
		IOModule.compress_graph(webpage)


		# step3: run the vulnerability detection queries
		if query:
			neo4jDatabaseUtilityModule.exec_fn_within_transaction(DOMCTraversalsModule.run_traversals, webpage)


		# stop the neo4j docker container
		if stop_container:
			dockerModule.stop_neo4j_container(container_name)

























