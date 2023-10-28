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
	generates two types of JSON files:
		1. for each webapp, this JSON shows which libraries are used by each webpage
		2. this JSON is created once per webpage, and maps each script to a potential library

	Running:
	------------
	$ python3 -m scripts.get_library_scripts --sitelist=/path/to/sitelist_crawled.csv

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

	INPUT_FILE_NAME_DEFAULT = 'sitelist_crawled.csv'

	p = argparse.ArgumentParser(description='This script generates JSON files showing which library is used by each webpage.')
	p.add_argument('--sitelist', "-I",
		  metavar="FILE",
		  default=INPUT_FILE_NAME_DEFAULT,
		  help='list of sites (default: %(default)s)',
		  type=str)


	args= vars(p.parse_args())
	input_file_name = args["input"]

	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	
	data = {} # app folder name -> {page1: [lib1, lib2], page2: [...], ...}
	chunksize = 10**5
	for chunk_df in pd.read_csv(input_file_name, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		for (index, row) in chunk_df.iterrows():
			etld_url = row[1]
			url = 'http://' + etld_url
			app_name = utilityModule.getDirectoryNameFromURL(url)
			app_path_name = os.path.join(constantsModule.DATA_DIR, app_name)
			if os.path.exists(app_path_name) and os.path.isdir(app_path_name):
				files = os.listdir(app_path_name)
				if len(files) > 1:
					data[app_name]= {}
					for webpage_name in files:
						webpage_path_name = os.path.join(app_path_name, webpage_name)
						if os.path.exists(webpage_path_name) and os.path.isdir(webpage_path_name):
							scripts_mapping_json_file = os.path.join(webpage_path_name, "taintflows.json")
							if os.path.exists(scripts_mapping_json_file):
								json_content = {}
								try:
									fd = open(scripts_mapping_json_file, 'r')
									json_content = json.load(fd)
									fd.close()
								except:
									continue

							## TODO: 
								# for each webpage store a json like:
								# {script_name: lib_name}
								# then, also create a single file like:
								# app_folder_name -> { page1: [lib1, lib2], .... }

	


if __name__ == '__main__':
	LOGGER.info('started processing...')
	main()
	LOGGER.info('finished.')












