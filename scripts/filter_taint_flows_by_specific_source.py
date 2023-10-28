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
	filters the relevant foxhound taint flows based on the sources

	Running:
	------------
	$ python3 -m scripts.filter_taint_flows_by_specific_source --sitelist=/path/to/sitelist_crawled.csv --taintfile=taintflows_source_filter.json

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule

def filter_taint_flows_by_sources(json_content, specific_source):
	
	target_sources = [
		specific_source
	]
	if specific_source == "MessageEvent":
		target_sources.append("window.MessageEvent")

	target_sources_set = set(target_sources)

	output = []
	for taintflow_object in json_content:
		if "sources" in taintflow_object:
			sources = taintflow_object["sources"]
			# check if the set of `sources` and `target_sources` have at least one element in common
			taintflow_has_a_target_source_element = bool(target_sources_set & set(sources))
			if taintflow_has_a_target_source_element:
				output.append(taintflow_object)
	return output



def main(specific_source, specific_source_abbreviation):

	SITELIST_FILE_NAME_DEFAULT = 'sitelist_crawled.csv'
	TAINT_FILE_NAME_DEFAULT = 'taintflows_source_filter.json'
	OUTPUTS_FILE_NAME_DEFAULT = 'taintflows_source_filter_%s.json'%specific_source_abbreviation

	p = argparse.ArgumentParser(description='This script filters the relevant foxhound taint flows based on the sources.')
	p.add_argument('--sitelist', "-I",
		  metavar="FILE",
		  default=SITELIST_FILE_NAME_DEFAULT,
		  help='list of sites (default: %(default)s)',
		  type=str)

	p.add_argument('--taintfile', "-T",
		  metavar="FILE",
		  default=TAINT_FILE_NAME_DEFAULT,
		  help='taint files name (default: %(default)s)',
		  type=str)

	p.add_argument('--outputs', "-O",
		  metavar="FILE",
		  default=OUTPUTS_FILE_NAME_DEFAULT,
		  help='file name for the output (default: %(default)s)',
		  type=str)



	args= vars(p.parse_args())
	sitelist_filename = args["sitelist"]
	taintflows_filename = args["taintfile"]
	outputs_file_name = args["outputs"]


	if sitelist_filename == SITELIST_FILE_NAME_DEFAULT:
		sitelist_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), SITELIST_FILE_NAME_DEFAULT)


	LOGGER.info('started processing the taint flows.')
	
	chunksize = 10**5

	data = {}

	for chunk_df in pd.read_csv(sitelist_filename, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		for (index, row) in chunk_df.iterrows():
			etld_url = row[1]
			url = 'http://' + etld_url
			app_name = utilityModule.getDirectoryNameFromURL(url)
			app_path_name = os.path.join(constantsModule.DATA_DIR, app_name)
			if os.path.exists(app_path_name) and os.path.isdir(app_path_name):
				files = os.listdir(app_path_name)
				if len(files) > 1:
					for webpage_name in files:
						webpage_path_name = os.path.join(app_path_name, webpage_name)
						if os.path.exists(webpage_path_name) and os.path.isdir(webpage_path_name):
							taintflows_json_file = os.path.join(webpage_path_name, taintflows_filename)
							if os.path.exists(taintflows_json_file):
								json_content = {}
								try:
									fd = open(taintflows_json_file, 'r')
									json_content = json.load(fd)
									fd.close()
								except:
									LOGGER.warning('JSON parsing error for %s'%taintflows_json_file)

								taintflows_output_path_name = os.path.join(webpage_path_name, OUTPUTS_FILE_NAME_DEFAULT)
								filtered_by_source_json = filter_taint_flows_by_sources(json_content, specific_source)
							
								with open(taintflows_output_path_name, 'w+') as fd:
									json.dump(filtered_by_source_json, fd, ensure_ascii=False, indent=4)


								count_filtered_taintflows = len(filtered_by_source_json)
								if count_filtered_taintflows > 0:
									if app_name not in data:
										data[app_name] = {}
									data[app_name][webpage_name] = count_filtered_taintflows


	with open(os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "taintflows_count_source_filter_%s.json"%specific_source_abbreviation), 'w+') as fd:
		json.dump(data, fd, ensure_ascii=False, indent=4)

	LOGGER.info('finished.')


if __name__ == "__main__":

	# "PushMessageData",
	# "PushSubscription.endpoint",
	# "document.baseURI",
	# "document.documentURI",
	# "document.referrer",
	# "location.hash",
	# "location.href",
	# "location.search",
	# "MessageEvent",
	# "window.MessageEvent",
	# "window.name"

	specific_source = "location.hash"
	specific_source_abbreviation = "loc_hash"
	main(specific_source, specific_source_abbreviation)

	specific_source = "window.name"
	specific_source_abbreviation = "win_name"
	main(specific_source, specific_source_abbreviation)

	specific_source = "location.href"
	specific_source_abbreviation = "loc_href"
	main(specific_source, specific_source_abbreviation)

	specific_source = "location.search"
	specific_source_abbreviation = "loc_search"
	main(specific_source, specific_source_abbreviation)

	specific_source = "document.referrer"
	specific_source_abbreviation = "doc_referrer"
	main(specific_source, specific_source_abbreviation)

	specific_source = "document.baseURI"
	specific_source_abbreviation = "doc_baseuri"
	main(specific_source, specific_source_abbreviation)

	specific_source = "document.documentURI"
	specific_source_abbreviation = "doc_uri"
	main(specific_source, specific_source_abbreviation)

	specific_source = "PushSubscription.endpoint" # to check if the sink is a request and misses a csrf token
	specific_source_abbreviation = "pushsub_endpoint"
	main(specific_source, specific_source_abbreviation)

	specific_source = "MessageEvent" 
	specific_source_abbreviation = "message_evt"
	main(specific_source, specific_source_abbreviation)

	specific_source = "PushMessageData"
	specific_source_abbreviation = "push_message"
	main(specific_source, specific_source_abbreviation)




