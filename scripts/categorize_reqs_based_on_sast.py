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
	script to analyze the anatomy of request sending instructions and their parameters
	based on the static analysis

	Running:
	------------
	$ python3 -m scripts.categorize_reqs_based_on_sast --static-list=<static_flow_list.json>


"""


import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
from urllib.parse import urlparse



def get_static_pattern_id(flow):
	# TODO
	pass

def main():

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")

	STATIC_FLOW_LIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "static_flow_list.json")


	p = argparse.ArgumentParser(description='script to analyze the anatomy of request sending instructions based on static analysis.')
	p.add_argument('--static-list', "-I",
		  metavar="FILE",
		  default=STATIC_FLOW_LIST_FILE,
		  help='list of sites (default: %(default)s)',
		  type=str)


	args= vars(p.parse_args())
	input_file_name = args["static-list"]


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

	TARGET_SOURCE_SEM_TYPES = [
		"RD_WIN_LOC",
		"RD_WIN_NAME",
		"RD_DOC_REF",
		"RD_PM",
		"REQ_PUSH_SUB"
	]



	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	OUTPUT_PATTERN_STATIC_DIR = os.path.join(constantsModule.OUTPUTS_DIR, os.path.join("patterns", "static"))
	if not os.path.exists(OUTPUT_PATTERN_STATIC_DIR):
		os.makedirs(OUTPUT_PATTERN_STATIC_DIR)

	WEBPAGES_FINAL = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		WEBPAGES_FINAL = json.load(fd)


	STATIC_FLOW_LIST = {}
	with open(input_file_name, 'r') as fd:
		STATIC_FLOW_LIST = json.load(fd)


	patterns = {} 		# pattern_id -> flows_count
	patterns_wb = {}	# pattern_id -> list_webpages
	patterns_ws = {}	# pattern_id -> list_websites


	SAST_FLOWS_FILE_NAME = "sinks.flows.out.json" # length of the key "flows" > 0
	SAST_SINKS_FILE_NAME =  "sinks.out.json" # length of the key "sinks" > 0


	for website in STATIC_FLOW_LIST:
		source_sem_types = WEBPAGES_FINAL[website]
		for source_sem_type in source_sem_types:
			if source_sem_type in TARGET_SOURCE_SEM_TYPES:
				webpages = WEBPAGES_FINAL[website][source_sem_type]		
				for webpage in webpages:
					website_webpage_folder = os.path.join(website, webpage)
					website_webpage_folder_abs = os.path.join(constantsModule.DATA_DIR, website_webpage_folder)
					if os.path.exists(website_webpage_folder_abs):
						flows_file_path_name = os.path.join(website_webpage_folder_abs, SAST_FLOWS_FILE_NAME)
						if os.path.exists(flows_file_path_name):


							flows_file_json_content = {}
							if os.path.exists(flows_file_path_name):
								try:
									with open(flows_file_path_name, 'r') as fd:
										flows_file_json_content = json.load(fd)
								except:
									LOGGER.warn('JSON file read error: {0}'.format(flows_file_path_name))

										
							if "flows" in flows_file_json_content:
								flows = flows_file_json_content["flows"]
								if len(flows) > 0:
									for flow_index in range(len(flows)):
										flow = flows[flow_index]
										pattern_id = get_static_pattern_id(flow)

										if pattern_id in patterns:
											patterns[pattern_id] = patterns[pattern_id] + 1
										else:
											patterns[pattern_id] = 1

										if pattern_id in patterns_wb:
											patterns_wb[pattern_id].add(website_webpage_folder)
										else:
											patterns_wb[pattern_id] = set()
											patterns_wb[pattern_id].add(website_webpage_folder)

										if pattern_id in patterns_ws:
											patterns_ws[pattern_id].add(website)
										else:
											patterns_ws[pattern_id] = set()
											patterns_ws[pattern_id].add(website)


	for p in patterns_ws:
		patterns_ws[p] = list(patterns_ws[p])

	for p in patterns_wb:
		patterns_wb[p] = list(patterns_wb[p])

	patterns_overall_count = {}
	for pattern_id in patterns:
		n_flows = patterns[pattern_id]
		n_pages = len(patterns_wb[pattern_id])
		n_sites = len(patterns_ws[pattern_id])
		patterns_overall_count[pattern_id] = [n_flows, n_pages, n_sites]


	with open(os.path.join(OUTPUT_PATTERN_STATIC_DIR, "static_patterns_flow_count.json"), 'w+') as fd:
		json.dump(patterns, fd, ensure_ascii=False, indent=4)

	with open(os.path.join(OUTPUT_PATTERN_STATIC_DIR, "static_patterns_webpage_mapping.json"), 'w+') as fd:
		json.dump(patterns_wb, fd, ensure_ascii=False, indent=4)

	with open(os.path.join(OUTPUT_PATTERN_STATIC_DIR, "static_patterns_website_mapping.json"), 'w+') as fd:
		json.dump(patterns_ws, fd, ensure_ascii=False, indent=4)

	with open(os.path.join(OUTPUT_PATTERN_STATIC_DIR, "static_patterns_overview.json"), 'w+') as fd:
		json.dump(patterns_overall_count, fd, ensure_ascii=False, indent=4)

