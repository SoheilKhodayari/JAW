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
	reads the `webpages_hpg_const_failed.csv` file to count the number of failed pages and sites

	Running:
	------------
	$ python3 -m scripts.get_hpg_construction_statistics 

"""

import os, sys
import json
import argparse
import pandas as pd
import statistics
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule




def main():

	INPUT_FILE_NAME_DEFAULT = 'webpages_hpg_const_failed_retry.csv'

	file_path_name = os.path.join(constantsModule.INPUT_DIR, INPUT_FILE_NAME_DEFAULT)
	
	sites_dict = {}
	with open(file_path_name, 'r') as fd:
		lines = fd.readlines();
		for line in lines:
			website = line[:line.index('/')]
			if website in sites_dict:
				sites_dict[website] = sites_dict[website] + 1
			else:
				sites_dict[website] = 1



	pages = list(sites_dict.values())
	total_sites = len(sites_dict)
	total_pages = sum(pages)
	avg_num_of_pages_per_site = statistics.mean(pages)

	print("total sites affected: {0}\ntotal pages affected: {1}\naverage pages affected per site: {2}\n".format(total_sites, total_pages, avg_num_of_pages_per_site))

	LOGGER.info('finished.')


main()