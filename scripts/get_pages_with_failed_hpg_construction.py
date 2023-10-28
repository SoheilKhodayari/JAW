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
	Creates a list of webpages for which the HPG construction phase failed. 
	This is useful to restart HPG construction step for those pages (e.g., with a higher timeout value)

	Running:
	------------
	$ python3 -m scripts.get_pages_with_failed_hpg_construction --webpages=webpages_final.json --output=webpages_hpg_const_failed.json

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule



def cluster(input_dict):
	clusters = {}
	for key, val in input_dict.items():
		if val not in clusters:
			clusters[val] = [key]
		else:
			clusters[val].append(key)
	return clusters


def main():

	INPUT_FILE_NAME_DEFAULT = 'webpages_final.json'
	OUTPUT_FILE_NAME_DEFAULT = 'webpages_hpg_const_failed.json'

	p = argparse.ArgumentParser(description='This script creates a list of webpages where the HPG construction phase failed.')
	p.add_argument('--webpages', "-I",
		  metavar="FILE",
		  default=INPUT_FILE_NAME_DEFAULT,
		  help='input list of webpages per webapp in JSON (default: %(default)s)',
		  type=str)

	p.add_argument('--output', "-O",
		  metavar="FILE",
		  default=OUTPUT_FILE_NAME_DEFAULT,
		  help='file path name for the output (default: %(default)s)',
		  type=str)

	args= vars(p.parse_args())
	input_file_name = args["webpages"]
	output_file_name = args["output"]


	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	if output_file_name == OUTPUT_FILE_NAME_DEFAULT:
		output_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), OUTPUT_FILE_NAME_DEFAULT)



	LOGGER.info('started checking the webpages data.')
	
	# clusters = { } # site folder name -> site_clusters
	fd = open(input_file_name, 'r')
	webpages_json = json.load(fd)
	fd.close()


	output_data = {} # webapp -> [ list of webpages]

	for webapp_folder_name in webpages_json:
		webapp_folder = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
		if os.path.exists(webapp_folder):
			webpages_names = webpages_json[webapp_folder_name]
			for webpage_name in webpages_names:
				webpage_folder = os.path.join(webapp_folder, webpage_name)
				if os.path.exists(webpage_folder):

					nodes_file = os.path.join(webpage_folder, constantsModule.NODE_INPUT_FILE_NAME)
					rels_file = os.path.join(webpage_folder, constantsModule.RELS_INPUT_FILE_NAME)
					# rels_dynamic_file = os.path.join(webpage_folder, constantsModule.RELS_DYNAMIC_INPUT_FILE_NAME)
					
					nodes_file_gz = nodes_file + '.gz'
					rels_file_gz = rels_file + '.gz'
					# rels_dynamic_file_gz = rels_dynamic_file + '.gz'

					if os.path.exists(nodes_file) and os.path.exists(rels_file):
						continue 
					elif os.path.exists(nodes_file_gz) and os.path.exists(rels_file_gz):
						continue 

					else:
						if webapp_folder_name in output_data:
							output_data[webapp_folder_name].append(webpage_name)
						else:
							output_data[webapp_folder_name] = [webpage_name]

	# save as json
	with open(output_file_name, 'w+') as fd:
		json.dump(output_data, fd, ensure_ascii=False, indent=4)

	# save as csv 
	output_file_name = output_file_name.replace('.json', '.csv')
	with open(output_file_name, 'w+') as fd: 
		idx = 0
		for webapp_folder in output_data:
			webpages = output_data[webapp_folder]
			for webpage_name in webpages:
				if idx != 0:
					fd.write('\n')
				idx += 1
				webpage = os.path.join(webapp_folder, webpage_name)
				fd.write(webpage)

	LOGGER.info('finished.')


main()