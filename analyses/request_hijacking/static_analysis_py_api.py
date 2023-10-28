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
	Detecting request hijacking vulnerabilities
	

	Usage:
	------------
	> import analyses.request_hijacking.static_analysis_py_api as request_hijacking_py_api

"""


import os
import sys
import time
import json
import constants as constantsModule
import utils.io as IOModule
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


def get_name_from_url(url):

	"""
	 @param url: eTLD+1 domain name
	 @return converts the url to a string name suitable for a directory by removing the colon and slash symbols

	"""
	return url.replace(':', '-').replace('/', '')



# ------------------------------------------------------------------------------------ #
#	Interface
# ------------------------------------------------------------------------------------ #
def build_and_analyze_hpg(seed_url, timeout=1800, overwrite=False, compress_hpg=True):

	"""	
	@param {string} seed_url
	@param {integer} timeout: per page static analysis timeout
	@description: imports an HPG inside a neo4j graph database and runs traversals over it.
	"""

	if str(constantsModule.NEO4J_USE_DOCKER).lower() == 'true':
		build_and_analyze_hpg_docker(seed_url, conn_timeout=timeout)
	else:
		build_and_analyze_hpg_local(seed_url, overwrite=overwrite, conn_timeout=timeout, compress_hpg=compress_hpg)

	# if timeout is not None:
	# 	build_and_analyze_hpg_local_with_timeout(seed_url, timeout=timeout, overwrite=overwrite)
	# else:
	# 	if constantsModule.NEO4J_USE_DOCKER:
	# 		build_and_analyze_hpg_docker(seed_url)
	# 	else:
	# 		build_and_analyze_hpg_local(seed_url, overwrite=overwrite)



def build_and_analyze_hpg_local_with_timeout(seed_url, timeout=None, overwrite=False):

	if timeout is None:
		static_analysis_per_webpage_timeout = 1800 # 30 mins (default)
	else:
		static_analysis_per_webpage_timeout = timeout

	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		LOGGER.error("[TR] did not found the directory for HPG analysis: "+str(webapp_data_directory))
		return -1

	webpages_json_file = os.path.join(webapp_data_directory, "webpages.json")

	if os.path.exists(webpages_json_file):
		LOGGER.info('[TR] reading webpages.json')
		fd = open(webpages_json_file, 'r')
		webapp_pages = json.load(fd)
		fd.close()

	else:
		LOGGER.info('[TR] webpages.json does not exist; falling back to filesystem.')
		# fall back to analyzing all pages if the `webpages.json` file is missing
		webapp_pages = os.listdir(webapp_data_directory)
		# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
		webapp_pages = [item for item in webapp_pages if len(item) == 64]


	for webpage in webapp_pages:
		webpage_folder = os.path.join(webapp_data_directory, webpage)
		if os.path.exists(webpage_folder):

			LOGGER.warning('[TR] HPG analyis for: %s'%(webpage_folder))
			
			# do NOT re-analyze webpages
			if str(overwrite).lower() == 'false':
				OUTPUT_FILE = os.path.join(webpage_folder, "sinks.flows.out")
				if os.path.exists(OUTPUT_FILE):
					LOGGER.info('[TR] analyis results already exists for webpage: %s'%webpage_folder)
					continue

			# note: the neo4j ports as in the config.yaml must be passed to the new process
			command = "python3 -m analyses.request_hijacking.analyze_hpg_api --seedurl={0} --webpage={1} --httpport={2} --boltport={3}".format(seed_url, webpage, constantsModule.NEO4J_HTTP_PORT, constantsModule.NEO4J_BOLT_PORT)
			cwd = constantsModule.BASE_DIR
			ret = IOModule.run_os_command(command, cwd= cwd, timeout=static_analysis_per_webpage_timeout, print_stdout=True, log_command=True)

			if ret < 0:
				## safely finish the analysis, even when timeout occurs
				database_name = '{0}_{1}'.format(webapp_folder_name, webpage) 
				LOGGER.info('[TR] stopping neo4j for %s'%str(database_name))
				DU.ineo_stop_db_instance(database_name)

				## remove db after analysis
				LOGGER.info('[TR] removing neo4j for %s'%str(database_name))
				DU.ineo_remove_db_instance(database_name)

			LOGGER.info('[TR] finished HPG analyis for: %s'%(webpage_folder))


def build_and_analyze_hpg_local(seed_url, overwrite=False, conn_timeout=None, compress_hpg=True):

	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		LOGGER.error("[TR] did not found the directory for HPG analysis: "+str(webapp_data_directory))
		return -1

	webpages_json_file = os.path.join(webapp_data_directory, "webpages.json")

	if os.path.exists(webpages_json_file):
		LOGGER.info('[TR] reading webpages.json')
		fd = open(webpages_json_file, 'r')
		webapp_pages = json.load(fd)
		fd.close()

	else:
		LOGGER.info('[TR] webpages.json does not exist; falling back to filesystem.')
		# fall back to analyzing all pages if the `webpages.json` file is missing
		webapp_pages = os.listdir(webapp_data_directory)
		# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
		webapp_pages = [item for item in webapp_pages if len(item) == 64]


	for webpage in webapp_pages:
		webpage_folder = os.path.join(webapp_data_directory, webpage)
		if os.path.exists(webpage_folder):

			LOGGER.warning('[TR] HPG analyis for: %s'%(webpage_folder))
			
			if str(overwrite).lower() == 'false':
				# do NOT re-analyze webpages
				OUTPUT_FILE = os.path.join(webpage_folder, "sinks.flows.out")
				if os.path.exists(OUTPUT_FILE):
					LOGGER.info('[TR] analyis results already exists for webpage: %s'%webpage_folder)
					continue

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
				continue

			neo4j_http_port = constantsModule.NEO4J_HTTP_PORT
			neo4j_bolt_port = constantsModule.NEO4J_BOLT_PORT

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

			if str(compress_hpg).lower() == 'true':
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
				continue

			LOGGER.info('[TR] starting to run the queries.')
			webpage_url = get_url_for_webpage(webpage_folder)
			try:
				DU.exec_fn_within_transaction(request_hijacking_py_traversals.run_traversals, webpage_url, webpage_folder, webpage, conn=constantsModule.NEO4J_CONN_STRING, conn_timeout=conn_timeout)
			except Exception as e:
				LOGGER.error(e)
				LOGGER.error('[TR] neo4j connection error.')
				outfile =  os.path.join(webpage_folder, "sinks.flows.out")
				if not os.path.exists(outfile):
					with open(outfile, 'w+') as fd:
						error_json = {"error": str(e)}
						json.dump(error_json, fd, ensure_ascii=False, indent=4)

			LOGGER.info('[TR] stopping neo4j for %s'%str(database_name))
			DU.ineo_stop_db_instance(database_name)

			## remove db after analysis
			LOGGER.info('[TR] removing neo4j for %s'%str(database_name))
			DU.ineo_remove_db_instance(database_name)


def build_and_analyze_hpg_docker(seed_url, conn_timeout=None):

	"""	
	@param {string} seed_url
	@description: imports an HPG inside a neo4j docker instance and runs traversals over it.
	
	"""
	webapp_folder_name = get_name_from_url(seed_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		LOGGER.error("[Traversals] did not found the directory for HPG analysis: "+str(webapp_data_directory))
		return -1

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

	for each_webpage in webapp_pages:

		relative_import_path = os.path.join(webapp_folder_name, each_webpage)
		container_name = container_name + each_webpage
		webpage = os.path.join(webapp_data_directory, each_webpage)
		LOGGER.warning('HPG for: %s'%(webpage))

		# de-compress the hpg 
		IOModule.decompress_graph(webpage)

		# import the CSV files into an active neo4j database inside a docker container
		if build:
			nodes_file = os.path.join(webpage, constantsModule.NODE_INPUT_FILE_NAME)
			rels_file =  os.path.join(webpage, constantsModule.RELS_INPUT_FILE_NAME)
			if not (os.path.exists(nodes_file) and os.path.exists(rels_file)):
				LOGGER.error('The HPG nodes.csv / rels.csv files do not exist in the provided folder, skipping...')
				continue
			
			# must build a container only once
			if build_container: 

				# remove the old container & database if it exists 
				dockerModule.stop_neo4j_container(container_name)
				dockerModule.remove_neo4j_container(container_name)
				dockerModule.remove_neo4j_database(database_name, container_name)
				time.sleep(5)

				dockerModule.create_neo4j_container(container_name)
				LOGGER.info('waiting 5 seconds for the neo4j container to be ready.')
				time.sleep(5)

			LOGGER.info('importing data inside container.')
			dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')
			LOGGER.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
			connection_success = DU.wait_for_neo4j_bolt_connection(timeout=150)
			if not connection_success:
				sys.exit(1)
		else:
			dockerModule.start_neo4j_container(container_name)
			LOGGER.info('waiting for the tcp port 7474 of the neo4j container to be ready...')
			connection_success = DU.wait_for_neo4j_bolt_connection(timeout=150)
			if not connection_success:
				sys.exit(1)

		# compress the hpg after the model import
		IOModule.compress_graph(webpage)

		# step3: run the vulnerability detection queries
		if query:
			webpage_url = get_url_for_webpage(webpage)
			DU.exec_fn_within_transaction(request_hijacking_py_traversals.run_traversals, webpage_url, webpage, each_webpage, conn_timeout=conn_timeout)


		# stop the neo4j docker container
		if stop_container:
			dockerModule.stop_neo4j_container(container_name)




























