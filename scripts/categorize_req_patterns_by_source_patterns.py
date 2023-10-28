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
	groups the requests of each request pattern based on the controllable part of the source 

	Running:
	------------
	$ python3 -m scripts.categorize_req_patterns_by_source_patterns

	
"""

import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
from urllib.parse import urlparse


SOURCE_TYPE_MAP = {
	'loc_href': 'location.href',
	'loc_hash': 'location.hash',
	'loc_search': 'location.search',
	'doc_baseuri': 'document.baseURI',
	'doc_uri': 'document.documentURI'
}


DEBUG = False


def find_index_of_element_if_exists_in_list(element, lst):
	if element in lst:
		return lst.index(element)
	return -1

def is_url_source(source):
	if source in SOURCE_TYPE_MAP:
		return True
	return False


def find_vector_id_of_tainted_url(sink_or_source_url, begin_indexes, end_indexes):

	try:
		parsed_url = urlparse(sink_or_source_url)
	except:
		parsed_url = None

	if parsed_url:

		url_scheme = parsed_url.scheme
		scheme_idx = sink_or_source_url.find(url_scheme)
		url_scheme_range = range(scheme_idx, scheme_idx+len(url_scheme))
		url_scheme_range_set = set(url_scheme_range)

		url_netloc = parsed_url.netloc
		netloc_idx = sink_or_source_url.find(url_netloc)
		url_netloc_range = range(netloc_idx, netloc_idx+len(url_netloc))										
		url_netloc_range_set = set(url_netloc_range)

		url_path = parsed_url.path
		path_idx = sink_or_source_url.find(url_path)
		url_path_range = range(path_idx, path_idx+len(url_path))
		url_path_range_set = set(url_path_range)

		url_query = parsed_url.query
		query_idx = sink_or_source_url.find(url_query)
		url_query_range = range(query_idx, query_idx+len(url_query))
		url_query_range_set = set(url_query_range)

		url_fragment = parsed_url.fragment
		fragment_idx = sink_or_source_url.find(url_fragment)
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


		begin = begin_indexes
		end = end_indexes

		parts = len(begin)
		for i in range(parts):
			
			b = begin[i]
			e = end[i]

			selected_part = sink_or_source_url[b:e]
			if selected_part == sink_or_source_url:
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
				if DEBUG: print("sink_or_source_url", sink_or_source_url)
				if DEBUG: print("scheme", url_scheme)
				if DEBUG: print("---\n")
			else:
				intersection = url_scheme_range_set.intersection(tainted_range)
				if len(intersection) > 0:
					scheme_flag = 1
					if url_scheme_range.start == b:
						scheme_flag_start = 1

			if netloc_idx == -1:
				if DEBUG: print("sink_or_source_url", sink_or_source_url)
				if DEBUG: print("netloc", url_netloc)
				if DEBUG: print("---\n")
			else:
				intersection = url_netloc_range_set.intersection(tainted_range)
				if len(intersection) > 0:
					netloc_flag = 1
					if e >= url_netloc_range.stop:
						netloc_flag_end = 1

			if path_idx == -1:
				if DEBUG: print("sink_or_source_url", sink_or_source_url)
				if DEBUG: print("path", url_path)
				if DEBUG: print("---\n")
			else:
				intersection = url_path_range_set.intersection(tainted_range)
				if len(intersection) > 0:
					path_flag = 1
					if b <= url_path_range.start:
						path_flag_start = 1

			if query_idx == -1:
				if DEBUG: print("sink_or_source_url", sink_or_source_url)
				if DEBUG: print("query", url_query)
				if DEBUG: print("---\n")
			else:
				intersection = url_query_range_set.intersection(tainted_range)
				if len(intersection) > 0:
					query_flag = 1
					if b <= url_query_range.start:
						query_flag_start = 1

			if fragment_idx == -1:
				if DEBUG: print("sink_or_source_url", sink_or_source_url)
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

	return pattern_id


def main():

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")
	PATTERNS_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "patterns")
	PATTERNS_FILE_DEFAULT = os.path.join(PATTERNS_DIR, "site_req_pattern_mapping.json")


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

	p.add_argument('--patterns', "-P",
		  metavar="FILE",
		  default=PATTERNS_FILE_DEFAULT,
		  help='list of patterns (default: %(default)s)',
		  type=str)


	args= vars(p.parse_args())
	source_name = args["source"].lower()
	sink_name = args["sink"].lower()

	pattern_file_pathname = args["patterns"]

	process_all_sources_and_sinks = False
	if source_name == 'all' and sink_name == 'all':
		process_all_sources_and_sinks = True


	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	
	PATTERN_SOURCE_TEMPT_DIR = os.path.join(PATTERNS_DIR, "grouped-by-source")
	if not os.path.exists(PATTERN_SOURCE_TEMPT_DIR):
		os.makedirs(PATTERN_SOURCE_TEMPT_DIR)


	WEBPAGES_FINAL = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		WEBPAGES_FINAL = json.load(fd)


	output_webpages = {} # sink pattern id -> source pattern id -> `website-folder/webpage-hash` directory 
 

	def _process_source_sink(source, sink):

		taintflow_count_file_path_name = '{0}/taintflows_count_filter_{1}_{2}_topframe.json'.format(OUTPUT_DIR.rstrip('/'), source, sink)

		json_content = {}
		with open(taintflow_count_file_path_name, 'r') as fd:
			json_content = json.load(fd)
	

		for website in json_content:
			if website in WEBPAGES_FINAL:
				website_counted = False 
				webpages =list(json_content[website].keys())
				for webpage in webpages:
					webpage_counted = False
					if webpage in WEBPAGES_FINAL[website]:
						
						website_folder_webpage_hash = os.path.join(website, webpage)

						taintflow_file_path_name = os.path.join(website_folder_webpage_hash, 'taintflows_filter_{0}_{1}_topframe.json'.format(source, sink))
						taintflow_file_path_name = os.path.join(constantsModule.DATA_DIR, taintflow_file_path_name)
						if os.path.exists(taintflow_file_path_name):

							taintflow_json = {}
							with open(taintflow_file_path_name, 'r') as fd:
								taintflow_json = json.load(fd)

							if len(taintflow_json) > 0:

								for entry in taintflow_json:
									taintflow_sink = entry["sink"]
									taintflow_sources = entry["sources"]

									if len(entry["taint"]) > 0:

										if is_url_source(source):
											source_exact_name = SOURCE_TYPE_MAP[source]
											source_index = find_index_of_element_if_exists_in_list(source_exact_name, taintflow_sources)
											if source_index == -1: continue

											try:
												taintflow = entry["taint"][source_index]
											except:
												continue

											sink_url_string = entry["str"]
											webpage_url = entry["loc"]
											begin_indexes = taintflow["begin"]
											end_indexes = taintflow["end"]

											controllable_strings = []
											parts = len(begin_indexes)

											for i in range(parts):
													
												b = begin_indexes[i]
												e = end_indexes[i]

												selected_part = sink_url_string[b:e]
												controllable_strings.append(selected_part)


											if sink == "websocket_data" or sink == "xmlhttprequest_data" or sink == "fetch_data" or taintflow_sink == "WebSocket.send" or taintflow_sink == "fetch.body" or taintflow_sink == "XMLHttpRequest.send":
												pattern_id = ['0'] * 10 + ['1', '0']
												pattern_id = "_".join(pattern_id)


											elif sink == "xmlhttprequest_sethdr" or taintflow_sink == "XMLHttpRequest.setRequestHeader":
												pattern_id = ['0'] * 11 + ['1']
												pattern_id = "_".join(pattern_id)


											else:
												pattern_id = find_vector_id_of_tainted_url(sink_url_string, begin_indexes, end_indexes)


											begin_indexes_source = []
											end_indexes_source = []
											for cs in controllable_strings:
												if cs in webpage_url:
													start_idx = webpage_url.index(cs)
													end_idx = start_idx + len(cs) - 1
													begin_indexes_source.append(start_idx)
													end_indexes_source.append(end_idx)

											# the following vector shows which part of the source can be used to control the request
											if len(begin_indexes_source) > 0:
												source_pattern_id = find_vector_id_of_tainted_url(webpage_url, begin_indexes_source, end_indexes_source)
											else:
												source_pattern_id = ['x'] * 12
												source_pattern_id = "_".join(source_pattern_id)


											if pattern_id in output_webpages:
												if source_pattern_id in output_webpages[pattern_id]:
													output_webpages[pattern_id][source_pattern_id].append(website_folder_webpage_hash)
												else:
													output_webpages[pattern_id][source_pattern_id] = [website_folder_webpage_hash]
											else:
												output_webpages[pattern_id] = {}
												output_webpages[pattern_id][source_pattern_id] = [website_folder_webpage_hash]


						else:
							LOGGER.warning('taintflow file does not exist: %s'%taintflow_file_path_name)


	EXTRACT_PATTERNS = False

	OUTPUT_SOURCE_PATTERN_FILE = os.path.join(PATTERN_SOURCE_TEMPT_DIR, "req_patterns_group_by_source_patterns.json")
	if EXTRACT_PATTERNS:
		if process_all_sources_and_sinks:
			for sink in SINK_TYPES:
				for source in SOURCE_TYPES:
					print('[ALL] processing {0} - {1}'.format(source, sink))
					_process_source_sink(source, sink)
		else:
			print('[source-sink] processing {0} - {1}'.format(source_name, sink_name))
			_process_source_sink(source_name, sink_name)


		with open(OUTPUT_SOURCE_PATTERN_FILE, 'w+') as fd:
			json.dump(output_webpages, fd, ensure_ascii=False, indent=4)
	
	# map the output file
	source_patterns_json = {}
	with open(OUTPUT_SOURCE_PATTERN_FILE, 'r') as fd:
		source_patterns_json = json.load(fd)

	sink_patterns = list(source_patterns_json.keys())
	source_patterns = []
	for sink_pattern in sink_patterns:
		source_patterns_i = list(source_patterns_json[sink_pattern].keys())
		source_patterns.extend(source_patterns_i)
	source_patterns = list(set(source_patterns))


	OUTPUT_SOURCE_PATTERN_MATRIX = os.path.join(PATTERN_SOURCE_TEMPT_DIR, "req_patterns_group_by_source_matrix.csv")
	with open(OUTPUT_SOURCE_PATTERN_MATRIX, 'w+') as fd:
		fd.write("-\t" + "\t".join(source_patterns) + '\n')
		for sink_pattern in sink_patterns:
			line = [sink_pattern]
			for source_pattern in source_patterns: 
				if source_pattern in source_patterns_json[sink_pattern]:
					value = len(source_patterns_json[sink_pattern][source_pattern])
				else:
					value = 0

				value = str(value)
				line.append(value)
			line = "\t".join(line) + '\n'
			fd.write(line)


if __name__ == "__main__":
	print('started script')
	main()


	