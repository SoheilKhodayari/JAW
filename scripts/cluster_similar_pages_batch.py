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
	Cluster webpages of sites based on their similarly (i.e., near-duplicate detection).
	Stores the output in a single JSON file

	Running:
	------------
	$ python3 -m scripts.cluster_similar_pages_batch --input=/path/to/sitelist_crawled.csv --output=/path/to/webpage_clusters.json

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

	INPUT_FILE_NAME_DEFAULT = 'sitelist_crawled.csv'
	OUTPUT_FILE_NAME_DEFAULT = 'webpage_clusters.json'

	p = argparse.ArgumentParser(description='This script clusters webpages based on their similarly.')
	p.add_argument('--input', "-I",
		  metavar="FILE",
		  default=INPUT_FILE_NAME_DEFAULT,
		  help='list of sites to cluster (default: %(default)s)',
		  type=str)

	p.add_argument('--output', "-O",
		  metavar="FILE",
		  default=OUTPUT_FILE_NAME_DEFAULT,
		  help='file name for the output (default: %(default)s)',
		  type=str)

	args= vars(p.parse_args())
	input_file_name = args["input"]
	outputs_file_name = args["output"]


	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	if outputs_file_name == OUTPUT_FILE_NAME_DEFAULT:
		outputs_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), OUTPUT_FILE_NAME_DEFAULT)



	LOGGER.info('started clustering the webpages.')
	
	clusters = { } # site folder name -> site_clusters
	chunksize = 10**4
	for chunk_df in pd.read_csv(input_file_name, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		for (index, row) in chunk_df.iterrows():
			etld_url = row[1]
			url = 'http://' + etld_url
			app_name = utilityModule.getDirectoryNameFromURL(url)
			app_path_name = os.path.join(constantsModule.DATA_DIR, app_name)
			if os.path.exists(app_path_name) and os.path.isdir(app_path_name):
				files = os.listdir(app_path_name)
				if len(files) > 1:
					website_clusters = {} #  webpage unique hash -> list of webpage folder names with that unique hash
					webpage_hashes = {}   #  webpage folder name -> webpage unique hash based on scripts' content
					for webpage_name in files:
						webpage_path_name = os.path.join(app_path_name, webpage_name)
						if os.path.exists(webpage_path_name) and os.path.isdir(webpage_path_name):
							webpage_script_hashes = []
							script_mapping_file = os.path.join(webpage_path_name, 'scripts_mapping.json')
							if os.path.exists(script_mapping_file):
								with open(script_mapping_file, 'r', encoding='utf-8') as fd:
									script_mapping_json = json.load(fd)
									for key in script_mapping_json:
										script_item = script_mapping_json[key]
										script_hash = script_item['hash']
										webpage_script_hashes.append(script_hash)

							if len(webpage_script_hashes) > 0:
								webpage_script_hashes_as_string = '_'.join(webpage_script_hashes).strip().strip('\n').strip()
								webpage_unique_hash = utilityModule.sha256(webpage_script_hashes_as_string)
								webpage_hashes[webpage_name] = webpage_unique_hash

					website_clusters = cluster(webpage_hashes)
					clusters[app_name]=website_clusters
					
	with open(outputs_file_name, 'w+') as fd:
		json.dump(clusters, fd, ensure_ascii=False, indent=4)

	LOGGER.info('finished.')


main()