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
	creates a CSV file for the dynamic taint flows

	Running:
	------------
	$ python3 -m exports.create_csv_file --table=taintflows --sitelist=/path/to/sitelist_crawled.csv --cut=1000

"""

import os, sys
import json
import argparse
import pandas as pd
import csv

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule


def _get_unique_objects(list_of_jsons):

	output = []
	tmp = []
	for item in list_of_jsons:
		hashed = str(item)
		if hashed not in tmp:
			tmp.append(hashed)
			output.append(item)

	return output

def _get_unique_taint_flows(json_content):

	taintflows = _get_unique_objects(json_content)

	unique_taintflows = []
	for taintflow_object in taintflows:
		taints = _get_unique_objects(taintflow_object["taint"])	

		# merge multiple begin, end flows together
		merged_begin_end_taints = []
		tmp = []
		for t in taints:
			obj = {"flow": t["flow"]}
			hashed = str(obj)
			if hashed not in tmp:
				tmp.append(hashed)
				obj["begin"] = [t["begin"]]
				obj["end"] = [t["end"]]
				merged_begin_end_taints.append(obj)
			else:
				idx = tmp.index(hashed)
				obj = merged_begin_end_taints[idx]
				obj["begin"].append(t["begin"])
				obj["end"].append(t["end"])		
				merged_begin_end_taints[idx] = obj

		copy = taintflow_object
		copy["taint"] = merged_begin_end_taints
		unique_taintflows.append(copy)

	return unique_taintflows



global_id = 1
def insert_taint_flows_into_csv(csv_writer, table_name, json_content, webpage_url):

	"""
	Table
	------------------
	domain, url, source, sink, str, dataflows 

	"""
	unique_taintflows = _get_unique_taint_flows(json_content)
	global global_id

	for taintflow_object in unique_taintflows:
		
		domain = taintflow_object["domain"]
		webpage_loc = taintflow_object["loc"]
		sources = taintflow_object["sources"]
		sink = taintflow_object["sink"]
		string = taintflow_object["str"]
		dataflows = taintflow_object["taint"]
		dataflows = json.dumps(dataflows) 
		for source in sources: 
			# NEW ENTRY: [domain, webpage_url, webpage_loc, source, sink, string, dataflows]
			try:
				args = [str(global_id), str(domain), str(webpage_url), str(webpage_loc), str(source), str(sink), str(string), dataflows]
				csv_writer.writerow(args)
				global_id += 1
			except Exception as e:
				LOGGER.error(e)



def initialize_csv(csv_writer, table_name):
	if table_name == 'taintflows':
		csv_writer.writerow(['id', 'domain', 'url', 'loc', 'source', 'sink', 'string', 'dataflows'])

def main():

	SITELIST_FILE_NAME_DEFAULT = 'sitelist_crawled.csv'
	
	TAINT_FLOW_FILE_NAME = 'taintflows_relevant.json'
	TABLE_TAINT_FLOWS = 'taintflows'


	p = argparse.ArgumentParser(description='This script filters the relevant foxhound taint flows based on the sources.')
	p.add_argument('--sitelist', "-I",
		  metavar="FILE",
		  default=SITELIST_FILE_NAME_DEFAULT,
		  help='list of sites (default: %(default)s)',
		  type=str)

	p.add_argument('--table', "-T",
		  metavar="FILE",
		  default=TABLE_TAINT_FLOWS,
		  help='taint files name (default: %(default)s)',
		  type=str)

	p.add_argument('--cut', "-C", type=int, default=1000, help='the threshold for maximum number of entries to consider in the sitelist (default: %(default)s)')


	args= vars(p.parse_args())
	sitelist_filename = args["sitelist"]
	table_name = args["table"]
	max_threshold =  int(args["cut"])

	csv_file_name = os.path.join(constantsModule.BASE_DIR, 'exports/JAWv3.csv')
	csv_fd = open(csv_file_name, 'w+', newline='')
	csv_writer = csv.writer(csv_fd, delimiter=',',quotechar='"', quoting=csv.QUOTE_ALL) # doublequote=False, escapechar='\\')


	if sitelist_filename == SITELIST_FILE_NAME_DEFAULT:
		sitelist_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), SITELIST_FILE_NAME_DEFAULT)

	LOGGER.info('started processing the taint flows.')
		
	if table_name == TABLE_TAINT_FLOWS:

		initialize_csv(csv_writer, table_name)

		chunksize = 10**5
		breakLoop = False

		for chunk_df in pd.read_csv(sitelist_filename, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
			
			if breakLoop:
				break

			for (index, row) in chunk_df.iterrows():
				etld_url = row[1]
				url = 'http://' + etld_url
				app_name = utilityModule.getDirectoryNameFromURL(url)
				app_path_name = os.path.join(constantsModule.DATA_DIR, app_name)
				if os.path.exists(app_path_name) and os.path.isdir(app_path_name):
					files = os.listdir(app_path_name)
					if len(files) > 1:
						for webpage_name in files:
							webpage_path_name = os.path.join(app_path_name, webpage_name)
							
							url_file = os.path.join(webpage_path_name, 'url.out')
							if os.path.exists(url_file):
								fd = open(url_file, 'r')
								webpage_url = fd.read().strip().strip('\n').strip()
								fd.close()

								if os.path.exists(webpage_path_name) and os.path.isdir(webpage_path_name):
									taintflows_json_file = os.path.join(webpage_path_name, TAINT_FLOW_FILE_NAME)
									if os.path.exists(taintflows_json_file):
										json_content = {}
										try:
											fd = open(taintflows_json_file, 'r')
											json_content = json.load(fd)
											fd.close()
										except:
											LOGGER.warning('JSON parsing error for %s'%taintflows_json_file)
											continue

										insert_taint_flows_into_csv(csv_writer, table_name, json_content, webpage_url)
				if index >= max_threshold:
					breakLoop = True
					break

	else:
		LOGGER.warning('exporting %s is not yet supported.'%table_name)

	csv_fd.close()

	bash_cmd = "pigz %s"%csv_file_name
	IOModule.run_os_command(bash_cmd)
	LOGGER.info('finished.')


main()