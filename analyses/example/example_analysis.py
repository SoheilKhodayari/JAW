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
	$ python3 -m analyses.example.example_analysis --input=$(pwd)/data/test_program/test.js

"""

import os
import sys
import time
import uuid
import argparse

import constants as constantsModule
import utils.io as IOModule
import utils.utility as utilityModule
from utils.logging import logger

import hpg_neo4j.db_utility as DU
import hpg_neo4j.query_utility as QU
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


def start_analysis(input_path_name, analyze=True, build=True, query=True, stop=True, compress_hpg=False):
	"""
	@param {string} input_path_name: absolute path of the input JavaScript file
	@param {bool} analyze: analyze the code to build a model or not
	@param {bool} build: build a neo4j database or not (i.e., model import)
	@param {bool} query: run the Cypher queries or not
	"""


	file_name_with_extension = utilityModule.get_directory_last_part(input_path_name)
	file_name = file_name_with_extension.rstrip('.js')
	output_directory = utilityModule.remove_part_from_str(input_path_name, file_name_with_extension)

	# a random id for the property graph
	graphid = uuid.uuid4().hex

	# must use the default docker container db name (i.e., `neo4j`) which is the only active db in docker
	database_name = 'neo4j'  

	# specify any container name
	container_name = 'neo4j_container_{0}_{1}'.format(file_name, graphid)
	
	logger.info('HPG for: %s'%(input_path_name))


	# set of variables for debugging purposes
	step_1_build_graph_csv_files = analyze
	step_2_import_inside_neo4j = build
	step_3_query_property_graph = query
	step_4_stop_container = stop
	step_5_compress_hpg = compress_hpg


	# step 1: analyze the program to build the property graph nodes and relationship CSV files
	if step_1_build_graph_csv_files:
		command = "node %s --input=%s --output=%s --graphid=%s --mode=csv --lang=js"%(constantsModule.STATIC_ANALYZER_CLI_DRIVER_PATH, input_path_name, output_directory, graphid)
		IOModule.bash_command(command, capture_output=True, log_command=True)


	# step 2: import the CSV files into an active neo4j database inside a docker container
	if step_2_import_inside_neo4j:
		nodes_file = os.path.join(output_directory, constantsModule.NODE_INPUT_FILE_NAME)
		rels_file =  os.path.join(output_directory, constantsModule.RELS_INPUT_FILE_NAME)
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

		# import path for docker is configured to be relative to the /data/ directory
		relative_output_path = utilityModule.remove_part_from_str(output_directory, constantsModule.DATA_DIR).lstrip('/')
		dockerModule.import_data_inside_container(container_name, database_name, relative_output_path, 'CSV')
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = DU.wait_for_neo4j_bolt_connection(timeout=120)
		if not connection_success:
			sys.exit(1)
	else:
		dockerModule.start_neo4j_container(container_name)
		logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
		connection_success = DU.wait_for_neo4j_bolt_connection(timeout=120)
		if not connection_success:
			sys.exit(1)


	# step3: run the vulnerability detection queries
	if step_3_query_property_graph:
		DU.exec_fn_within_transaction(run_queries)


	# step4: stop the neo4j docker container
	if step_4_stop_container:
		dockerModule.stop_neo4j_container(container_name)


	# optional step 5: compress the hpg after analysis 
	if step_5_compress_hpg:
		IOModule.compress_graph(webpage)



if __name__ == '__main__':


	p = argparse.ArgumentParser(description='This script creates an HPG for a JavaScript file, and runs Cypher queries over it.')


	p.add_argument('--input', "-I",
					default='None',
					help='input path to the JavaScript file under the data directory (default: %(default)s)',
					type=str)


	p.add_argument('--analyze', "-A",
					default=True,
					help='analyze the code and model it via a property graph (default: %(default)s)',
					type=bool)

	p.add_argument('--build', "-B",
					default=True,
					help='build a neo4j property graph database by importing the model (default: %(default)s)',
					type=bool)

	p.add_argument('--query', "-Q",
					default=True,
					help='query the property graph database to generate symbolic models (default: %(default)s)',
					type=bool)

	p.add_argument('--stop', "-S",
					default=True,
					help='stop the neo4j container after running the queries or not (default: %(default)s)',
					type=bool)

	p.add_argument('--compress', "-C",
					default=False,
					help='compress the HPG after building (default: %(default)s)',
					type=bool)


	args= vars(p.parse_args())


	input_path_name = args['input']
	run_the_graph_analyzer = args['analyze']
	build_the_neo4j_database = args['build']
	query_the_neo4j_database = args['query']
	stop_the_neo4j_database = args['stop']
	compress_hpg = args['compress']

	start_analysis(input_path_name, analyze=run_the_graph_analyzer, build=build_the_neo4j_database, query=query_the_neo4j_database, stop=stop_the_neo4j_database, compress_hpg=compress_hpg)




