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
	Creates a neo4j graph db for a given webpage and runs the analysis queries
	

	Usage:
	------------
	> python3 -m analyses.request_hijacking.analyze_hpg_api --seedurl=http://example.com --webpage=xyz

"""

import os
import sys
import time
import argparse
import json
import constants as constantsModule
import utils.io as IOModule
import utils.utility as utilityModule
import docker.neo4j.manage_container as dockerModule
import hpg_neo4j.db_utility as DU
import hpg_neo4j.query_utility as QU
import analyses.request_hijacking.traversals_cypher as request_hijacking_py_traversals
from utils.logging import logger as LOGGER
 

def get_url_for_webpage(webpage_directory):
	content = None
	fd = open(os.path.join(webpage_directory, "url.out"), "r")
	content = fd.read()
	fd.close()
	return content

def main():


	BASE_DIR= constantsModule.BASE_DIR

	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')



	p.add_argument('--seedurl', "-U",
		  default='http://example.com',
		  help='the seed URL of the app to analyze  (default: %(default)s)',
		  type=str)

	p.add_argument('--webpage', "-W",
		  default='xyz',
		  help='webpage folder name (default: %(default)s)',
		  type=str)
	
	p.add_argument('--httpport', "-H",
		  default=constantsModule.NEO4J_HTTP_PORT,
		  help='http port for neo4j (default: %(default)s)',
		  type=str)

	p.add_argument('--boltport', "-B",
		  default=constantsModule.NEO4J_BOLT_PORT,
		  help='bolt port for neo4j (default: %(default)s)',
		  type=str)



	args= vars(p.parse_args())

	seed_url = args["seedurl"]
	webpage = args["webpage"]
	webapp_folder_name = utilityModule.getDirectoryNameFromURL(seed_url)

	# overwrite the neo4j config for this process
	neo4j_http_port = args["httpport"]
	neo4j_bolt_port = args["boltport"]

	constantsModule.NEO4J_HTTP_PORT = neo4j_http_port
	constantsModule.NEO4J_CONN_HTTP_STRING = "http://127.0.0.1:%s"%str(constantsModule.NEO4J_HTTP_PORT)

	constantsModule.NEO4J_BOLT_PORT = neo4j_bolt_port
	constantsModule.NEO4J_CONN_STRING = "bolt://127.0.0.1:%s"%str(constantsModule.NEO4J_BOLT_PORT)
	constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	webpage_folder = os.path.join(constantsModule.DATA_DIR, os.path.join(webapp_folder_name, webpage))
	
	# requirement: the database name must have a length between 3 and 63 characters
	# must always import into the default neo4j database
	neo4j_database_name = 'neo4j' 
	database_name = '{0}_{1}'.format(webapp_folder_name, webpage) 

	nodes_file = os.path.join(webpage_folder, constantsModule.NODE_INPUT_FILE_NAME)
	rels_file =  os.path.join(webpage_folder, constantsModule.RELS_INPUT_FILE_NAME)
	rels_dynamic_file = os.path.join(webpage_folder, constantsModule.RELS_DYNAMIC_INPUT_FILE_NAME)

	nodes_file_gz = os.path.join(webpage_folder, constantsModule.NODE_INPUT_FILE_NAME +'.gz')
	rels_file_gz =  os.path.join(webpage_folder, constantsModule.RELS_INPUT_FILE_NAME  +'.gz')
	rels_dynamic_file_gz = os.path.join(webpage_folder, constantsModule.RELS_DYNAMIC_INPUT_FILE_NAME  +'.gz')

	if os.path.exists(nodes_file) and os.path.exists(rels_file) and os.path.exists(rels_dynamic_file):
		LOGGER.info('[TR] hpg files exist in decompressed format, skipping de-compression.')

	elif os.path.exists(nodes_file_gz) and os.path.exists(rels_file_gz) and os.path.exists(rels_dynamic_file_gz):
		LOGGER.info('[TR] de-compressing hpg.')
		# de-compress the hpg 
		IOModule.decompress_graph(webpage_folder)
	else:
		LOGGER.error('[TR] The nodes/rels.csv files do not exist in %s, skipping.'%webpage_folder)
		return False

	LOGGER.warning('[TR] removing any previous neo4j instance for %s'%str(database_name))
	DU.ineo_remove_db_instance(database_name)

	LOGGER.info('[TR] creating db %s with http port %s'%(database_name, neo4j_http_port))
	DU.ineo_create_db_instance(database_name, neo4j_http_port)

	# check if the bolt port requested by the config.yaml is not the default one
	if not ( int(neo4j_http_port) + 2 == int(neo4j_bolt_port) ):
		LOGGER.info('[TR] setting the requested bolt port %s for db %s'%(neo4j_bolt_port, database_name))
		DU.ineo_set_bolt_port_for_db_instance(database_name, neo4j_bolt_port)

	LOGGER.info('[TR] importing the database with neo4j-admin.')
	DU.neoadmin_import_db_instance(database_name, neo4j_database_name, nodes_file, rels_file, rels_dynamic_file)

	LOGGER.info('[TR] changing the default neo4j password to enable programmatic access.')
	DU.ineo_set_initial_password_and_restart(database_name, password=constantsModule.NEO4J_PASS)

	# compress the hpg after the model import
	IOModule.compress_graph(webpage_folder)

	LOGGER.info('[TR] waiting for the neo4j connection to be ready...')
	time.sleep(10)
	LOGGER.info('[TR] connection: %s'%constantsModule.NEO4J_CONN_HTTP_STRING)
	connection_success = DU.wait_for_neo4j_bolt_connection(timeout=150, conn=constantsModule.NEO4J_CONN_HTTP_STRING)
	if not connection_success:
		try:
			LOGGER.info('[TR] stopping neo4j for %s'%str(database_name))
			DU.ineo_stop_db_instance(database_name)

			## remove db after analysis
			DU.ineo_remove_db_instance(database_name)
		except:
			LOGGER.info('[TR] ran into exception while prematurely stopping neo4j for %s'%str(database_name))
		return connection_success

	LOGGER.info('[TR] starting to run the queries.')
	webpage_url = get_url_for_webpage(webpage_folder)
	try:
		DU.exec_fn_within_transaction(request_hijacking_py_traversals.run_traversals, webpage_url, webpage_folder, webpage, conn=constantsModule.NEO4J_CONN_STRING)
	except Exception as e:
		LOGGER.error(e)
		LOGGER.error('[TR] neo4j connection error.')
		outfile =  os.path.join(webpage_folder, "sinks.flows.out")
		if not os.path.exists(outfile):
			with open(outfile, 'w+') as fd:
				error_json = {"error": str(e)}
				json.dump(error_json, fd, ensure_ascii=False, indent=4)



	## note: these steps are done in the top level module, as timeout may occur here
	LOGGER.info('[TR] stopping neo4j for %s'%str(database_name))
	DU.ineo_stop_db_instance(database_name)

	## remove db after analysis
	LOGGER.info('[TR] removing neo4j for %s'%str(database_name))
	DU.ineo_remove_db_instance(database_name)

	return connection_success

if __name__ == "__main__":
  main()
