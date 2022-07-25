"""
	Copyright (C) 2021  Soheil Khodayari, CISPA
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
	-------------
	This script removes the duplicate entries with the same eTLD+1
	from the Tranco site list (e.g., google.com vs google.co.uk)
	

	Run:
	------------
	python3 prepare_sitelist --input=tranco_Y3JG.csv
	
"""


import time
import os
import re
import tld
import json
import sys
import argparse
import pandas as pd
import tldextract
from urllib.parse import urlparse



BASE_DIR= os.path.dirname(os.path.realpath(__file__))

def get_url_parts(url):

	"""
	@param {string} url
	@return {SplitResult} extract url parts as SplitResult Object 
	"""

	try:
		res = tld.get_tld(url, as_object=True)
		split_result = res.parsed_url
	except:
		split_result = urlparse(url)

	# @Note: 
	# SplitResult(
	#     scheme='http',
	#     netloc='some.subdomain.google.co.uk',
	#     path='',
	#     query='',
	#     fragment=''
	# )

	return split_result


def get_url_top_level(url, fix_protocol=True):

	"""
	@param {string} url
	@return {string} extract the top level domain from a url
	"""

	split_result = get_url_parts(url)
	return split_result.netloc



def does_url_belong_to_host(url, host):

	"""
	@param {string} url
	@param {string} host (top-level)
	@return {boolean} whether url belongs to host origin
	"""

	host = host.rstrip('/')
	if host in url:
		return True

	return False


def main():

	INPUT_FILE_NAME_DEFAULT = "tranco_Y3JG.csv"
	OUTPUT_FILE_NAME_DEFAULT = "tranco_Y3JG_unique.csv"


	p = argparse.ArgumentParser(description='This script removes the duplicate entries with the same eTLD+1 from a top-site list.')
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

	p.add_argument('--from', "-F", type=int, default=0, help='consider entries from which row (default: %(default)s)')
	p.add_argument('--to', "-T", type=int, default=10000, help='consider entries to which row  (default: %(default)s)')
	p.add_argument('--top_n', "-N", type=int, default=5000, help='output file name (default: %(default)s)')

	args= vars(p.parse_args())
	from_row = args["from"]
	to_row = args["to"]
	top_n = args["top_n"]
	input_file_name = args["input"]
	output_file_name = args["output"]

	in_file = open(input_file_name, "r")
	out_file = open(output_file_name, "w+")

	chunksize = 10**4
	iteration = 0
	done = False

	cache_dir = os.path.join(BASE_DIR, "tldcache")
	# extract callable that reads/writes the updated TLD set to a different path
	tld_extract = tldextract.TLDExtract(cache_dir=cache_dir)

	out_rows=[]

	# TODO: extend this list with other duplicate domains
	duplicate_domain_names = [
		"google",
		"facebook",
		"amazon",
		"youtube",
		"instagram"
	]
	duplicate_domains = [ d +'.com' for d in duplicate_domain_names ]


	for chunk_df in pd.read_csv(in_file, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		if done:
			break

		iteration = iteration + 1
		
		for (index, row) in chunk_df.iterrows():
			g_index = iteration*index+1
			if g_index >= from_row and g_index <= to_row:

				rank = row[0]
				url =row[1]
				
				etld_p1 = tld_extract(url).domain # .suffix = etld
				if url not in duplicate_domains and etld_p1 in duplicate_domain_names:
					# do not add duplicates
					continue

				out_rows.append("{0},{1}\n".format(rank, url))
			if g_index > to_row:
				done = True
				break

	with open(output_file_name, "w+") as fd:
		for i in range(len(out_rows)):
			row = out_rows[i]
			if i < top_n-1:
				fd.write(row)
			elif i == top_n-1:
				fd.write(row.strip('\n'))

if __name__ == '__main__':
	main()



