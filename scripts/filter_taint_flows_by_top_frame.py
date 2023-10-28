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
	filters taint flows to the ones that belong to the top-level frame / webpage only. 

	Running:
	------------
	$ python3 -m scripts.filter_taint_flows_by_top_frame

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

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")

	webpages_final = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		webpages_final = json.load(fd)


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
	for sink in SINK_TYPES:
		for source in SOURCE_TYPES:
			taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
			topframe_taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_topframe.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)
			filtered_taintflows_count = {}

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
							taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}.json'.format(directory.rstrip('/'), source, sink)
							new_taintflow_file_path_name = '{0}/taintflows_filter_{1}_{2}_topframe.json'.format(directory.rstrip('/'), source, sink)

							filtered_taintflows = []
							if os.path.exists(taintflow_file_path_name):
								with open(taintflow_file_path_name, 'r') as fd:
									taintflows_list = json.load(fd)
									for flow in taintflows_list:
										if flow["parentloc"] != "different origin":
											filtered_taintflows.append(flow)

											if website in filtered_taintflows_count:
												if webpage in filtered_taintflows_count[website]:
													filtered_taintflows_count[website][webpage] = filtered_taintflows_count[website][webpage] + 1
												else:
													filtered_taintflows_count[website][webpage] = 1
											else:																					
												filtered_taintflows_count[website] = {}
												filtered_taintflows_count[website][webpage] = 1

								with open(new_taintflow_file_path_name, 'w+') as fd:
									json.dump(filtered_taintflows, fd, ensure_ascii=False, indent=4)

			with open(topframe_taintflow_count_file_path_name, 'w+') as fd:
				json.dump(filtered_taintflows_count, fd, ensure_ascii=False, indent=4)


if __name__ == "__main__":
	main()


