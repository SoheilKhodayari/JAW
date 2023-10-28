# -*- coding: utf-8 -*-

"""
	Copyright (C) 2023  Soheil Khodayari, CISPA
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
	Creates a list of webpages with static data flows grouped by their source semantic types

	> output map format: website-folder -> source semantic type -> webpage-hash

	Running:
	------------
	$ python3 -m scripts.get_pages_with_static_flows_group_by_sem_type

"""

import os
import sys
import json 
import hashlib
import pandas as pd
import statistics
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule



def main():

	DEBUG = False

	if DEBUG:
		SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final_tempt.csv")
		WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final_tempt.json")
	else:
		SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
		WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")

	webpages_final = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		webpages_final = json.load(fd)


	STATIC_ANALYSIS_SINKS_FILE_NAME = "sinks.out.json"
	STATIC_ANALYSIS_FLOWS_FILE_NAME = "sinks.flows.out.json"



	SINK_TYPES = [
		"new WebSocket()",
		"new EventSource()",
		"XMLHttpRequest.open()",
		"fetch",
		"asyncrequest",
		"$.ajax",
		"XMLHttpRequest.send()",
		"XMLHttpRequest.setRequestHeader()",
		"window.open()",
		"window.location"
	]

	SINK_SEMTYPES = [
		"WR_WEBSOCKET_URL", 
		"WR_EVENTSOURCE_URL",
		"WR_REQ_URL",
		"WR_REQ_BODY",
		"WR_REQ_HEADER",
		"WR_REQ_PARAMS", 
		"WR_WIN_OPEN_URL",
		"WR_WIN_LOC_URL" 
	]

	SOURCE_SEMTYPES = [
		"RD_WIN_LOC",
		"RD_WIN_NAME",
		"RD_DOC_REF",
		"RD_PM",
		"RD_WEB_STORAGE",
		"RD_DOM",
		"RD_COOKIE",
		"REQ_PUSH_SUB"
	]

	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	OUTPUT_FILE = os.path.join(INPUT_DIR, "static_flow_list.json")


	# ---------------------------------- #
	# loop through sites
	# ---------------------------------- #

	chunksize = 10**5
	iteration = 0


	output_data = {}

	for chunk_df in pd.read_csv(SITELIST_FILE, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		iteration = iteration + 1
		LOGGER.info("[CSV] reading chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
		
		for (index, row) in chunk_df.iterrows():
			website_rank = row[0]
			website_url = 'http://' + row[1]
			website_folder_name = utilityModule.getDirectoryNameFromURL(website_url)
			
			website_folder_path_name = os.path.join(constantsModule.DATA_DIR, website_folder_name)
			webpages =  webpages_final[website_folder_name]
			for webpage_folder_name in webpages:
				webpage_folder_path_name = os.path.join(website_folder_path_name, webpage_folder_name)

				sinks_file_path_name = os.path.join(webpage_folder_path_name, STATIC_ANALYSIS_SINKS_FILE_NAME)
				flows_file_path_name = os.path.join(webpage_folder_path_name, STATIC_ANALYSIS_FLOWS_FILE_NAME)

				sinks_file_json_content = {}
				flows_file_json_content = {}
				if os.path.exists(sinks_file_path_name):
					try:
						with open(sinks_file_path_name, 'r') as fd:
							sinks_file_json_content = json.load(fd)
					except:
						LOGGER.warn('JSON file read error: {0}'.format(sinks_file_path_name))

				if os.path.exists(flows_file_path_name):
					try:
						with open(flows_file_path_name, 'r') as fd:
							flows_file_json_content = json.load(fd)
					except:
						LOGGER.warn('JSON file read error: {0}'.format(flows_file_path_name))

							
				if "flows" in flows_file_json_content:
					flows = flows_file_json_content["flows"]
					if len(flows) > 0:

						tempt_count_source_sem_types = {}
						for flow_object in flows:

							semantic_types = flow_object["semantic_types"]
							semantic_types_sinks = [t for t in semantic_types if t in SINK_SEMTYPES]
							semantic_type_sources = [t for t in semantic_types if t in SOURCE_SEMTYPES]

							sink_type = flow_object["sink_type"]

							for source_semantic_type in semantic_type_sources:

								if source_semantic_type in tempt_count_source_sem_types:
									tempt_count_source_sem_types[source_semantic_type] = tempt_count_source_sem_types[source_semantic_type] + 1
								else:
									tempt_count_source_sem_types[source_semantic_type] = 1

						
						if website_folder_name in output_data:
							for source_semantic_type in tempt_count_source_sem_types: 
								if source_semantic_type in output_data[website_folder_name]:
									d = {}
									d[webpage_folder_name] = tempt_count_source_sem_types[source_semantic_type]
									output_data[website_folder_name][source_semantic_type].append(d)
								else:
									d = {}
									d[webpage_folder_name] = tempt_count_source_sem_types[source_semantic_type]
									output_data[website_folder_name][source_semantic_type] = [d]

						else:
							output_data[website_folder_name] = {}
							for source_semantic_type in tempt_count_source_sem_types: 
								d = {}
								d[webpage_folder_name] = tempt_count_source_sem_types[source_semantic_type]
								output_data[website_folder_name][source_semantic_type] = [d]


	with open(OUTPUT_FILE, 'w+') as fd:
		json.dump(output_data, fd, ensure_ascii=False, indent=4)

if __name__ == "__main__":
	main()

