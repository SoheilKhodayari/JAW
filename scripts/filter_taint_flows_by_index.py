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
	filters taint flows to the ones where the taint character in the sink starts at position/index zero. 

	Running:
	------------
	$ python3 -m scripts.filter_taint_flows_by_index

"""



import os
import sys
import json 
import hashlib
import pandas as pd
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule

def main():

	# specifes which taintflow file to consider as the input
	# 1. taint flow files that only consider top level frame flows (filtered)
	# 2. taint flow files with both top-level and iframe flows
	PROCESS_TOP_LEVEL_FRAMES_ONLY = True

	# only count the already filtered taintflows from each webpage folder and aggregate
	# set this to false to also filter the taintflows in each webpage folder, and then count
	COUNT_ONLY = True 

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")


	webpages_final = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		webpages_final = json.load(fd)

	### DEBUG
	# webpages_final["http-127.0.0.1-6789-neo4j2"] = [
	# 	"349f0c2604b941d7740d1a2d37eb3dea7230dd307d9ae8783537efb9d233a6d2"
	# ]

	SINK_TYPES = [
		'websocket_url',
		'websocket_data',
		'eventsource_url',
		'fetch_url',
		'fetch_data',
		'xmlhttprequest_url',
		'xmlhttprequest_data',
		'xmlhttprequest_sethdr',
		'window.open',
		'loc_assign',
		'script_src'
	]
	SOURCE_TYPES = [
		'loc_href',
		'loc_hash',
		'loc_search',
		'win_name',
		'doc_referrer',
		'doc_baseuri',
		'doc_uri',
		'message_evt', # this is the new push_message data name
		# 'push_message',
		'pushsub_endpoint'
	]

	SOURCE_TYPES_FULLNAME_MAP = {
		"loc_hash": "location.hash",
		"win_name": "window.name",
		"loc_href": "location.href",
		"loc_search": "location.search",
		"doc_referrer": "document.referrer",
		"doc_baseuri": "document.baseURI",
		"doc_uri": "document.documentURI",
		"pushsub_endpoint": "PushSubscription.endpoint" ,
		"message_evt": "MessageEvent" ,
		"push_message": "PushMessageData"
	}


	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	for sink in SINK_TYPES:
		for source in SOURCE_TYPES:


			if PROCESS_TOP_LEVEL_FRAMES_ONLY:
				taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_topframe.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
				topframe_taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_topframe_0.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
			else:
				taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
				topframe_taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_0.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)


			filtered_taintflows_count = {}

			if os.path.exists(taintflow_count_file_path_name):
				fd =  open(taintflow_count_file_path_name, 'r')
				json_content = json.load(fd)
				fd.close()			

				for website in json_content:
					if website in webpages_final:
						tainted_webpages = json_content[website]
						for webpage in tainted_webpages:
							top50_webpages = webpages_final[website]
							if webpage in top50_webpages:

								directory = os.path.join(os.path.join(constantsModule.DATA_DIR, website), webpage)
								
								if PROCESS_TOP_LEVEL_FRAMES_ONLY:
									taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}_topframe.json'.format(directory.rstrip('/'), source, sink)
									new_taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}_topframe_0.json'.format(directory.rstrip('/'), source, sink)
								else:
									taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}.json'.format(directory.rstrip('/'), source, sink)
									new_taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}_0.json'.format(directory.rstrip('/'), source, sink)



								if COUNT_ONLY:
									# only count the already filtered taintflows from each webpage folder and aggregate
									if os.path.exists(new_taintflow_file_path_name):
										with open(new_taintflow_file_path_name, 'r') as fd:
											taintflows_list = json.load(fd)
											if len(taintflows_list) > 0:
												if website in filtered_taintflows_count:
													filtered_taintflows_count[website][webpage] = len(taintflows_list) 
												else:
													filtered_taintflows_count[website] = {}
													filtered_taintflows_count[website][webpage] = len(taintflows_list) 

								else:
									filtered_taintflows = []
									if os.path.exists(taintflow_file_path_name):
										with open(taintflow_file_path_name, 'r') as fd:
											taintflows_list = json.load(fd)
											for dataflow in taintflows_list:
												taints = dataflow["taint"]
												dataflow_sources = dataflow["sources"]
												full_source_name = SOURCE_TYPES_FULLNAME_MAP[source]
												if full_source_name in dataflow_sources:
													index = dataflow_sources.index(full_source_name)
													if index >= len(taints):
														index = -1 # pick the last element
													target_taintflow = taints[index]
													controllable_parts_beginning = target_taintflow["begin"]
													zero = 0
													if zero in controllable_parts_beginning:
														filtered_taintflows.append(dataflow)

										with open(new_taintflow_file_path_name, 'w+') as fd:
											json.dump(filtered_taintflows, fd, ensure_ascii=False, indent=4)

										if website in filtered_taintflows_count:
											filtered_taintflows_count[website][webpage] = len(filtered_taintflows) 
										else:
											filtered_taintflows_count[website] = {}
											filtered_taintflows_count[website][webpage] = len(filtered_taintflows) 

				with open(topframe_taintflow_count_file_path_name, 'w+') as fd:
					json.dump(filtered_taintflows_count, fd, ensure_ascii=False, indent=4)



if __name__ == "__main__":
	main()




