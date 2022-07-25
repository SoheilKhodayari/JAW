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
	Creates a new Neo4j Docker container instance


	Usage:
	------------
	python3 -m docker.neo4j.manage_container

"""


import os
import constants
import utils.utility as utilityModule
import hpg_neo4j.db_utility as DU
from utils.logging import logger
import time
import shutil

# set up neo4j volume folder
VOLUME_HOME = os.path.join(os.path.join(os.path.join(constants.BASE_DIR, "docker"), "neo4j"), "volume")



def create_neo4j_container(container_name, volume_home=VOLUME_HOME):

	if not os.path.exists(volume_home):
		os.makedirs(volume_home)


	# Should we also add the  -v {1}/neo4j/conf:/conf \ option to the below command for the neo4j conf files?

	# See: https://neo4j.com/labs/apoc/4.2/installation/#restricted
	# and https://github.com/neo4j-contrib/neo4j-apoc-procedures/issues/451
	# Should I add the option below too?
	# 	-e NEO4J_dbms_security_procedures_whitelist=apoc.coll.\\\*,apoc.load.\\\* \
	command="""docker run \
    --name {0} \
    -p7474:7474 -p7687:7687 \
    -d \
    -v {1}/neo4j/data:/data \
    -v {1}/neo4j/logs:/logs \
    -v {4}:/var/lib/neo4j/import \
    -v {1}/neo4j/plugins:/plugins \
    -e NEO4J_apoc_export_file_enabled=true \
    -e NEO4J_apoc_import_file_enabled=true \
    -e NEO4J_apoc_import_file_use__neo4j__config=true \
    -e NEO4JLABS_PLUGINS='["apoc"]' \
    -e NEO4J_dbms_security_procedures_unrestricted=apoc.\\\* \
    -e PYTHONUNBUFFERED=1 \
    --env NEO4J_AUTH={2}/{3} \
    neo4j:4.2.3
	""".format(container_name, volume_home, constants.NEO4J_USER, constants.NEO4J_PASS, constants.DATA_DIR)
	# Note: pass the analyzer outputs folder as the import directory of neo4j

	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('Docker container %s is starting.'%str(container_name))



def remove_neo4j_database(database_name, container_name):
	path_db = os.path.join(VOLUME_HOME, "neo4j/data/databases/"+ str(database_name))
	if os.path.exists(path_db):
		shutil.rmtree(path_db) 

	path_trans = os.path.join(VOLUME_HOME, "neo4j/data/transactions/"+ str(database_name))
	if os.path.exists(path_trans):
		shutil.rmtree(path_trans) 


def start_neo4j_container(container_name):

	command = "docker start %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.info('Docker container %s is starting.'%str(container_name))


def stop_neo4j_container(container_name):

	command = "docker stop %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.warning('Docker container %s is being stopped.'%str(container_name))


def remove_neo4j_container(container_name):

	command = "docker rm %s"%str(container_name)
	utilityModule.run_os_command(command, print_stdout=False)
	logger.warning('Docker container %s is being removed.'%str(container_name))


def import_data_inside_container_with_cypher(tx, database_name, relative_import_path):

	##  tx.run("""CREATE DATABASE %s;"""%database_name)
	## Note: neo4j community edition does not support management of multiple database
	## instead, we should run one docker instance per database
	

	## Note: this supports incremental import of data, i.e., multiple XML files can be imported inside the same db
	results = tx.run("""CALL  apoc.import.graphml('file:///%s', { })"""%relative_import_path.lstrip('/'))
	return results


def import_data_inside_container(container_name, database_name, relative_import_path, mode='graphML', nodes_file=None, edges_file=None):

	"""
	@param {string} container_name
	@param {string} database_name
	@param {string} relative_import_path: path relative to ./hpg_construction/outputs/
		in case of CSV: path of the folder containing nodes.csv, rels.csv 
		in case of graphML: path of the graphML file
	@param {string} mode: type of input (options are 'CSV' or 'graphML')
	"""

	if mode == 'CSV':

		csv_path = os.path.join('/var/lib/neo4j/import', relative_import_path)
		if nodes_file is None:
			nodes_path = os.path.join(csv_path, constants.NODE_INPUT_FILE_NAME)
		else:
			nodes_path = os.path.join(csv_path, nodes_file)

		if edges_file is None:
			rels_path = os.path.join(csv_path, constants.RELS_INPUT_FILE_NAME)
		else:
			rels_path = os.path.join(csv_path, edges_file)
	
		# see: https://neo4j.com/docs/operations-manual/current/tools/neo4j-admin-import/#import-tool-option-skip-duplicate-nodes
		if constants.NEO4J_VERSION.startswith(constants.NEOJ_VERSION_4X):
			neo4j_import_cmd = "neo4j-admin import --database=%s --nodes=%s --relationships=%s --delimiter='¿' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path)
		else:
			neo4j_import_cmd = "neo4j-admin import --mode=csv --database=%s --nodes=%s --relationships=%s --delimiter='¿' --skip-bad-relationships=true --skip-duplicate-nodes=true"%(database_name, nodes_path, rels_path)

		# directly run the command inside the neo4j container with docker exec
		cmd = "docker exec -it %s %s"%(container_name, neo4j_import_cmd)
		utilityModule.run_os_command(cmd, print_stdout=True, prettify=True)
		return 1

	elif mode == 'graphML':
		return DU.exec_fn_within_transaction(import_data_inside_container_with_cypher, database_name, relative_import_path)



#### Tests

def _test_import():

	relative_import_path = 'graphml/python_test_1.xml'
	database_name = 'test_neo4j_db'
	container_name = 'test_neo4j'
	mode = 'graphML'

	create_neo4j_container(container_name)
	time.sleep(10)
	result = import_data_inside_container(container_name, database_name, relative_import_path, mode)
	logger.info(result)


##### Run tests if run as the main module
if __name__ == '__main__':

	logger.info('running neo4j docker tests...')
	_test_import()








