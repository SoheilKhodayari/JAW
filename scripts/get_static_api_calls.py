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
	gets the number of webpages with a given api call

	Running:
	------------
	$ python3 -m scripts.get_static_api_calls --webpages=webpages_final.json --api=sendBeacon --cut=1000

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule



def get_scripts(directory):

	files = os.listdir(directory)
	outputs = []
	for file in files:
		if file.endswith('.js'):
			outputs.append(os.path.join(directory, file))

	return outputs


def get_webpage_api_calls(scripts, api):
	
	n_calls = 0
	for script in scripts:
		with open(script, "r", encoding="utf-8", errors='ignore') as fd:
			text = fd.read()
			if api in text:
				n_calls += 1

	return n_calls



def main():

	INPUT_FILE_NAME_DEFAULT = 'webpages_final.json'

	p = argparse.ArgumentParser(description='This script gets the number of webpages with a given api call.')
	p.add_argument('--webpages', "-I",
		  metavar="FILE",
		  default=INPUT_FILE_NAME_DEFAULT,
		  help='input list of webpages per webapp in JSON (default: %(default)s)',
		  type=str)

	p.add_argument('--api', "-A",
		  default='sendBeacon',
		  help='Web API name (default: %(default)s)',
		  type=str)

	p.add_argument('--cut', "-C",
		  default=1000,
		  help='maximum number of entries to consider (default: %(default)s)',
		  type=int)

	args= vars(p.parse_args())
	input_file_name = args["webpages"]
	api_call_name = args["api"]
	max_cut = args["cut"]

	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	LOGGER.info('started checking the webpages data.')
	
	fd = open(input_file_name, 'r')
	webpages_json = json.load(fd)
	fd.close()


	api_total_calls = 0
	api_set_webpages = set() 
	api_set_websites = set()

	idx = 0
	for webapp_folder_name in webpages_json:
		webapp_folder = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
		if os.path.exists(webapp_folder):
			idx = idx + 1
			if idx > max_cut:
				break

			webpages_names = webpages_json[webapp_folder_name]
			for webpage_name in webpages_names:
				webpage_folder = os.path.join(webapp_folder, webpage_name)

				webpage_unique_id = os.path.join(webapp_folder_name, webpage_name)
				if os.path.exists(webpage_folder):

					scripts = get_scripts(webpage_folder)
					n_calls = get_webpage_api_calls(scripts, api_call_name)

					if n_calls > 0:
						api_total_calls += n_calls
						api_set_webpages.add(webpage_unique_id)
						api_set_websites.add(webapp_folder_name)

	
	api_total_sites = len(list(api_set_websites))
	api_total_pages = len(list(api_set_webpages))
	output="""
	sites: {0},
	pages: {1},
	calls: {2}
	""".format(api_total_sites, api_total_pages, api_total_calls)
	print(output)
	LOGGER.info('finished.')


if __name__ == "__main__":
	main()