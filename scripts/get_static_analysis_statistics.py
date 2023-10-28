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
	collects statistics about the results of static analysis

	Running:
	------------
	$ python3 -m scripts.get_static_analysis_statistics

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

def has_a_truthy_dict_value(obj):
	for key in obj:
		if obj[key] == True:
			return True
	return False


def get_total_count_flows(flow_stats_by_semtype, source, sink):
	count = 0
	for website in flow_stats_by_semtype:
		tempt = flow_stats_by_semtype[website]
		if sink in tempt:
			if source in tempt[sink]:
				count += tempt[sink][source]

	return count

def get_total_count_flows_per_page(flow_stats_by_semtype, source, sink):
	count = 0
	for website in flow_stats_by_semtype:
		tempt = flow_stats_by_semtype[website]
		if sink in tempt:
			if source in tempt[sink]:
				count += len(tempt[sink][source])

	return count

def get_total_count_flows_per_site(flow_stats_by_semtype, source, sink):
	count = 0
	for website in flow_stats_by_semtype:
		tempt = flow_stats_by_semtype[website]
		if sink in tempt:
			if source in tempt[sink]:
				count += tempt[sink][source]

	return count
	
def stringify(list):
	return [str(item) for item in list]

def main():

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")

	webpages_final = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		webpages_final = json.load(fd)


	STATIC_ANALYSIS_SINKS_FILE_NAME = "sinks.out.json"
	STATIC_ANALYSIS_FLOWS_FILE_NAME = "sinks.flows.out.json"

	# total number of sinks / flows 
	## dict[website][sink_type] = count
	sink_stats = {} 
	sink_stats_taintable = {}
	## dict[website][sink_type][source_semtype] = count
	flow_stats = {}

	# total number of webpages having sinks / flows
	sink_stats_webpage = {}
	sink_stats_taintable_webpage = {}
	flow_stats_webpage = {}

	# total number of websites having sinks / flows
	sink_stats_website = {}
	sink_stats_taintable_website = {}
	flow_stats_website = {}

	# total number of sinks / flows abstracted (representation) by semantic types
	## dict[website][sink_semtype] = count
	sink_stats_by_semtype = {} 		
	sink_stats_taintable_by_semtype = {}
	## dict[website][sink_semtype][source_semtype] = count
	flow_stats_by_semtype = {}

	# total number of webpages having sinks / flows abstracted (representation) by semantic types
	sink_stats_webpage_by_semtype = {}
	sink_stats_taintable_webpage_by_semtype = {}
	flow_stats_webpage_by_semtype = {}

	# total number of websites having sinks / flows abstracted (representation) by semantic types
	sink_stats_website_by_semtype = {}
	sink_stats_taintable_website_by_semtype = {}
	flow_stats_website_by_semtype = {}




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
	OUTPUT_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "tempt")
	if not os.path.exists(OUTPUT_TEMPT_DIR):
		os.makedirs(OUTPUT_TEMPT_DIR)


	# ---------------------------------- #
	# loop through sites
	# ---------------------------------- #

	chunksize = 10**5
	iteration = 0

	sast_dataflows = []

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



				if "sinks" in sinks_file_json_content:
					sinks = sinks_file_json_content["sinks"]
					if len(sinks) > 0:					
						for sink_object in sinks:

							sink_type = sink_object["sink_type"]
							
							if website_folder_name in sink_stats:
								if sink_type in sink_stats[website_folder_name]:
									sink_stats[website_folder_name][sink_type] = sink_stats[website_folder_name][sink_type] + 1
									sink_stats_webpage[website_folder_name][sink_type].add(webpage_folder_name)
								else:
									sink_stats[website_folder_name][sink_type] = 1
									sink_stats_webpage[website_folder_name][sink_type] = set()
									sink_stats_webpage[website_folder_name][sink_type].add(webpage_folder_name)

							else:
								# encountering the first sink of the website
								sink_stats[website_folder_name] = {}
								sink_stats[website_folder_name][sink_type] = 1

								sink_stats_webpage[website_folder_name] = {}
								sink_stats_webpage[website_folder_name][sink_type] = set()
								sink_stats_webpage[website_folder_name][sink_type].add(webpage_folder_name)

								sink_stats_website[website_folder_name] = {}
								sink_stats_website[website_folder_name][sink_type] = 1


							if has_a_truthy_dict_value(sink_object["taint_possibility"]):

								if website_folder_name in sink_stats_taintable:
									if sink_type in sink_stats_taintable[website_folder_name]:
										sink_stats_taintable[website_folder_name][sink_type] = sink_stats_taintable[website_folder_name][sink_type] + 1
										sink_stats_taintable_webpage[website_folder_name][sink_type].add(webpage_folder_name)
									else:
										sink_stats_taintable[website_folder_name][sink_type] = 1
										sink_stats_taintable_webpage[website_folder_name][sink_type] = set()
										sink_stats_taintable_webpage[website_folder_name][sink_type].add(webpage_folder_name)

								else:
									# encountering the first sink of the website
									sink_stats_taintable[website_folder_name] = {}
									sink_stats_taintable[website_folder_name][sink_type] = 1

									sink_stats_taintable_webpage[website_folder_name] = {}
									sink_stats_taintable_webpage[website_folder_name][sink_type] = set()
									sink_stats_taintable_webpage[website_folder_name][sink_type].add(webpage_folder_name)

									sink_stats_taintable_website[website_folder_name] = {}
									sink_stats_taintable_website[website_folder_name][sink_type] = 1


							sink_semantic_types = sink_object["semantic_types"]
							for semantic_type in sink_semantic_types:

								if website_folder_name in sink_stats_by_semtype:
									if semantic_type in sink_stats_by_semtype[website_folder_name]:
										sink_stats_by_semtype[website_folder_name][semantic_type] = sink_stats_by_semtype[website_folder_name][semantic_type] + 1
										sink_stats_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)
									else:
										sink_stats_by_semtype[website_folder_name][semantic_type] = 1
										sink_stats_webpage_by_semtype[website_folder_name][semantic_type] = set()
										sink_stats_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)

								else:
									# encountering the first sink of the website
									sink_stats_by_semtype[website_folder_name] = {}
									sink_stats_by_semtype[website_folder_name][semantic_type] = 1

									sink_stats_webpage_by_semtype[website_folder_name] = {}
									sink_stats_webpage_by_semtype[website_folder_name][semantic_type] = set()
									sink_stats_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)

									sink_stats_website_by_semtype[website_folder_name] = {}
									sink_stats_website_by_semtype[website_folder_name][semantic_type] = 1


								if sink_object["taint_possibility"][semantic_type] == True:

									if website_folder_name in sink_stats_taintable_by_semtype:
										if semantic_type in sink_stats_taintable_by_semtype[website_folder_name]:
											sink_stats_taintable_by_semtype[website_folder_name][semantic_type] = sink_stats_taintable_by_semtype[website_folder_name][semantic_type] + 1
											sink_stats_taintable_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)
										else:
											sink_stats_taintable_by_semtype[website_folder_name][semantic_type] = 1
											sink_stats_taintable_webpage_by_semtype[website_folder_name][semantic_type] = set()
											sink_stats_taintable_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)

									else:
										# encountering the first sink of the website
										sink_stats_taintable_by_semtype[website_folder_name] = {}
										sink_stats_taintable_by_semtype[website_folder_name][semantic_type] = 1

										sink_stats_taintable_webpage_by_semtype[website_folder_name] = {}
										sink_stats_taintable_webpage_by_semtype[website_folder_name][semantic_type] = set()
										sink_stats_taintable_webpage_by_semtype[website_folder_name][semantic_type].add(webpage_folder_name)

										sink_stats_taintable_website_by_semtype[website_folder_name] = {}
										sink_stats_taintable_website_by_semtype[website_folder_name][semantic_type] = 1


				if "flows" in flows_file_json_content:
					flows = flows_file_json_content["flows"]
					if len(flows) > 0:
						for flow_object in flows:

							semantic_types = flow_object["semantic_types"]

							sink_type = flow_object["sink_type"]
							semantic_types_sinks = [t for t in semantic_types if t in SINK_SEMTYPES]
							semantic_type_sources = [t for t in semantic_types if t in SOURCE_SEMTYPES]


							for source_semantic_type in semantic_type_sources:
								if website_folder_name in flow_stats:
									if sink_type in flow_stats[website_folder_name]:
										if source_semantic_type in flow_stats[website_folder_name][sink_type]:
											flow_stats[website_folder_name][sink_type][source_semantic_type] = flow_stats[website_folder_name][sink_type][source_semantic_type] + 1
											flow_stats_webpage[website_folder_name][sink_type][source_semantic_type].add(webpage_folder_name)
										else:
											flow_stats[website_folder_name][sink_type][source_semantic_type] = 1
											flow_stats_webpage[website_folder_name][sink_type][source_semantic_type] = set()
											flow_stats_webpage[website_folder_name][sink_type][source_semantic_type].add(webpage_folder_name)
									else:

										flow_stats[website_folder_name][sink_type] = {}
										flow_stats[website_folder_name][sink_type][source_semantic_type] = 1

										flow_stats_webpage[website_folder_name][sink_type] = {}
										flow_stats_webpage[website_folder_name][sink_type][source_semantic_type] = set()
										flow_stats_webpage[website_folder_name][sink_type][source_semantic_type].add(webpage_folder_name)

								else:
									flow_stats[website_folder_name] = {}
									flow_stats[website_folder_name][sink_type] = {}
									flow_stats[website_folder_name][sink_type][source_semantic_type] = 1

									flow_stats_webpage[website_folder_name] = {}
									flow_stats_webpage[website_folder_name][sink_type] = {}
									flow_stats_webpage[website_folder_name][sink_type][source_semantic_type] = set()
									flow_stats_webpage[website_folder_name][sink_type][source_semantic_type].add(webpage_folder_name)

									flow_stats_website[website_folder_name] = {}
									flow_stats_website[website_folder_name][sink_type] = {}				
									flow_stats_website[website_folder_name][sink_type][source_semantic_type] = 1


							for sink_semantic_type in semantic_types_sinks:
								for source_semantic_type in semantic_type_sources:
									if website_folder_name in flow_stats_by_semtype:
										if sink_semantic_type in flow_stats_by_semtype[website_folder_name]:
											if source_semantic_type in flow_stats_by_semtype[website_folder_name][sink_semantic_type]:
												flow_stats_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = flow_stats_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] + 1
												flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type].add(webpage_folder_name)
											else:
												flow_stats_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = 1
												flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = set()
												flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type].add(webpage_folder_name)
									
										else:

											flow_stats_by_semtype[website_folder_name][sink_semantic_type] = {}
											flow_stats_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = 1

											flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type] = {}
											flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = set()
											flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type].add(webpage_folder_name)	

									else:

										flow_stats_by_semtype[website_folder_name] = {}
										flow_stats_by_semtype[website_folder_name][sink_semantic_type] = {}
										flow_stats_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = 1

										flow_stats_webpage_by_semtype[website_folder_name] = {}
										flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type] = {}
										flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = set()
										flow_stats_webpage_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type].add(webpage_folder_name)	

										flow_stats_website_by_semtype[website_folder_name] = {}
										flow_stats_website_by_semtype[website_folder_name][sink_semantic_type] = {}				
										flow_stats_website_by_semtype[website_folder_name][sink_semantic_type][source_semantic_type] = 1


			# export results per site here
			row_sinks = []
			if website_folder_name in sink_stats:
				for sink_type in SINK_TYPES:
					if sink_type in sink_stats[website_folder_name]:
						count = sink_stats[website_folder_name][sink_type]
						row_sinks.append(count)
					else:
						row_sinks.append(0)
			else:
				row_sinks = row_sinks + [0] * len(SINK_TYPES)

			if website_folder_name in sink_stats_taintable:
				for sink_type in SINK_TYPES:
					if sink_type in sink_stats_taintable[website_folder_name]:
						count = sink_stats_taintable[website_folder_name][sink_type]
						row_sinks.append(count)
					else:
						row_sinks.append(0)
			else:
				row_sinks = row_sinks + [0] * len(SINK_TYPES)


			if website_folder_name in sink_stats_webpage:
				for sink_type in SINK_TYPES:
					if sink_type in sink_stats_webpage[website_folder_name]:
						count = len(sink_stats_webpage[website_folder_name][sink_type])
						row_sinks.append(count)
					else:
						row_sinks.append(0)
			else:
				row_sinks = row_sinks + [0] * len(SINK_TYPES)

			if website_folder_name in sink_stats_taintable_webpage:
				for sink_type in SINK_TYPES:
					if sink_type in sink_stats_taintable_webpage[website_folder_name]:
						count = len(sink_stats_taintable_webpage[website_folder_name][sink_type])
						row_sinks.append(count)
					else:
						row_sinks.append(0)
			else:
				row_sinks = row_sinks + [0] * len(SINK_TYPES)


			row_flows = []
			if website_folder_name in flow_stats:
				for sink_type in SINK_TYPES:
					if sink_type in flow_stats[website_folder_name]:
						count = flow_stats[website_folder_name][sink_type]
						row_flows.append(count)
					else:
						row_flows.append(0)
			else:
				row_flows = [0] * len(SINK_TYPES)

			if website_folder_name in flow_stats_webpage:
				for sink_type in SINK_TYPES:
					if sink_type in flow_stats_webpage[website_folder_name]:
						count = len(flow_stats_webpage[website_folder_name][sink_type])
						row_flows.append(count)
					else:
						row_flows.append(0)
			else:
				row_flows = [0] * len(SINK_TYPES)


			row_data = row_sinks + row_flows
			row_data_string = "\t".join(stringify(row_data))
			sast_dataflows.append(row_data_string)

	# export per site data flows
	with open(os.path.join(OUTPUT_TEMPT_DIR, "sast_dataflow_sites.out"), 'w+') as fd:
		for row in sast_dataflows:
			fd.write(row+ '\n')


	# export dataflow matrix 
	matrix = []
	matrix_page = []
	matrix_site = []
	for source in SOURCE_SEMTYPES:
		row = []
		row_page = []
		row_site = []
		for sink in SINK_SEMTYPES:
			a = get_total_count_flows(flow_stats_by_semtype, source, sink)
			b = get_total_count_flows_per_page(flow_stats_webpage_by_semtype, source, sink)
			c = get_total_count_flows_per_site(flow_stats_website_by_semtype, source, sink)
			row.append(a)
			row_page.append(b)
			row_site.append(c)

		row = "\t".join(stringify(row))
		row_page = "\t".join(stringify(row_page))
		row_site = "\t".join(stringify(row_site))
		matrix.append(row)
		matrix_page.append(row_page)
		matrix_site.append(row_site)

	with open(os.path.join(OUTPUT_TEMPT_DIR, "sast_dataflow_matrix.out"), 'w+') as fd:
		for row in matrix:
			fd.write(row+'\n')

		fd.write('\n\n')
		for row in matrix_page:
			fd.write(row+'\n')
		
		fd.write('\n\n')
		for row in matrix_site:
			fd.write(row+'\n')
		

if __name__ == "__main__":
	main()

