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
	Neo4j database utility functions

	Usage:
	---------------
	> import hpg_neo4j.db_utility as neo4jDatabaseUtilityModule


"""


import subprocess
import os
import sys
import time
import requests
import uuid


import constants as constantsModule
# import hpg_neo4j.orm as ORMModule
from utils.utility import _hash
from utils.io import run_os_command
from neo4j import GraphDatabase
from utils.logging import logger



# ------------------------------------------------------------------------------------ #
# 	Utils
# ------------------------------------------------------------------------------------ #


def _get_last_subpath(s):
	"""
	@param s :input string
	@return the last part of the given directory as string
	"""
	return os.path.basename(os.path.normpath(s))



def generate_uuid_for_graph():
	"""
	generates a uuid for the graph, which can be used as the id of the neo4j docker container
	"""
	return 'graph-' + str(uuid.uuid4())




# ------------------------------------------------------------------------------------ #
# 	Deprecated APIs
# ------------------------------------------------------------------------------------ #

def API_neo4j_prepare(csv_absolute_path, nodes_name=constantsModule.NODE_INPUT_FILE_NAME, relationships_name=constantsModule.RELS_INPUT_FILE_NAME, load_dom_tree_if_exists=True):
	"""
	@param {string} csv_absolute_path: absolute path to the graph node and relation csv files
	@param {string} nodes_name: the name of the CSV file for nodes
	@param {string} relationships_name: the name of the CSV file for edges or relationships
	@param {boolean} load_dom_tree_if_exists: if set, the function loads the HTML code of the dom snapshot to the property graph in addition to the html path
	@description imports graph csv files, and prepares the db
	@return {void} None
	"""

	folder_name_as_db_name = _get_last_subpath(csv_absolute_path)
	nodes_path = os.path.join(csv_absolute_path, nodes_name)
	rels_path = os.path.join(csv_absolute_path, relationships_name)

	if (not os.path.isfile(nodes_path)) or (not os.path.isfile(rels_path)):
		logger.error('CSV nodes or relationships file does not exist for importing in the given directory: %s'%csv_absolute_path)
		sys.exit(1)

	# stop neo4j
	STOP_NEO4J_COMMAND = "neo4j stop"
	run_os_command(STOP_NEO4J_COMMAND)


	# handle the case where the db for the url already exists: skip creating a new one by storing a map or delete the old one!
	DELETE_OLD_DB_IF_EXISTS_COMMAND = "rm -rf %s.db"%(os.path.join(constantsModule.NEO4J_DB_PATH,folder_name_as_db_name))
	run_os_command(DELETE_OLD_DB_IF_EXISTS_COMMAND)

	# import the data
	if constantsModule.NEO4J_VERSION.startswith(constantsModule.NEOJ_VERSION_4X):
		NEO4J_IMPORT_COMMAND = "neo4j-admin import --database=%s.db --nodes=%s --relationships=%s --delimiter='¿'"%(folder_name_as_db_name, nodes_path, rels_path)
	else:
		NEO4J_IMPORT_COMMAND = "neo4j-admin import --mode=csv --database=%s.db --nodes=%s --relationships=%s --delimiter='¿'"%(database_name, nodes_path, rels_path)
	run_os_command(NEO4J_IMPORT_COMMAND)

	# change the active db
	new_config_line = "dbms.active_database=%s.db"%folder_name_as_db_name
	if constantsModule.CURRENT_PLATFORM == constantsModule.PLATFORMS['MAC_OS_X']:
		CHANGE_ACTIVE_GRAPH_COMMAND = """sed -i '' 's/dbms.active_database=.*db/%s/1' %s"""%(new_config_line, constantsModule.NEO4J_CONF)
	elif constantsModule.CURRENT_PLATFORM == constantsModule.PLATFORMS['Linux']:
		CHANGE_ACTIVE_GRAPH_COMMAND = """sed -i 's/dbms.active_database=.*db/%s/1' %s"""%(new_config_line, constantsModule.NEO4J_CONF)
	else:
		logger.error('Detected unsupported platform. Check your enviornment variables (.env) file if your platform is supported but it is set wrong.')
		sys.exit(1)
	run_os_command(CHANGE_ACTIVE_GRAPH_COMMAND, print_stdout=False)

	# start neo4j
	START_NEO4J_COMMAND = "neo4j start"
	run_os_command(START_NEO4J_COMMAND)

	
	logger.info("Neo4J DB setup in progress. Waiting for 10 seconds.")
	time.sleep(10)

	if load_dom_tree_if_exists:
		dom_tree_nodes = ORMModule.DOMSnapshot.nodes.all()
		for node in dom_tree_nodes:
			fd = open(node.Location, 'r')
			html = fd.read()
			fd.close()
			node.Code = html
			node.save()


def activate_existing_neo4j_db(database_name):

	"""
	activates a neo4j database that has been previously imported
	@param {string} database_name which has the .db extension included
	@return {bool} whether or not the given database name is activated 
	"""

	# stop neo4j
	STOP_NEO4J_COMMAND = "neo4j stop"
	run_os_command(STOP_NEO4J_COMMAND)

	db_absolute_path = os.path.join(constantsModule.NEO4J_DB_PATH, database_name)
	if not os.path.exists(db_absolute_path):
		
		if constantsModule.DEBUG_PRINTS:
			logger.warning("No neo4j database with name \'%s\' exists for activation!"%database_name)
		return False

	else:
		# change the active db
		new_config_line = "dbms.active_database=%s"%database_name
		if constantsModule.CURRENT_PLATFORM == constantsModule.PLATFORMS['MAC_OS_X']:
			CHANGE_ACTIVE_GRAPH_COMMAND = """sed -i '' 's/dbms.active_database=.*db/%s/1' %s"""%(new_config_line, constantsModule.NEO4J_CONF)
		elif constantsModule.CURRENT_PLATFORM == constantsModule.PLATFORMS['Linux']:
			CHANGE_ACTIVE_GRAPH_COMMAND = """sed -i 's/dbms.active_database=.*db/%s/1' %s"""%(new_config_line, constantsModule.NEO4J_CONF)
		else:
			logger.error('Detected unsupported platform. Check your enviornment variables (.env) file if your platform is supported but it is set wrong.')
			return False
		run_os_command(CHANGE_ACTIVE_GRAPH_COMMAND, print_stdout=False)

		# start neo4j
		START_NEO4J_COMMAND = "neo4j start"
		run_os_command(START_NEO4J_COMMAND)

		if constantsModule.DEBUG_PRINTS:
			logger.info("Neo4J DB setup successful.")

		time.sleep(3)

		return True


def does_neo4j_db_exists(database_name):

	"""
	@param {string} database_name
	@return {bool} whether or not the neo4j database with the given name exists
	"""

	db_absolute_path = os.path.join(constantsModule.NEO4J_DB_PATH, database_name)
	if os.path.exists(db_absolute_path):
		return True
	else:
		return False


# ------------------------------------------------------------------------------------ #
# 	Current APIs
# ------------------------------------------------------------------------------------ #

def exec_fn_within_transaction(fn, *args, conn=constantsModule.NEO4J_CONN_STRING, conn_timeout=None, keep_alive=True):
	
	"""
	wraps a function within a neo4j transaction
	@param {pointer} fn: function 
	@param {param-list} *args: positional arguments
	@return fn output: execute fn with transaction and the list of passed args 
	"""
	logger.info('quering on connection: %s'%str(conn))
	out = None

	if conn_timeout is None:
		neo_driver = GraphDatabase.driver(conn, auth=(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS))
		with neo_driver.session() as session:
			with session.begin_transaction() as tx:
				out = fn(tx, *args)

		return out
	else:
		max_connection_lifetime = int(conn_timeout) + 60 # in seconds
		neo_driver = GraphDatabase.driver(conn, auth=(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS), max_connection_lifetime=max_connection_lifetime, keep_alive=keep_alive)
		with neo_driver.session() as session:
			with session.begin_transaction() as tx:
				out = fn(tx, *args)

		return out





def wait_for_neo4j_bolt_connection(timeout=60, conn=constantsModule.NEO4J_CONN_HTTP_STRING):
	"""
	wait until neo4j access bolt/http connections
	"""
	timer = 0
	increment = 5
	RET = False

	while True:
		try:
			r = requests.get(conn, verify=False, timeout=3) # 3 seconds timeout
			s = str(r.status_code)
			if s.startswith('2'):
				logger.info('neo4j is now ready to accept bolt connections.')
				RET = True
				break
		except:
			time.sleep(increment)
			timer+= increment
			if timer >= timeout:
				logger.error('neo4j is not accepting bolt connections.')
				RET = False
				break

	return RET


def ineo_create_db_instance(db_name, port, neo4j_version='4.2.3'):

	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN create -v {0} -p{1} {2}".format(neo4j_version, port, db_name)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)

	# remove the empty databases created by ineo and neo4j
	EMPTY_DB_PATH_1 = os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(constantsModule.BASE_DIR, "ineo"), "instances"), str(db_name)), "data"), "databases"), str(db_name))
	EMPTY_DB_PATH_2 = os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(constantsModule.BASE_DIR, "ineo"), "instances"), str(db_name)), "data"), "databases"), "neo4j")
	command = "rm -rf %s"%EMPTY_DB_PATH_1
	run_os_command(command)

	command = "rm -rf %s"%EMPTY_DB_PATH_2
	run_os_command(command)


def ineo_start_db_instance(db_name):

	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN start {0}".format(db_name)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)

def ineo_stop_db_instance(db_name):

	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN stop {0}".format(db_name)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)

def neoadmin_import_db_instance(ineo_db_name, neo4j_db_name, nodes_file, rels_file, rels_dynamic_file=None):

	# script: BASE_DIR/ineo/instances/DB_NAME/bin/neo4j-admin
	NEO4j_ADMIN = os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(constantsModule.BASE_DIR, "ineo"), "instances"), str(ineo_db_name)), "bin"), "neo4j-admin")
	if rels_dynamic_file:
		command = "NEO4j_ADMIN import --database={0} --nodes={1} --relationships={2},{3} --delimiter='¿' --skip-bad-relationships=true --skip-duplicate-nodes=true --bad-tolerance=100000 --ignore-extra-columns=true --skip-bad-entries-logging=true".format(neo4j_db_name, nodes_file, rels_file, rels_dynamic_file)
	else:
		command = "NEO4j_ADMIN import --database={0} --nodes={1} --relationships={2} --delimiter='¿' --skip-bad-relationships=true --skip-duplicate-nodes=true --bad-tolerance=100000 --ignore-extra-columns=true --skip-bad-entries-logging=true".format(neo4j_db_name, nodes_file, rels_file)
	
	command = command.replace("NEO4j_ADMIN", NEO4j_ADMIN)
	run_os_command(command, print_stdout=True, log_command=True, prettify=True)


def ineo_set_bolt_port_for_db_instance(db_name, port_string):

	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN set-port -b {0} {1}".format(db_name, port_string)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)


def ineo_restart_neo4j(db_name):
	
	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN restart {0}".format(db_name)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)


def ineo_remove_db_instance(db_name):
	
	INEO_BIN = constantsModule.INEO_BIN
	command = "INEO_BIN destroy -f {0}".format(db_name)
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)


def ineo_set_initial_password_and_restart(db_name, password=constantsModule.NEO4J_PASS):

	# script: BASE_DIR/ineo/instances/DB_NAME/bin/neo4j-admin
	NEO4j_ADMIN = os.path.join(os.path.join(os.path.join(os.path.join(os.path.join(constantsModule.BASE_DIR, "ineo"), "instances"), str(db_name)), "bin"), "neo4j-admin")
	command = "NEO4j_ADMIN set-initial-password {0}".format(password)
	command = command.replace("NEO4j_ADMIN", NEO4j_ADMIN)
	run_os_command(command)
	time.sleep(2)
	ineo_restart_neo4j(db_name)








