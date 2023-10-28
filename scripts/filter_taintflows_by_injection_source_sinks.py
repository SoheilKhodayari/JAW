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
	filters taintflows to markup injection sinks and web attacker sources

	Running:
	------------
	$ python3 -m scripts.filter_taintflows_by_injection_source_sinks --input=$(pwd)/input/sitelist_final.csv --from=x --to=y

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule



	
web_attacker_sources = [
	"PushMessageData",
	"document.baseURI",
	"document.documentURI",
	"document.referrer",
	"location.hash",
	"location.href",
	"location.search",
	"window.name"
]

html_insertion_sinks = [
	"innerHTML",
	"insertAdjacentHTML",
	"outerHTML"
]

xss_sinks = [
	"document.writeln",
	"document.write",
	"eval",
	"script.innerHTML",
	"script.src",
	"script.text",
]


def main():

	INPUT_FILE_NAME_DEFAULT = 'sitelist_final.csv'

	p = argparse.ArgumentParser(description='This script creates a list of webpages with markup insertion data flows.')
	p.add_argument('--input', "-I",
		  metavar="FILE",
		  default=INPUT_FILE_NAME_DEFAULT,
		  help='list of sites (default: %(default)s)',
		  type=str)

	p.add_argument('--from', "-F",
					default=-1,
					help='the first entry to consider (default: %(default)s)',
					type=int)

	p.add_argument('--to', "-T",
					default=-1,
					help='the last entry to consider (default: %(default)s)',
					type=int)


	args= vars(p.parse_args())
	input_file_name = args["input"]
	from_row = args["from"]
	to_row = args["to"]

	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	LOGGER.info('started processing the taint flows.')
	
	html_data = {} # site folder name -> {page1: [n_flows, [index1, index2, ... indexN], [ [list sources1], ...., [list sourcesN] ]], page2: [...], ...}
	xss_data = {}


	chunksize = 10**5
	iteration = 0
	done = False
	for chunk_df in pd.read_csv(input_file_name, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		
		if done: 
			break

		iteration = iteration + 1
		LOGGER.info("starting to process chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))

		for (index, row) in chunk_df.iterrows():

			g_index = iteration*index+1
			if g_index >= from_row and g_index <= to_row:

				etld_url = row[1]
				url = 'http://' + etld_url
				app_name = utilityModule.getDirectoryNameFromURL(url)
				app_path_name = os.path.join(constantsModule.DATA_DIR, app_name)
				if os.path.exists(app_path_name) and os.path.isdir(app_path_name):
					files = os.listdir(app_path_name)
					if len(files) > 1:
						
						html_data[app_name] = {}
						xss_data[app_name] = {}

						for webpage_name in files:
							webpage_path_name = os.path.join(app_path_name, webpage_name)
							if os.path.exists(webpage_path_name) and os.path.isdir(webpage_path_name):
								taintflows_json_file = os.path.join(webpage_path_name, "taintflows.json")
								if os.path.exists(taintflows_json_file):
									json_content = {}
									try:
										fd = open(taintflows_json_file, 'r')
										json_content = json.load(fd)
										fd.close()
									except:
										continue

								for taintflowindex in range(len(json_content)):
									taintflowobject = json_content[taintflowindex]
									taintflow_sink = taintflowobject["sink"]
									taintflow_sources = taintflowobject["sources"]

									for sink in html_insertion_sinks:
										if sink in taintflow_sink:
											common_sources = list(set(list(set(taintflow_sources) & set(web_attacker_sources))))
											if len(common_sources) > 0:
												if webpage_name in html_data[app_name]:
													html_data[app_name][webpage_name][0] = html_data[app_name][webpage_name][0] + 1
													html_data[app_name][webpage_name][1].append(taintflowindex)
													html_data[app_name][webpage_name][2].append(common_sources)
												else:
													html_data[app_name][webpage_name] = [1, [taintflowindex], [common_sources]]

									for sink in xss_sinks:
										if sink in taintflow_sink:
											common_sources = list(set(list(set(taintflow_sources) & set(web_attacker_sources))))
											if len(common_sources) > 0:
												if webpage_name in xss_data[app_name]:
													xss_data[app_name][webpage_name][0] = xss_data[app_name][webpage_name][0] + 1
													xss_data[app_name][webpage_name][1].append(taintflowindex)
													xss_data[app_name][webpage_name][2].append(common_sources)
												else:
													xss_data[app_name][webpage_name] = [1, [taintflowindex], [common_sources]]

			if g_index > to_row:
				done = True
				LOGGER.info("successfully processed sites taint flows, terminating!") 
				break


	markup_injection_out_directory = os.path.join(constantsModule.OUTPUTS_DIR, "markup_injection")
	if not os.path.exists(markup_injection_out_directory):
		os.makedirs(markup_injection_out_directory)
		
	with open(os.path.join(markup_injection_out_directory, "taintflows_count_filter_markup_html_insertion_{}_{}.json".format(from_row, to_row)), 'w+') as fd:
		json.dump(html_data, fd, ensure_ascii=False, indent=4)

	with open(os.path.join(markup_injection_out_directory, "taintflows_count_filter_markup_xss_{}_{}.json".format(from_row, to_row)), 'w+') as fd:
		json.dump(xss_data, fd, ensure_ascii=False, indent=4)

	LOGGER.info('finished.')


main()