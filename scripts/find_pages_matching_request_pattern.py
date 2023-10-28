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
	given a vector representation / anatomy of tainted parameter of request sending instructions,
	it finds webpages matching that pattern

	Running:
	------------
	$ python3 -m scripts.find_pages_matching_request_pattern


"""



import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
from urllib.parse import urlparse



def find_index_of_element_if_exists_in_list(element, lst):
	if element in lst:
		return lst.index(element)
	return -1


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


	OUTPUT_DIR = os.path.join(constantsModule.BASE_DIR, "outputs")
	INPUT_DIR = os.path.join(constantsModule.BASE_DIR, "input")
	OUTPUT_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "patterns")
	if not os.path.exists(OUTPUT_TEMPT_DIR):
		os.makedirs(OUTPUT_TEMPT_DIR)


	WEBPAGES_FINAL = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		WEBPAGES_FINAL = json.load(fd)


	def _process_source_sink(source, sink, patterns):


		output_webpages = {}
		for pattern in patterns:
			output_webpages[pattern] = set()

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
						
						taintflow_file_path_name = os.path.join(os.path.join(website, webpage), 'taintflows_filter_{0}_{1}_topframe.json'.format(source, sink))
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

										source_index = find_index_of_element_if_exists_in_list(source, taintflow_sources)
										if source_index == -1: continue

										try:
											taintflow = entry["taint"][source_index]
										except:
											continue


										sink_url_string = entry["str"]
										webpage_url = entry["loc"]
										begin_indexes = taintflow["begin"]
										end_indexes = taintflow["end"]


										if sink == "websocket_data" or sink == "xmlhttprequest_data" or sink == "fetch_data" or taintflow_sink == "WebSocket.send" or taintflow_sink == "fetch.body" or taintflow_sink == "XMLHttpRequest.send":
											pattern_id = ['0'] * 10 + ['1', '0']
											pattern_id = "_".join(pattern_id)

											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))


										elif sink == "xmlhttprequest_sethdr" or taintflow_sink == "XMLHttpRequest.setRequestHeader":
											pattern_id = ['0'] * 11 + ['1']
											pattern_id = "_".join(pattern_id)


											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))

										else:

											pattern_id = find_vector_id_of_tainted_url(sink_url_string, begin_indexes, end_indexes)
											if pattern_id in output_webpages:
												output_webpages[pattern_id].add(os.path.join(website, webpage))	

						else:
							LOGGER.warning('taintflow file does not exist: %s'%taintflow_file_path_name)


		# convert set to list to be JSON serializable
		for key in output_webpages:
			output_webpages[key] = list(output_webpages[key])
		return output_webpages


	# potentially exploitable script src patterns
	
	interesting_combinations = [
		{
			"source_name": "loc_href",
			"sink_name": "script_src",
			"patterns": [
				"1_1_1_1_1_1_0_0_0_0_0_0",
				"0_0_1_1_1_1_1_1_0_0_0_0",
				"0_0_1_1_1_1_0_0_0_0_0_0",
				"1_1_1_1_1_1_1_1_0_0_0_0"
			]
		},
		{
			"source_name": "loc_href",
			"sink_name": "loc_assign",
			"patterns": [
				"0_0_0_0_0_0_1_1_0_0_0_0",
				"1_1_1_1_1_1_1_1_1_1_0_0",
				"1_1_1_1_1_1_1_1_0_0_0_0",
				"0_0_1_1_1_1_1_1_0_0_0_0",
				"0_0_1_1_1_1_0_0_0_0_0_0"
			]
		}


	]

	for combination in interesting_combinations:

		source_name = combination["source_name"]
		sink_name = combination["sink_name"]
		patterns = combination["patterns"]

		outputs = {}
		slug = ''
		if source_name in SOURCE_TYPES and sink_name in SINK_TYPES:
			slug = "m_%s_%s_"%(source_name, sink_name)
			print('[Single] processing {0} - {1}'.format(source_name, sink_name))
			outputs = _process_source_sink(source_name, sink_name, patterns)
		else:
			print('[warning] source={0} or sink={1} is a invalid string, check your inputs!'.format(source_name, sink_name))


		with open(os.path.join(OUTPUT_TEMPT_DIR, slug+ "matched_patterns.json"), 'w+') as fd:
			json.dump(outputs, fd, ensure_ascii=False, indent=4)


	

if __name__ == "__main__":
	print('started script')
	main()







			