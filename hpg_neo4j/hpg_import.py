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
	---------------
	This script imports a CSV of a property graph into an neo4j docker database instance
	
	Usage:
	---------------
	> python3 -m hpg_neo4j.hpg_import --rpath=<path-to-the-folder-of-the-csv-files> --id=<xyz> --nodes=<nodes.csv> --edges=<rels.csv>

	Note: <path-to-the-folder-of-the-csv-files> is either the absolute path, or 
		  the relative base with respect to the ROOT directory.

	Example: 
		> python3 -m hpg_neo4j.hpg_import --rpath=testpage --id=xyz
		where the graph files /data/testpage/nodes.csv and /data/testpage/rels.csv exists as input


	Help Command:
	---------------
	> python -m hpg_neo4j.hpg_import -h


"""



import time
import os
import argparse 
import constants as constantsModule
import docker.neo4j.manage_container as dockerModule
import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule
from utils.logging import logger


def main():

	parser = argparse.ArgumentParser(description='This script imports a CSV of a property graph into a neo4j docker database.')
	parser.add_argument('--rpath', metavar='P', help='relative path to the folder containing the graph CSV files inside the `data` directory')
	parser.add_argument('--id', metavar='I', help='an identifier for the graph or docker container')
	parser.add_argument('--nodes', metavar='N', help='the name of the nodes csv file (default: nodes.csv)', default='nodes.csv')
	parser.add_argument('--edges', metavar='E', help='the name of the relations csv file (default: rels.csv)', default='rels.csv')

	# dictionary of the provided arguments
	args = vars(parser.parse_args())

	GRAPH_ID = args['id']

	relative_import_path = args['rpath']

	NODES_FILE_NAME = args['nodes'].strip()
	RELS_FILE_NAME =  args['edges'].strip()
	if NODES_FILE_NAME == '':
		NODES_FILE_NAME = constantsModule.NODE_INPUT_FILE_NAME

	if RELS_FILE_NAME == '':
		RELS_FILE_NAME = constantsModule.RELS_INPUT_FILE_NAME


	DATABASE_NAME = 'neo4j'  
	CONTAINER_NAME = 'neo4j_container_' + GRAPH_ID


	# remove the old container & database if it exists 
	logger.info('removing the old docker container if it exists')
	dockerModule.stop_neo4j_container(CONTAINER_NAME)
	dockerModule.remove_neo4j_container(CONTAINER_NAME)
	dockerModule.remove_neo4j_database(DATABASE_NAME, CONTAINER_NAME)
	time.sleep(5)

	dockerModule.create_neo4j_container(CONTAINER_NAME)
	logger.info('waiting 5 seconds for the neo4j container to be ready.')
	time.sleep(5)

	logger.info('importing data inside the container.')

	dockerModule.import_data_inside_container(CONTAINER_NAME, DATABASE_NAME, relative_import_path, 'CSV', nodes_file=NODES_FILE_NAME, edges_file=RELS_FILE_NAME)
	logger.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
	connection_success = neo4jDatabaseUtilityModule.wait_for_neo4j_bolt_connection(timeout=150)
	if not connection_success:
		logger.info('error: hpg preparation timed out!')
		sys.exit(1)
	else:
		logger.info('hpg improted successfully')


if __name__ == "__main__":
	main()

