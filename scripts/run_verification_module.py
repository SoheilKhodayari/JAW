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
	$ python3 -m scripts.run_verification_module --webpages=$(pwd)/input/site_req_pattern_mapping_dast_final_flat.csv --from=x --to=y

"""

import argparse
import pandas as pd
import os, sys
import requests

import utils.io as IOModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
import constants as constantsModule

import analyses.request_hijacking.verification_api as request_hijacking_verification_api


def main():

	BASE_DIR= constantsModule.BASE_DIR
	PAGELIST_FILE_NAME_DEFAULT = 'site_req_pattern_mapping_dast_final_flat.csv'
	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')

	p.add_argument('--webpages', "-I",
					metavar="FILE",
					default=PAGELIST_FILE_NAME_DEFAULT,
					help='input webpages. (default: %(default)s)',
					type=str)


	p.add_argument('--from', "-F",
					default=0,
					help='from entry. (default: %(default)s)',
					type=int)

	p.add_argument('--to', "-T",
					default=100,
					help='to entry. (default: %(default)s)',
					type=int)


	args= vars(p.parse_args())


	if args['webpages'] == PAGELIST_FILE_NAME_DEFAULT:
		testbed_filename = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), PAGELIST_FILE_NAME_DEFAULT)
	else:
		testbed_filename = args['webpages']

	from_row = int(args["from"])
	to_row = int(args["to"])


	dynamic_verifier_command_cwd = os.path.join(BASE_DIR, "verifier")

	## request hijacking dynamic verifier
	verification_pass_timeout_perpage = 1800 # in seconds: half an hour
	## TODO: add TMPDIR=/dev/shm to the beginning of the command below to reduce io
	node_dynamic_verfier_command = "node --max-old-space-size=4096 DRIVER_ENTRY --datadir={0} --website=SITE_URL --webpage=PAGE_URL_HASH --webpagedir=PAGE_URL_DIR --type=DYNAMIC_OR_STATIC --browser={1} --service={2}".format(
		constantsModule.DATA_DIR,
		"chrome",
		"http://127.0.0.1:3456"

	)
	node_dynamic_verifier_driver_program = os.path.join(dynamic_verifier_command_cwd, "verify.js")
	node_dynamic_verifier = node_dynamic_verfier_command.replace("DRIVER_ENTRY", node_dynamic_verifier_driver_program)


	chunksize = 10**5
	iteration = 0
	done = False
	for chunk_df in pd.read_csv(testbed_filename, chunksize=chunksize, usecols=[0], header=None, skip_blank_lines=True):
		if done:
			break

		iteration = iteration + 1
		LOGGER.info("starting to test chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
		
		for (index, row) in chunk_df.iterrows():
			g_index = iteration*index+1
			if g_index >= from_row and g_index <= to_row:

				webpage_folder = row[0].strip().rstrip('\n').strip()
				webpage_folder_absolute = os.path.join(constantsModule.DATA_DIR,webpage_folder)
				parts = webpage_folder.split('/')
				website_folder = parts[0]
				website_url = website_folder.replace('-', ':').replace('http:', 'http://')
				webpage_hash = parts[1].strip().rstrip('\n').strip()

				# dynamic verification
				cmd = node_dynamic_verifier.replace("SITE_URL", website_url).replace("PAGE_URL_HASH", webpage_hash).replace("PAGE_URL_DIR", webpage_folder_absolute).replace("DYNAMIC_OR_STATIC", "dynamic")
				request_hijacking_verification_api.start_verification_for_page(cmd, webpage_folder, cwd=dynamic_verifier_command_cwd, timeout=verification_pass_timeout_perpage, overwrite=False)
				LOGGER.info("sucessfully finished dynamic data flow verification for site %s - %s"%(website_url, webpage_hash))

			if g_index > to_row:
				done = True
				LOGGER.info("successfully tested sites, terminating!") 
				break

if __name__ == "__main__":
	main()


