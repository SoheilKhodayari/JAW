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
	script to convert request patterns in JSON format to CSV

	Running:
	------------
	$ python3 -m scripts.convert_json_req_patterns_to_csv

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
		'script_src',
		'all'
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
		'pushsub_endpoint',
		'all'
	]

	def find_source(string):

		for source in SOURCE_TYPES:
			if source in string:
				return source

		return None

	def find_sink(string):
		for sink in SINK_TYPES:
			if sink in string:
				return sink
		return None



	PATTERNS_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "patterns")
	pattern_file_names = os.listdir(PATTERNS_DIR)

	rows = {}
	for file_name in pattern_file_names:
		file_path_name = os.path.join(PATTERNS_DIR, file_name) 
		if os.path.exists(file_path_name) and os.path.isfile(file_path_name):
			
			if file_path_name.endswith('req_patterns.json'):
		
				json_content = {}
				with open(file_path_name, 'r') as fd:
					json_content = json.load(fd)

				
				sink = find_sink(file_name)
				source = find_source(file_name)
				for pattern in json_content:
					pattern_count = json_content[pattern]

					pattern_as_list = pattern.split("_")
					row = [source, sink, pattern] + pattern_as_list + [str(pattern_count)] + ['NA', 'NA']
					key = source + "__" + sink + "__" + pattern
					rows[key] = row


	for file_name in pattern_file_names:
		file_path_name = os.path.join(PATTERNS_DIR, file_name) 
		if os.path.exists(file_path_name) and os.path.isfile(file_path_name):
			
			if file_path_name.endswith('req_patterns_wb.json'):
		
				json_content = {}
				with open(file_path_name, 'r') as fd:
					json_content = json.load(fd)

				
				sink = find_sink(file_name)
				source = find_source(file_name)
				for pattern in json_content:
					pattern_count_wb = json_content[pattern]

					key = source + "__" + sink + "__" + pattern
					if key in rows:
						rows[key][16] = str(pattern_count_wb)

	for file_name in pattern_file_names:
		file_path_name = os.path.join(PATTERNS_DIR, file_name) 
		if os.path.exists(file_path_name) and os.path.isfile(file_path_name):
			
			if file_path_name.endswith('req_patterns_ws.json'):
		
				json_content = {}
				with open(file_path_name, 'r') as fd:
					json_content = json.load(fd)
				
				sink = find_sink(file_name)
				source = find_source(file_name)
				for pattern in json_content:
					pattern_count_ws = json_content[pattern]

					key = source + "__" + sink + "__" + pattern
					if key in rows:
						rows[key][17] = str(pattern_count_ws)


	with open(os.path.join(os.path.join(constantsModule.OUTPUTS_DIR, "tempt"), "req_patterns.out"), "w+") as fd:
		for key in rows:
			row = rows[key]
			fd.write("\t".join(row) + '\n')




if __name__ == "__main__":
	print('started script')
	main()
