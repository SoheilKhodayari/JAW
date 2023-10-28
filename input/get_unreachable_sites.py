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
	Generates a list of unreachable websites from a given sitelist


	Usage:
	------------
	$ python3 -m input.get_unreachable_sites --input=tranco_N7QWW_unique.csv --output=sitelist_unreachable.csv --cut=15218

"""


# native imports
import io
import subprocess
import os
import argparse
import pandas as pd
import requests

# custom imports
import constants as constantsModule
from utils.logging import logger as LOGGER



def folder_exists(folder_name):
	"""
	checks if a url is up by:
		- checking if it has been successfully crawled recently
	"""

	if os.path.exists(os.path.join(constantsModule.DATA_DIR, folder_name)):
		return True

	return False


def is_website_up(uri):
	"""
	checks if a url is up by:
		- sending a python request
	"""

	try:
		response = requests.head(uri, timeout=10)
		return True
	except Exception as e:
		return False


def get_name_from_url(url):
	return url.replace(':', '-').replace('/', '');


def main():

	INPUT_FILE_NAME_DEFAULT = "tranco_N7QWW_unique.csv"
	OUTPUT_FILE_NAME_DEFAULT = "sitelist_unreachable.csv"


	p = argparse.ArgumentParser(description='This script generates a list of unreachable websites from a given sitelist.')
	p.add_argument('--input', "-I",
					metavar="FILE",
					default=INPUT_FILE_NAME_DEFAULT,
					help='top-site list file name (default: %(default)s)',
					type=str)

	p.add_argument('--output', "-O",
					metavar="FILE",
					default=OUTPUT_FILE_NAME_DEFAULT,
					help='output file name (default: %(default)s)',
					type=str)


	p.add_argument('--cut', "-C", type=int, default=20000, help='the threshold for maximum number of entries to consider in the sitelist (default: %(default)s)')


	args= vars(p.parse_args())
	input_file_name = args["input"]
	output_file_name = args["output"]
	max_threshold =  int(args["cut"])

	if input_file_name == INPUT_FILE_NAME_DEFAULT:
		input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

	if output_file_name == OUTPUT_FILE_NAME_DEFAULT:
		output_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), OUTPUT_FILE_NAME_DEFAULT)


	chunksize = 10**5
	iteration = 0
	done = False
	out_rows = []
	new_side_index = 1

	up_but_not_crawled = []

	for chunk_df in pd.read_csv(input_file_name, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		if done:
			break

		iteration = iteration + 1
		for (index, row) in chunk_df.iterrows():
			g_index = iteration*index+1

			rank = row[0]
			etld_url =row[1].strip().strip('\n').strip()
			url = 'http://' + etld_url
			folder_name = get_name_from_url(url)
				
			already_crawled = folder_exists(folder_name)
			if not already_crawled:
				is_up = is_website_up(url)

				if not is_up:
					out_rows.append([str(new_side_index), etld_url, str(rank)])
					new_side_index += 1
				else:
					up_but_not_crawled.append([str(rank), etld_url])

			if g_index > max_threshold:
				done = True
				break

	with open(output_file_name, "w+") as fd:
		length = len(out_rows)
		for i in range(length):
			row = out_rows[i]
			row_string = str(','.join(row))
			row_string = row_string.strip().strip('\n').strip()
			if i < length - 1:
				fd.write(row_string + '\n')
			else:
				fd.write(row_string)


	with open(os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_failed_crawled.csv"), "w+") as fd:
		length = len(up_but_not_crawled)
		for i in range(length):
			row = up_but_not_crawled[i]
			row_string = str(','.join(row))
			row_string = row_string.strip().strip('\n').strip()
			if i < length - 1:
				fd.write(row_string + '\n')
			else:
				fd.write(row_string)


if __name__ == "__main__":
	main()