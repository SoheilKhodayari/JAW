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
	Runs the HPG construction module
	This script is useful for rerunning the model construction phase 
	(e.g., for those pages in which this step failed). 

	Running:
	------------
	$ python3 -m scripts.run_hpg_construction --conf=config.yaml --webpages=webpages_hpg_const_failed.csv

"""

import argparse
import pandas as pd
import os, sys
import requests

import utils.io as IOModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
import constants as constantsModule
import analyses.domclobbering.domc_neo4j_traversals as DOMCTraversalsModule
import analyses.cs_csrf.cs_csrf_neo4j_traversals as CSRFTraversalsModule
import analyses.request_hijacking.static_analysis_api as request_hijacking_api
import analyses.request_hijacking.static_analysis_py_api as request_hijacking_py_api




def main():

	BASE_DIR= constantsModule.BASE_DIR
	CONFIG_FILE_DEFAULT = 'config.yaml'
	PAGELIST_FILE_NAME_DEFAULT = 'webpages_hpg_const_failed.csv'
	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')
	p.add_argument('--conf', "-C",
					metavar="FILE",
					default=CONFIG_FILE_DEFAULT,
					help='pipeline configuration file. (default: %(default)s)',
					type=str)

	p.add_argument('--webpages', "-I",
					metavar="FILE",
					default=PAGELIST_FILE_NAME_DEFAULT,
					help='input webpages. (default: %(default)s)',
					type=str)


	args= vars(p.parse_args())
	config = IOModule.load_config_yaml(args["conf"])
	LOGGER.info("loading config: %s"%str(config))



	# static analysis config
	static_analysis_timeout = int(config["staticpass"]["sitetimeout"])
	static_analysis_memory = config["staticpass"]["memory"]
	static_analysis_per_webpage_timeout = int(config["staticpass"]["pagetimeout"])

	static_analysis_compress_hpg = 'true'
	if "compress_hpg" in config["staticpass"]:
		static_analysis_compress_hpg = config["staticpass"]["compress_hpg"]


	static_analysis_overwrite_hpg = 'false'
	if "overwrite_hpg" in config["staticpass"]:
		static_analysis_overwrite_hpg = config["staticpass"]["overwrite_hpg"]

	if args['webpages'] == PAGELIST_FILE_NAME_DEFAULT:
		testbed_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), PAGELIST_FILE_NAME_DEFAULT)
	else:
		testbed_filename = args['webpages']

	from_row = int(config["testbed"]["from_row"])
	to_row = int(config["testbed"]["to_row"])

	chunksize = 10**5
	iteration = 0
	done = False
	for chunk_df in pd.read_csv(testbed_filename, chunksize=chunksize, usecols=[0], header=None, skip_blank_lines=True):
		if done:
			break

		iteration = iteration + 1
		LOGGER.info("starting to crawl chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
		
		for (index, row) in chunk_df.iterrows():
			g_index = iteration*index+1
			if g_index >= from_row and g_index <= to_row:

				webpage_folder = row[0].strip().rstrip('\n').strip()

				website_folder = webpage_folder.split('/')[0]
				website_url = website_folder.replace('-', ':').replace('http:', 'http://')
				

				# request hijacking
				if config['request_hijacking']['enabled']:
					# static analysis
					if config['request_hijacking']["passes"]["static"]:
						LOGGER.info("static analysis for site at row %s - %s"%(g_index, website_url)) 
						request_hijacking_api.start_model_construction(website_url, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg, specific_webpage=webpage_folder)
						LOGGER.info("successfully finished static analysis for site at row %s - %s"%(g_index, website_url)) 
					

			if g_index > to_row:
				done = True
				LOGGER.info("successfully tested sites, terminating!") 
				break

if __name__ == "__main__":
	main()


