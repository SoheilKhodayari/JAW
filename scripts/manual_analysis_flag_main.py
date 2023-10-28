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
	flag candiate sites for manual analysis

	inputs:
		static_flow_list.json: list of all sites with sast results
		site_req_pattern_mapping.json: list of all sites with dast results

		outputs:
			site_req_pattern_mapping_dast_final.json
		
			static_flow_list_final.json (data flows)
			static_flow_list_final_pages.json (web pages )

			mixed_flow_list_final.json (data flows)
			mixed_flow_list_final_pages.json (web pages )

	Running:
	------------
	$ python3 -m scripts.manual_analysis_flag_main

"""

import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
from urllib.parse import urlparse
import numpy as np

def is_in_json(json_content, website, webpage):
	if website in json_content:
		if webpage in json_content[website]:
			return True

	return False

def get_sites_from_webpage_list(webpage_list):
	sites = set()
	for webpage in webpage_list:
		parts = webpage.split('/')
		site = parts[0]
		sites.add(site)
	return list(sites)

def get_pages_of_sites(selected_sites, all_webpages):
	selected_pages = set()
	for site in selected_sites:
		for page in all_webpages:
			if page.startswith(site):
				selected_pages.add(page)
	return list(selected_pages)

def main():	

	PICK_DAST_PAGES_FLAG = False
	PICK_SAST_PAGES_FLAG = True
	LOCAL = True

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")
	if LOCAL:
		WEBPAGE_REQ_PATTERNS_FILE = os.path.join(constantsModule.OUTPUTS_DIR, "site_req_pattern_mapping.json")
		STATIC_FLOW_LIST_FILE = os.path.join(constantsModule.OUTPUTS_DIR, "static_flow_list.json")
	else:
		WEBPAGE_REQ_PATTERNS_FILE = os.path.join(os.path.join(constantsModule.OUTPUTS_DIR, "patterns"), "site_req_pattern_mapping.json")
		STATIC_FLOW_LIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "static_flow_list.json")

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
		'message_evt',
		'pushsub_endpoint'
	]

	TARGET_SOURCE_SEM_TYPES = [
		"RD_WIN_LOC",
		"RD_WIN_NAME",
		"RD_DOC_REF",
		"RD_PM",
		"REQ_PUSH_SUB"
	]

	OUTPUT_DIR = constantsModule.OUTPUTS_DIR
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	OUTPUT_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "tempt")
	if not os.path.exists(OUTPUT_TEMPT_DIR):
		os.makedirs(OUTPUT_TEMPT_DIR)

	WEBPAGES_FINAL = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		WEBPAGES_FINAL = json.load(fd)


	WEBPAGE_REQ_PATTERNS = {}
	with open(WEBPAGE_REQ_PATTERNS_FILE, 'r') as fd:
		WEBPAGE_REQ_PATTERNS = json.load(fd)

	STATIC_FLOW_LIST = []
	with open(STATIC_FLOW_LIST_FILE, 'r') as fd:
		STATIC_FLOW_LIST = json.load(fd)

	# current stat
	flows_total = 292750
	flows_dynamic = 167582
	flows_mixed = 40452
	flows_static = 84716
	flows_dynamic_pick = flows_dynamic
	flows_static_pick = flows_static + flows_mixed

	webpages_total = 20956
	webpages_dynamic = 11589
	webpages_mixed = 3281
	webpages_static = 11382
	webpages_dynamic_pick = webpages_dynamic
	webpages_static_pick = webpages_static + webpages_mixed

	websites_total = 1526
	websites_dynamic = 1401
	websites_mixed = 242
	websites_static = 1254
	websites_dynamic_pick = websites_dynamic
	websites_static_pick = websites_static + websites_mixed

	flows_dynamic_counter = 0
	flows_static_counter = 0
	webpages_dynamic_counter = 0
	webpages_static_counter = 0
	websites_dynamic_counter = 0
	websites_static_counter = 0

	SAST_FLOWS_FILE_NAME = "sinks.flows.out.json" # length of the key "flows" > 0
	SAST_SINKS_FILE_NAME =  "sinks.out.json" # length of the key "sinks" > 0

	target_patterns = [
		"0_0_0_0_0_0_1_0_0_0_0_0",
		"0_0_0_0_0_0_0_0_0_0_1_0",
		"0_0_0_0_1_0_0_0_0_0_0_0",
		"0_0_0_0_0_0_0_0_0_0_0_1",
		"0_0_1_1_0_0_0_0_0_0_0_0",
		"1_1_1_1_1_1_0_0_0_0_0_0",
		"1_1_1_1_0_0_0_0_0_0_0_0",
		"0_0_1_0_0_0_0_0_0_0_0_0",
		"1_1_1_1_1_1_1_1_1_1_0_0",
		"0_0_0_0_0_0_1_0_1_1_0_0",
		"1_1_1_1_1_1_1_1_0_0_0_0",
		"0_0_0_0_1_1_0_0_0_0_0_0",
		"0_0_0_0_0_0_1_1_0_0_0_0",
		"0_0_1_1_1_1_0_0_0_0_0_0",
		"0_0_1_1_0_0_1_1_0_0_0_0",
		"1_1_1_1_1_1_0_0_1_1_0_0",
		"0_0_1_1_1_1_1_1_0_0_0_0",
		"1_1_1_1_0_0_0_0_1_0_0_0",
		"0_0_0_0_1_0_1_1_0_0_0_0",
		"1_1_0_0_1_0_0_0_0_0_0_0",
		"1_1_1_0_0_0_0_0_0_0_0_0",
		"0_0_0_0_1_1_1_1_0_0_0_0",
		"1_1_1_0_1_0_0_0_0_0_0_0",
		"1_1_0_0_1_1_0_0_0_0_0_0",
		"1_1_0_0_1_0_0_0_1_1_0_0",
		"1_1_1_0_1_0_1_1_0_0_0_0",
		"1_1_0_0_1_1_1_1_0_0_0_0",
		"0_0_1_1_1_1_0_0_1_1_0_0",
		"1_1_1_1_0_0_0_0_1_1_0_0"
	]

	dast_stat = [
		# flows, pages, sites
		[91155, 8521, 798],
		[63596, 7478, 642],
		[6459, 1570, 141],
		[521, 360, 45],
		[648, 84, 10],
		[1013, 329, 61],
		[440, 88, 11],
		[339, 62, 4],
		[1952, 1008, 126],
		[149, 52, 5],
		[781, 154, 32],
		[228, 106, 15],
		[63, 40, 7],
		[44, 38, 6],
		[12, 8, 2],
		[58, 49, 15],
		[75, 29, 12],
		[6, 6, 1],
		[4, 1, 1],
		[11, 1, 1],
		[7, 1, 1],
		[6, 6, 1],
		[4, 4, 2],
		[3, 3, 1],
		[2, 2, 1],
		[2, 1, 1],
		[2, 2, 1],
		[1, 1, 1],
		[1, 1, 1]
	]

	body_pattern = 	"0_0_0_0_0_0_0_0_0_0_1_0"
	query_pattern = "0_0_0_0_0_0_1_0_0_0_0_0"
	header_pattern = "0_0_0_0_0_0_0_0_0_0_0_1"

	def pick_dast_pages():
		DAST_OUTPUT = {} # pattern id -> website-webpage-hash

		# pick the dast pages
		for idx in range(len(target_patterns)):
			pattern_id = target_patterns[idx]
			dast_stat_entry = dast_stat[idx]

			n_sites = dast_stat_entry[2]
			n_pages = dast_stat_entry[1]
			n_flows = dast_stat_entry[0]

			if pattern_id in WEBPAGE_REQ_PATTERNS:
				print('starting pattern id')
				webpages_with_pattern_id = WEBPAGE_REQ_PATTERNS[pattern_id]
				all_sites = get_sites_from_webpage_list(webpages_with_pattern_id)

				correct_sample = False
				looped = False
				while not correct_sample:
					print('sampling')
					if n_sites > len(all_sites):
						selected_sites = all_sites
					else:
						selected_sites = list(np.random.choice(all_sites, n_sites, replace=False))
					pages_of_selected_sites = get_pages_of_sites(selected_sites, webpages_with_pattern_id)
					
					if len(pages_of_selected_sites) >= n_pages:
						correct_sample = True
						selected_pages = list(np.random.choice(pages_of_selected_sites, n_pages, replace=False))
						DAST_OUTPUT[pattern_id] = selected_pages
					else:
						print('sample is not corret, loop')
						if looped:
							correct_sample = True
							selected_pages = pages_of_selected_sites
							DAST_OUTPUT[pattern_id] = selected_pages
						looped = True


		with open(os.path.join(OUTPUT_TEMPT_DIR, "site_req_pattern_mapping_dast_final.json"), 'w+') as fd: # store in pattern dir in the server
			json.dump(DAST_OUTPUT, fd, ensure_ascii=False, indent=4)


	###
	# pick sast pages
	SAST_OUTPUT = {}
	# pick sast-dast mixed pages
	MIXED_OUTPUT = {}

	def pick_sast_pages():
			
		# remove empty site entries and focus on the dataflows with a relevant source sem type
		sast_flow_list = {} # website-webpage-hash -> n_flows (aggregated over different source semtypes that were relevant)
		websites_list = {} # website -> n_flows (aggregated)
 
		for ws in STATIC_FLOW_LIST:
			for semtype in STATIC_FLOW_LIST[ws]:
				if semtype in TARGET_SOURCE_SEM_TYPES:
					webpages_dict_list = STATIC_FLOW_LIST[ws][semtype]
					for webpage_dict in webpages_dict_list:
						webpage = list(webpage_dict.keys())[0]
						key = os.path.join(ws, webpage)
						value = webpage_dict[webpage]
						if key in sast_flow_list:
							sast_flow_list[key] = sast_flow_list[key] + value
						else:
							sast_flow_list[key] = value

						if ws in websites_list:
							websites_list[ws] = websites_list[ws] + value
						else:
							websites_list[ws] = value

		## pick the websites first according to the number of flows here
		weight_sites =  np.array([websites_list[x] for x in websites_list])
		weight_sites = weight_sites / weight_sites.sum() # normalize weights
		selected_sites = list(np.random.choice(list(websites_list.keys()), websites_static + websites_mixed, replace=False, p=weight_sites))

		sast_selected_sites = selected_sites[:websites_static]
		mixed_selected_sites = selected_sites[websites_static:]
		assert len(mixed_selected_sites) == websites_mixed

		print("sast_selected_sites", len(set(sast_selected_sites)))
		print("mixed_selected_sites", len(set(mixed_selected_sites)))
		# filter sast_flow_list to only those of selected sites
		sast_flow_list_filtered = {}
		mixed_flow_list_filtered = {}
		for website_webpage_hash in sast_flow_list:
			ws = website_webpage_hash.split('/')[0]
			if ws in sast_selected_sites:
				sast_flow_list_filtered[website_webpage_hash] = sast_flow_list[website_webpage_hash]
			if ws in mixed_selected_sites:
				mixed_flow_list_filtered[website_webpage_hash] = sast_flow_list[website_webpage_hash]

		## then pick the webpages
		## pick according to the weight of the pages
		weight_pages_sast = np.array([sast_flow_list_filtered[x] for x in sast_flow_list_filtered])
		weight_pages_sast = weight_pages_sast / weight_pages_sast.sum() 
		sast_selected_pages = list(np.random.choice(list(sast_flow_list_filtered.keys()), webpages_static, replace=False, p=weight_pages_sast))

		weight_pages_mixed = np.array([mixed_flow_list_filtered[x] for x in mixed_flow_list_filtered])
		weight_pages_mixed = weight_pages_mixed / weight_pages_mixed.sum() 
		mixed_selected_pages = list(np.random.choice(list(mixed_flow_list_filtered.keys()), webpages_mixed, replace=False, p=weight_pages_mixed))
		
		print("sast_selected_pages", len(set(sast_selected_pages)))
		print("mixed_selected_pages", len(set(mixed_selected_pages)))


		with open(os.path.join(OUTPUT_TEMPT_DIR, "static_flow_list_final_pages.json"), 'w+') as fd:  # store in input dir in the server
			json.dump(sast_selected_pages, fd, ensure_ascii=False, indent=4)

		with open(os.path.join(OUTPUT_TEMPT_DIR, "mixed_flow_list_final_pages.json"), 'w+') as fd:
			json.dump(mixed_selected_pages, fd, ensure_ascii=False, indent=4)


		## TODO: there appear to be a bug here in the export below? bc the numbers do not match between the json files above and below
		for selected_page in sast_selected_pages:
			[ws, wb] = selected_page.split('/')
			for semtype in STATIC_FLOW_LIST[ws]:
				if semtype in TARGET_SOURCE_SEM_TYPES:
					webpages_dict_list = STATIC_FLOW_LIST[ws][semtype]
					for webpage_dict in webpages_dict_list:
						webpage = list(webpage_dict.keys())[0]
						value = webpage_dict[webpage]	
						if wb == webpage:
							if ws in SAST_OUTPUT:
								if semtype in SAST_OUTPUT[ws]:
									SAST_OUTPUT[ws][semtype][wb] = value	
								else:
									SAST_OUTPUT[ws][semtype] = {}
									SAST_OUTPUT[ws][semtype][wb] = value	
							else:
								SAST_OUTPUT[ws] = {}
								SAST_OUTPUT[ws][semtype] = {}
								SAST_OUTPUT[ws][semtype][wb] = value

		for selected_page in mixed_selected_pages:
			[ws, wb] = selected_page.split('/')
			for semtype in STATIC_FLOW_LIST[ws]:
				if semtype in TARGET_SOURCE_SEM_TYPES:
					webpages_dict_list = STATIC_FLOW_LIST[ws][semtype]
					for webpage_dict in webpages_dict_list:
						webpage = list(webpage_dict.keys())[0]
						value = webpage_dict[webpage]	
						if wb == webpage:
							if ws in MIXED_OUTPUT:
								if semtype in MIXED_OUTPUT[ws]:
									MIXED_OUTPUT[ws][semtype][wb] = value	
								else:
									MIXED_OUTPUT[ws][semtype] = {}
									MIXED_OUTPUT[ws][semtype][wb] = value	
							else:
								MIXED_OUTPUT[ws] = {}
								MIXED_OUTPUT[ws][semtype] = {}
								MIXED_OUTPUT[ws][semtype][wb] = value

		print(len(SAST_OUTPUT))
		print(len(MIXED_OUTPUT))

		with open(os.path.join(OUTPUT_TEMPT_DIR, "static_flow_list_final.json"), 'w+') as fd:  # store in input dir in the server
			json.dump(SAST_OUTPUT, fd, ensure_ascii=False, indent=4)

		with open(os.path.join(OUTPUT_TEMPT_DIR, "mixed_flow_list_final.json"), 'w+') as fd:
			json.dump(MIXED_OUTPUT, fd, ensure_ascii=False, indent=4)

	
	if PICK_DAST_PAGES_FLAG:
		pick_dast_pages()

	if PICK_SAST_PAGES_FLAG:
		pick_sast_pages()


if __name__ == "__main__":
	print('started script')
	main()
