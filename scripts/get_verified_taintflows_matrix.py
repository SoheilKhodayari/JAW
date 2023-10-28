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
	Runs the dataflow verification module for a selected list of pages 

	Running:
	------------
	$ python3 -m scripts.get_verified_taintflows_matrix --webpages=$(pwd)/input/site_req_pattern_mapping_dast_final_flat.csv --name=list_taintflows_verified_dast_final

"""

import argparse
import pandas as pd
import os, sys
import json

import utils.io as IOModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
import constants as constantsModule


def main():

	BASE_DIR= constantsModule.BASE_DIR
	PAGELIST_FILE_NAME_DEFAULT = 'site_req_pattern_mapping_dast_final_flat.csv'
	OUTPUT_FILE_NAME_DEFAULT = 'list_taintflows_verified_dast_final'
	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')

	p.add_argument('--webpages', "-I",
					metavar="FILE",
					default=PAGELIST_FILE_NAME_DEFAULT,
					help='input webpages. (default: %(default)s)',
					type=str)

	p.add_argument('--name', "-N",
					metavar="FILE",
					default=OUTPUT_FILE_NAME_DEFAULT,
					help='output file name. (default: %(default)s)',
					type=str)



	args= vars(p.parse_args())


	if args['webpages'] == PAGELIST_FILE_NAME_DEFAULT:
		testbed_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), PAGELIST_FILE_NAME_DEFAULT)
	else:
		testbed_filename = args['webpages']

	output_name = args["name"]

	chunksize = 10**5
	iteration = 0
	done = False

	data = {} # sink -> source -> count
	data_webpage = {}
	data_website = {}

	for chunk_df in pd.read_csv(testbed_filename, chunksize=chunksize, usecols=[0], header=None, skip_blank_lines=True):
		if done:
			break

		iteration = iteration + 1
		LOGGER.info("starting to test chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
		
		for (index, row) in chunk_df.iterrows():
			g_index = iteration*index+1

			webpage_folder = row[0].strip().rstrip('\n').strip()
			webpage_folder_absolute = os.path.join(constantsModule.DATA_DIR,webpage_folder)
			parts = webpage_folder.split('/')
			website_folder = parts[0].strip()
			website_url = website_folder.replace('-', ':').replace('http:', 'http://')
			webpage_hash = parts[1].strip().rstrip('\n').strip()
			taintflowfile = os.path.join(webpage_folder_absolute, "taintflows_verified.json")	
			if os.path.exists(taintflowfile):
				json_content= {}
				with open(taintflowfile, 'r') as fd:
					json_content = json.load(fd)
					for entry in json_content:
						n_confirmed_flows = len(entry[0])
						source = entry[1]
						sink = entry[2]
						if sink in data:
							if source in data[sink]:
								data[sink][source] = data[sink][source]  + n_confirmed_flows
							else:
								data[sink][source] = n_confirmed_flows
						else:
							data[sink] = {}
							data[sink][source] = n_confirmed_flows


						if sink in data_webpage:
							if source in data_webpage[sink]:
								data_webpage[sink][source].add(webpage_hash)
							else:
								data_webpage[sink][source] = set([webpage_hash])
						else:
							data_webpage[sink] = {}
							data_webpage[sink][source] = set([webpage_hash])


						if sink in data_website:
							if source in data_website[sink]:
								data_website[sink][source].add(website_folder)
							else:
								data_website[sink][source] = set([website_folder])
						else:
							data_website[sink] = {}
							data_website[sink][source] = set([website_folder])




	with open(os.path.join(constantsModule.OUTPUTS_DIR, output_name + '.json'), "w+") as fd:
		json.dump(data, fd, ensure_ascii=False, indent=4)

	all_sinks = [
		# web sockets
		"WebSocket",
		"WebSocket.send",
		# server side events
		"EventSource",
		# async requests (including push notification requests)
		"fetch.url",
		"fetch.body",
		"XMLHttpRequest.send",
		"XMLHttpRequest.open(url)",
		"XMLHttpRequest.setRequestHeader",
		# top level requests
		"Window.open",
		"location.href",
		"location.assign",
		"location.replace",
		# requests sent to fetch scripts
		"script.src"
	]

	all_sources = [
		"PushMessageData",
		"PushSubscription.endpoint",
		"document.baseURI",
		"document.documentURI",
		"document.referrer",
		"location.hash",
		"location.href",
		"location.search",
		"MessageEvent",
		"window.MessageEvent",
		"window.name"
	]

	with open(os.path.join(constantsModule.OUTPUTS_DIR, output_name + '.out'), "w+") as fd:
		for si in all_sinks:
			total = 0
			row = []
			if si in data:
				d= data[si]
				for sr in all_sources:
					if sr in d:
						row.append(d[sr])
					else:
						row.append(0)

			else:
				row = [0]* len(all_sources)

			row = [str(i) for i in row]
			row_string = ','.join(row)
			fd.write(row_string + '\n')
		fd.write("\n\n")

		for si in all_sinks:
			total = 0
			row = []
			if si in data_webpage:
				d= data_webpage[si]
				for sr in all_sources:
					if sr in d:
						row.append(len(d[sr]))
					else:
						row.append(0)

			else:
				row = [0]* len(all_sources)

			row = [str(i) for i in row]
			row_string = ','.join(row)
			fd.write(row_string + '\n')
		fd.write("\n\n")

		for si in all_sinks:
			total = 0
			row = []
			if si in data_website:
				d= data_website[si]
				for sr in all_sources:
					if sr in d:
						row.append(len(d[sr]))
					else:
						row.append(0)

			else:
				row = [0]* len(all_sources)

			row = [str(i) for i in row]
			row_string = ','.join(row)
			fd.write(row_string + '\n')
		fd.write("\n\n")


if __name__ == "__main__":
	main()


