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
	creates a json file showing which webpages have which request patterns; 

	Running:
	------------
	$ python3 -m scripts.get_site_req_pattern_mapping

	
	Parallel Runs:
	------------
	$ python3 -m input.generate_req_categorization

	then, run the generated bash scripts

"""

import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
from urllib.parse import urlparse

def main():

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")

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


	p = argparse.ArgumentParser(description='This script clusters webpages based on their similarly.')


	p.add_argument('--source', "-A",
		  help='source name (default: %(default)s)',
		  type=str,
		  default='ALL')

	p.add_argument('--sink', "-S",
		  help='sink name (default: %(default)s)',
		  type=str,
		  default='ALL')


	DEBUG = False

	args= vars(p.parse_args())
	source_name = args["source"].lower()
	sink_name = args["sink"].lower()

	process_all_sources_and_sinks = False
	if source_name == 'all' and sink_name == 'all':
		process_all_sources_and_sinks = True

	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	PATTERN_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "patterns")
	if not os.path.exists(PATTERN_TEMPT_DIR):
		os.makedirs(PATTERN_TEMPT_DIR)


	WEBPAGES_FINAL = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		WEBPAGES_FINAL = json.load(fd)


	patterns = {} 		# pattern_id -> count_flows
	patterns_wb = {}	# pattern_id -> count_webpages
	patterns_ws = {}	# pattern_id -> count_websites

	sink_patterns = {} 		# sink -> pattern_id -> count_flows
	sink_patterns_wb = {}	# sink -> pattern_id -> count_webpages
	sink_patterns_ws = {}	# sink -> pattern_id -> count_websites

	output_webpages = {} # pattern to page mapping
 

	def _process_source_sink(source, sink):

		taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_topframe.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)

		json_content = {}
		with open(taintflow_count_file_path_name, 'r') as fd:
			json_content = json.load(fd)

		
		for s in SINK_TYPES:
			sink_patterns[s] = {}
			sink_patterns_wb[s] = {}
			sink_patterns_ws[s] = {}

		for website in json_content:
			if website in WEBPAGES_FINAL:
				website_counted = False 
				webpages =list(json_content[website].keys())
				for webpage in webpages:
					webpage_counted = False
					if webpage in WEBPAGES_FINAL[website]:
						
						taintflow_file_path_name = os.path.join(os.path.join(website, webpage), 'taintflows_filter_{0}_{1}_topframe.json'.format(source, sink))
						taintflow_file_path_name = os.path.join(constantsModule.DATA_DIR, taintflow_file_path_name)
						if os.path.exists(taintflow_file_path_name):

							taintflow_json = {}
							with open(taintflow_file_path_name, 'r') as fd:
								taintflow_json = json.load(fd)

							if len(taintflow_json) > 0:

								for entry in taintflow_json:
									taintflow_sink = entry["sink"]
									if len(entry["taint"]) > 0:
										taintflow = entry["taint"][0]

										if sink == "websocket_data" or sink == "xmlhttprequest_data" or sink == "fetch_data" or taintflow_sink == "WebSocket.send" or taintflow_sink == "fetch.body" or taintflow_sink == "XMLHttpRequest.send":
											pattern_id = ['0'] * 10 + ['1', '0']
											pattern_id = "_".join(pattern_id)

											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))
											else:
												output_webpages[pattern_id] = set()
												output_webpages[pattern_id].add(os.path.join(website, webpage))


										elif sink == "xmlhttprequest_sethdr" or taintflow_sink == "XMLHttpRequest.setRequestHeader":
											pattern_id = ['0'] * 11 + ['1']
											pattern_id = "_".join(pattern_id)

											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))
											else:
												output_webpages[pattern_id] = set()
												output_webpages[pattern_id].add(os.path.join(website, webpage))


										else:
											sink_url_string = entry["str"]

											try:
												parsed_url = urlparse(sink_url_string)
											except:
												parsed_url = None

											if parsed_url:

												url_scheme = parsed_url.scheme
												scheme_idx = sink_url_string.find(url_scheme)
												url_scheme_range = range(scheme_idx, scheme_idx+len(url_scheme))
												url_scheme_range_set = set(url_scheme_range)

												url_netloc = parsed_url.netloc
												netloc_idx = sink_url_string.find(url_netloc)
												url_netloc_range = range(netloc_idx, netloc_idx+len(url_netloc))										
												url_netloc_range_set = set(url_netloc_range)

												url_path = parsed_url.path
												path_idx = sink_url_string.find(url_path)
												url_path_range = range(path_idx, path_idx+len(url_path))
												url_path_range_set = set(url_path_range)
		
												url_query = parsed_url.query
												query_idx = sink_url_string.find(url_query)
												url_query_range = range(query_idx, query_idx+len(url_query))
												url_query_range_set = set(url_query_range)

												url_fragment = parsed_url.fragment
												fragment_idx = sink_url_string.find(url_fragment)
												url_fragment_range = range(fragment_idx, fragment_idx+len(url_fragment))
												url_fragment_range_set = set(url_fragment_range)

												scheme_flag = 0
												scheme_flag_start = 0
												netloc_flag = 0
												netloc_flag_end = 0
												path_flag = 0
												path_flag_start = 0
												query_flag = 0
												query_flag_start = 0
												fragment_flag = 0
												fragment_flag_start = 0
												body_flag = 0									
												header_flag = 0


												begin = taintflow["begin"]
												end = taintflow["end"]

												parts = len(begin)
												for i in range(parts):
													
													b = begin[i]
													e = end[i]

													selected_part = sink_url_string[b:e]
													if selected_part == sink_url_string:
														scheme_flag = 1
														scheme_flag_start = 1
														netloc_flag = 1
														netloc_flag_end = 1
														path_flag = 1
														path_flag_start = 1
														query_flag = 1
														query_flag_start = 1
														fragment_flag = 1
														fragment_flag_start = 1
														body_flag = 0								
														header_flag = 0
														break

													tainted_range = range(b, e)

													if scheme_idx == -1:
														if DEBUG: print("sink_url_string", sink_url_string)
														if DEBUG: print("scheme", url_scheme)
														if DEBUG: print("---\n")
													else:
														intersection = url_scheme_range_set.intersection(tainted_range)
														if len(intersection) > 0:
															scheme_flag = 1
															if url_scheme_range.start == b:
																scheme_flag_start = 1

													if netloc_idx == -1:
														if DEBUG: print("sink_url_string", sink_url_string)
														if DEBUG: print("netloc", url_netloc)
														if DEBUG: print("---\n")
													else:
														intersection = url_netloc_range_set.intersection(tainted_range)
														if len(intersection) > 0:
															netloc_flag = 1
															if e >= url_netloc_range.stop:
																netloc_flag_end = 1

													if path_idx == -1:
														if DEBUG: print("sink_url_string", sink_url_string)
														if DEBUG: print("path", url_path)
														if DEBUG: print("---\n")
													else:
														intersection = url_path_range_set.intersection(tainted_range)
														if len(intersection) > 0:
															path_flag = 1
															if b <= url_path_range.start:
																path_flag_start = 1

													if query_idx == -1:
														if DEBUG: print("sink_url_string", sink_url_string)
														if DEBUG: print("query", url_query)
														if DEBUG: print("---\n")
													else:
														intersection = url_query_range_set.intersection(tainted_range)
														if len(intersection) > 0:
															query_flag = 1
															if b <= url_query_range.start:
																query_flag_start = 1

													if fragment_idx == -1:
														if DEBUG: print("sink_url_string", sink_url_string)
														if DEBUG: print("fragment", url_fragment)
														if DEBUG: print("---\n")
													else:
														intersection = url_fragment_range_set.intersection(tainted_range)
														if len(intersection) > 0:
															fragment_flag = 1
															if b <= url_fragment_range.start:
																fragment_flag_start = 1

												pattern_id = [
													str(scheme_flag),
													str(scheme_flag_start),
													str(netloc_flag),
													str(netloc_flag_end),
													str(path_flag),
													str(path_flag_start),
													str(query_flag),
													str(query_flag_start),
													str(fragment_flag),
													str(fragment_flag_start),
													str(body_flag),
													str(header_flag)
												]

											else:
												pattern_id = ['x'] * 12
											
											pattern_id = "_".join(pattern_id)

											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))
											else:
												output_webpages[pattern_id] = set()
												output_webpages[pattern_id].add(os.path.join(website, webpage))
											

						else:
							LOGGER.warning('taintflow file does not exist: %s'%taintflow_file_path_name)


	for sink in SINK_TYPES:
		for source in SOURCE_TYPES:
			print('[ALL] processing {0} - {1}'.format(source, sink))
			_process_source_sink(source, sink)

	# convert set() to list() to be JSON-serializable
	for key in output_webpages:
		output_webpages[key] = list(output_webpages[key])

	with open(os.path.join(PATTERN_TEMPT_DIR, "site_req_pattern_mapping.json"), 'w+') as fd:
		json.dump(output_webpages, fd, ensure_ascii=False, indent=4)
	

if __name__ == "__main__":
	print('started script')
	main()







			