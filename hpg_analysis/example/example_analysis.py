# -*- coding: utf-8 -*-

"""
	Copyright (C) 2021  Soheil Khodayari, CISPA
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
	This script demonstrates how to use neo4j docker with JAW.
	In particular, the script:

		(i)   takes a JavaScript program as input
		(ii)  generates a property graph for it (nodes.csv, rels.csv)
		(iii) imports the property graph in a Neo4j database running inside a docker container  
		(iv)  runs an example query on the neo4j database (property graph). 

	Usage:
	-----------
	python3 -m hpg_analysis.example.example_analysis

"""

import os
import sys
import time
import constants as constantsModule
import utils.utility as utilityModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import hpg_neo4j.query_utility as neo4jQueryUtilityModule
from utils.logging import logger
import docker.neo4j.manage_container as dockerModule


def run_queries(tx):
	"""
	example function for running cypher queries over the property graph
	"""
	query = """
		MATCH (n {Type: 'Program'})
		RETURN n
	"""
	results= tx.run(query)
	for record in results:
		print(record['n'])


def main():

	# input: hpg_construction/unit_tests/example_analysis/test_1.js
	# input path is absolute
	input_file_name = 'test_1.js'
	absolute_input_program_folder_name = os.path.join(constantsModule.UNIT_TEST_BASE_PATH, "example_analysis")


	# output: hpg_construction/ouputs/unit_tests/example_analysis/test_1
	# output is relative to the hpg_construction/outputs folder
	relative_output_path = 'unit_tests/example_analysis/' + input_file_name.rstrip('.js')
	absolute_output_program_folder_name = os.path.join(constantsModule.OUTPUT_NODES_RELS_PATH, relative_output_path)


	logger.info('HPG for: %s'%(input_file_name))
	

	# must use the default docker container db name (i.e., `neo4j`) which is the only active db in docker
	database_name = 'neo4j'  
	# specify any container name
	container_name = 'neo4j_container'


	# set of variables for debugging purposes
	step_1_build_graph_csv_files = True
	step_2_import_inside_neo4j = True
	step_3_query_property_graph = True
	step_4_stop_container = True



	# step 1: analyze the program to build the property graph nodes and relationship CSV files
	if step_1_build_graph_csv_files:
		neo4jDatabaseUtilityModule.API_build_property_graph_for_file(absolute_input_program_folder_name, input_file_name, timeout=5*60)


	# step 2: import the CSV files into an active neo4j database inside a docker container
	if step_2_import_inside_neo4j:
		nodes_file = os.path.join(absolute_output_program_folder_name, constantsModule.NODE_INPUT_FILE_NAME)
		rels_file =  os.path.join(absolute_output_program_folder_name, constantsModule.RELS_INPUT_FILE_NAME)
		if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
			logger.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder! Please check your inputs.')
			return -1
		
		# remove the old container & database if it exists 
		dockerModule.stop_neo4j_container(container_name)
		dockerModule.remove_neo4j_container(container_name)
		dockerModule.remove_neo4j_database(database_name, container_name)
		time.sleep(5)

		dockerModule.create_neo4j_container(container_name)
		logger.info('waiting 5 seconds for the neo4j container to be ready.')
		time.sleep(5)


		logger.info('importing data inside container.')
		dockerModule.import_data_inside_container(container_name, database_name, relative_output_path, 'CSV')
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=120)
		if not connection_success:
			sys.exit(1)
	else:
		dockerModule.start_neo4j_container(container_name)
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=120)
		if not connection_success:
			sys.exit(1)


	# step3: run the vulnerability detection queries
	if step_3_query_property_graph:
		neo4jDatabaseUtilityModule.exec_fn_within_transaction(run_queries)


	# step4: stop the neo4j docker container
	if step_4_stop_container:
		dockerModule.stop_neo4j_container(container_name)

if __name__ == '__main__':
	main()

