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
	collects the set of "keys" in request / response headers

	Running:
	------------
	$ python3 -m exports.collect_keys_from_headers --sitelist=$(pwd)/input/sitelist_crawled.csv outputs=$(pwd)/outputs/headers.out

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule



def main():

	SITELIST_FILE_NAME_DEFAULT = 'sitelist_crawled.csv'
	OUTPUTS_FILE_NAME_DEFAULT = 'headers.out'

	p = argparse.ArgumentParser(description='This script filters the relevant foxhound taint flows based on the sources.')
	p.add_argument('--sitelist', "-I",
		  metavar="FILE",
		  default=SITELIST_FILE_NAME_DEFAULT,
		  help='list of sites (default: %(default)s)',
		  type=str)

	p.add_argument('--outputs', "-O",
		  metavar="FILE",
		  default=OUTPUTS_FILE_NAME_DEFAULT,
		  help='file name for the output (default: %(default)s)',
		  type=str)



	args= vars(p.parse_args())
	sitelist_filename = args["sitelist"]
	outputs_file_name = args["outputs"]


	if sitelist_filename == SITELIST_FILE_NAME_DEFAULT:
		sitelist_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), SITELIST_FILE_NAME_DEFAULT)


	if outputs_file_name == OUTPUTS_FILE_NAME_DEFAULT:
		outputs_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "outputs"), OUTPUTS_FILE_NAME_DEFAULT)



	LOGGER.info('started processing the headers.')
	
	chunksize = 10**5

	data = {'response': set(), 'request': set()}

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
							

							requests_json_file = os.path.join(webpage_path_name, "requests.json")
							responses_json_file = os.path.join(webpage_path_name, "responses.json")

							if os.path.exists(requests_json_file):
								json_content = {}
								try:
									fd = open(requests_json_file, 'r')
									json_content = json.load(fd)
									fd.close()
								except:
									LOGGER.warning('JSON parsing error for %s'%requests_json_file)
								for url in json_content:
									obj = json_content[url]
									headers = obj["headers"]
									for header in headers:
										data['request'].add(header)

							if os.path.exists(responses_json_file):
								json_content = {}
								try:
									fd = open(responses_json_file, 'r')
									json_content = json.load(fd)
									fd.close()
								except:
									LOGGER.warning('JSON parsing error for %s'%responses_json_file)

								for url in json_content:
									headers = json_content[url]
									for header in headers:
										data['response'].add(header)


	data['request'] = list(data['request'])	
	data['response'] = list(data['response'])									
	with open(outputs_file_name, 'w+') as fd:
		json.dump(data, fd, ensure_ascii=False, indent=4)

	LOGGER.info('finished.')


main()