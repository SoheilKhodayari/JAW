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
	converts /outputs/patterns/site_req_pattern_mapping_dast_final.json to /input/site_req_pattern_mapping_dast_final_flat.csv

	Running:
	------------
	$ python3 -m scripts.utility.get_dast_site_list_from_dast_patterns --file=$(pwd)/outputs/patterns/site_req_pattern_mapping_dast_final.json

"""

import os
import sys
import json 
import argparse
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule


def main():

	DAST_FLOW_LIST_IN_FILE_DEFAULT = os.path.join(constantsModule.PATTERN_DIR, "site_req_pattern_mapping_dast_final.json")
	DAST_FLOW_LIST_OUT_FILE = os.path.join(constantsModule.INPUT_DIR, "site_req_pattern_mapping_dast_final_flat.csv")

	p = argparse.ArgumentParser(description='json to csv converter.')
	p.add_argument('--file', "-I",
		  metavar="FILE",
		  default=DAST_FLOW_LIST_IN_FILE_DEFAULT,
		  help='list of sites and their request patterns in json (default: %(default)s)',
		  type=str)


	args= vars(p.parse_args())
	DAST_FLOW_LIST_IN_FILE = args["file"]

	outputs = []
	if os.path.exists(DAST_FLOW_LIST_IN_FILE):
		with open(DAST_FLOW_LIST_IN_FILE, 'r') as fd:
			content = json.load(fd)
			for pattern in content:
				webpages = content[pattern]
				outputs.extend(webpages)

		with open(DAST_FLOW_LIST_OUT_FILE, 'w+') as fd:
			for obj in outputs:
				fd.write(obj + '\n')
		LOGGER.info('export successful')
	else:
		LOGGER.error('input file does not exist: %s'%DAST_FLOW_LIST_IN_FILE)

if __name__ == '__main__':
	main()
