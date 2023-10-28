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
	collects statistics about combinations of taintflows from different sources to sinks

	SINKS
	------------
	- websocket_url
	- websocket_data
	- eventsource_url
	- fetch_url
	- fetch_data
	- xmlhttprequest_url
	- xmlhttprequest_data
	- xmlhttprequest_sethdr
	- window.open
	- loc_assign
	- script_src

	SOURCES
	------------
	- loc_href
	- loc_hash
	- loc_search
	- win_name
	- doc_referrer
	- doc_baseuri
	- doc_uri
	- message_evt
	- push_message
	- pushsub_endpoint

	Running:
	------------
	$ python3 -m scripts.get_taintflows_matrix

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

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")


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


	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	OUTPUT_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "tempt")
	if not os.path.exists(OUTPUT_TEMPT_DIR):
		os.makedirs(OUTPUT_TEMPT_DIR)



	taintflow_source_filter_dataflows = {}
	taintflow_source_filter_webpages = {}
	taintflow_source_filter_websites = {}

	taintflow_sink_filter_dataflows = {}
	taintflow_sink_filter_webpages = {}
	taintflow_sink_filter_websites = {}


	# ---------------------------------- #
	# loop through data
	# ---------------------------------- #
	
	taintflow_matrix_dataflows = {}
	taintflow_matrix_webpages = {}
	taintflow_matrix_websites = {}

	for sink in SINK_TYPES:

		taintflow_matrix_dataflows[sink] = {}
		taintflow_matrix_webpages[sink] = {}
		taintflow_matrix_websites[sink] = {}

		for source in SOURCE_TYPES:
			taintflow_file_path_name = '{0}/taintflows_count_filter_{1}_{2}.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
			
			# default values
			taintflow_matrix_dataflows[sink][source] = 0
			taintflow_matrix_webpages[sink][source] = 0
			taintflow_matrix_websites[sink][source] = 0

			with open(taintflow_file_path_name, 'r') as fd:
				json_content = json.load(fd)

				count_websites = len(list(json_content.keys()))
				taintflow_matrix_websites[sink][source] = count_websites

				count_webpages = 0
				count_dataflows = 0	
				for website in json_content:
					webpages =list(json_content[website].keys())
					count_webpages += len(webpages)
					for webpage in webpages:
						count_dataflows += json_content[website][webpage]

				taintflow_matrix_webpages[sink][source] = count_webpages
				taintflow_matrix_dataflows[sink][source] = count_dataflows


	# total number of taint flows per each source type
	for source in SOURCE_TYPES:
		taintflow_source_filter_dataflows[source] = 0
		taintflow_source_filter_webpages[source] = 0
		taintflow_source_filter_websites[source] = 0
		taintflow_file_path_name =  '{0}/taintflows_count_source_filter_{1}.json'.format(INPUT_DIR.rstrip('/'), source)
		with open(taintflow_file_path_name, 'r') as fd:
			json_content = json.load(fd)

			count_websites = len(list(json_content.keys()))
			taintflow_source_filter_websites[source] = count_websites

			count_webpages = 0
			count_dataflows = 0	

			for website in json_content:
				webpages =list(json_content[website].keys())
				count_webpages += len(webpages)
				for webpage in webpages:
					count_dataflows += json_content[website][webpage]

			taintflow_source_filter_webpages[source] = count_webpages
			taintflow_source_filter_dataflows[source] = count_dataflows


	# total number of taint flows per each sink type
	for sink in SINK_TYPES:
		taintflow_sink_filter_webpages[sink] = []
		taintflow_sink_filter_websites[sink] = []

		for source in SOURCE_TYPES:
			taintflow_file_path_name = '{0}/taintflows_count_filter_{1}_{2}.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
			
			with open(taintflow_file_path_name, 'r') as fd:
				json_content = json.load(fd)

				lst_websites = list(json_content.keys())
				taintflow_sink_filter_websites[sink] = taintflow_sink_filter_websites[sink] + lst_websites

				lst_webpages = []
				for website in json_content:
					webpages =list(json_content[website].keys())
					lst_webpages += webpages
				taintflow_sink_filter_webpages[sink] = taintflow_sink_filter_webpages[sink] + lst_webpages




	taintflow_webpages_total = 0
	taintflow_websites_total = 0
	taintflow_webpages_list = []
	taintflow_websites_list = []

	for sink in SINK_TYPES:

		taintflow_webpages_list.extend(taintflow_sink_filter_webpages[sink])
		taintflow_websites_list.extend(taintflow_sink_filter_websites[sink])

		taintflow_sink_filter_webpages[sink] = len(list(set(taintflow_sink_filter_webpages[sink])))
		taintflow_sink_filter_websites[sink] = len(list(set(taintflow_sink_filter_websites[sink])))

	taintflow_webpages_total = len(list(set(taintflow_webpages_list)))
	taintflow_websites_total = len(list(set(taintflow_websites_list)))


	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_matrix_dataflows.out"), 'w+') as fd:
		for sink in SINK_TYPES:
			row = []
			for source in SOURCE_TYPES:
				row.append(str(taintflow_matrix_dataflows[sink][source]))
			row = '\t'.join(row)
			fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_matrix_webpages.out"), 'w+') as fd:
		for sink in SINK_TYPES:
			row = []
			for source in SOURCE_TYPES:
				row.append(str(taintflow_matrix_webpages[sink][source]))
			row = '\t'.join(row)
			fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_matrix_websites.out"), 'w+') as fd:
		for sink in SINK_TYPES:
			row = []
			for source in SOURCE_TYPES:
				row.append(str(taintflow_matrix_websites[sink][source]))
			row = '\t'.join(row)
			fd.write(row + '\n')


	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_source_filter_dataflows.out"), 'w+') as fd:
		row = []
		for source in SOURCE_TYPES:
			row.append(str(taintflow_source_filter_dataflows[source]))
		row = '\t'.join(row)
		fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_source_filter_webpages.out"), 'w+') as fd:
		row = []
		for source in SOURCE_TYPES:
			row.append(str(taintflow_source_filter_webpages[source]))
		row = '\t'.join(row)
		fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_source_filter_websites.out"), 'w+') as fd:
		row = []
		for source in SOURCE_TYPES:
			row.append(str(taintflow_source_filter_websites[source]))
		row = '\t'.join(row)
		fd.write(row + '\n')


	# with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_sink_filter_dataflows.out"), 'w+') as fd:
	# 	row = []
	# 	for sink in SINK_TYPES:
	# 		row.append(str(taintflow_sink_filter_dataflows[sink]))
	# 	row = '\t'.join(row)
	# 	fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_sink_filter_webpages.out"), 'w+') as fd:
		row = []
		for sink in SINK_TYPES:
			row.append(str(taintflow_sink_filter_webpages[sink]))
		row = '\t'.join(row)
		fd.write(row + '\n')

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_sink_filter_websites.out"), 'w+') as fd:
		row = []
		for sink in SINK_TYPES:
			row.append(str(taintflow_sink_filter_websites[sink]))
		row = '\t'.join(row)
		fd.write(row + '\n')


	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflow_total_webpages_and_sites.out"), 'w+') as fd:
		fd.write('webpages\twebsites\n')
		fd.write("{0}\t{1}\n".format(taintflow_webpages_total, taintflow_websites_total))


if __name__ == "__main__":
	main()

