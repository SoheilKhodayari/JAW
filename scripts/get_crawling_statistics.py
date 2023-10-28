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
	collects statistics about the crawled data

	Running:
	------------
	$ python3 -m scripts.get_crawling_statistics

"""


import os
import sys
import json 
import hashlib
import pandas as pd
import statistics
import constants as constantsModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule

def get_value_count_of_dict(d):
	"""
	gets the number of values in a dictionary
	"""
	count = 0
	for k in d:
		count += len(list(d[k]))
	return count


def get_values_of_dict(d):
	"""
	gets the number of values in a dictionary
	"""
	vals = []
	for k in d:
		vals += list(d[k])
	return vals



def calculate_stat(taintflow_count_entry, type):
	webpages = list(taintflow_count_entry.keys())
	if type == 'list':

		unique_taintflows_list = []
		all_taintflows_list = []

		for webpage in webpages:
			numbers = taintflow_count_entry[webpage]
			unique_taintflows = numbers[1]
			all_taintflows = numbers[2]
			unique_taintflows_list.append(unique_taintflows)
			all_taintflows_list.append(all_taintflows)

		
		if len(all_taintflows_list) == 0:
			# all taint flows stat
			sum_1 = 0
			min_1 = 0
			avg_1 = 0
			med_1 = 0
			max_1 = 0

			# unique taint flows stat
			sum_2 = 0
			min_2 = 0
			avg_2 = 0
			med_2 = 0
			max_2 = 0		 
		else:
			# all taint flows stat
			sum_1 = sum(all_taintflows_list)
			min_1 = min(all_taintflows_list)
			avg_1 = statistics.mean(all_taintflows_list)
			med_1 = statistics.median(all_taintflows_list)
			max_1 = max(all_taintflows_list)
			
			# unique taint flows stat
			sum_2 = sum(unique_taintflows_list)
			min_2 = min(unique_taintflows_list)
			avg_2 = statistics.mean(unique_taintflows_list)
			med_2 = statistics.median(unique_taintflows_list)
			max_2 = max(unique_taintflows_list)		 

		return [sum_1, min_1, avg_1, med_1, max_1, sum_2, min_2, avg_2, med_2, max_2]

	else:
		relevant_taintflows_list = []
		for webpage in webpages:
			relevant_taintflows = taintflow_count_entry[webpage]
			relevant_taintflows_list.append(relevant_taintflows)


		if len(relevant_taintflows_list) == 0:
			sum_1 = 0
			min_1 = 0
			avg_1 = 0
			med_1 = 0
			max_1 = 0
		else:
			# relevant taint flows stat
			sum_1 = sum(relevant_taintflows_list)
			min_1 = min(relevant_taintflows_list)
			avg_1 = statistics.mean(relevant_taintflows_list)
			med_1 = statistics.median(relevant_taintflows_list)
			max_1 = max(relevant_taintflows_list)

		return [sum_1, min_1, avg_1, med_1, max_1]

def calculate_stat_only_top50_pages(taintflow_count_entry, type, top50_pages):
	webpages = list(taintflow_count_entry.keys())
	if type == 'list':

		unique_taintflows_list = []
		all_taintflows_list = []

		for webpage in webpages:
			if webpage in top50_pages:
				numbers = taintflow_count_entry[webpage]
				unique_taintflows = numbers[1]
				all_taintflows = numbers[2]
				unique_taintflows_list.append(unique_taintflows)
				all_taintflows_list.append(all_taintflows)

		
		if len(all_taintflows_list) == 0:
			# all taint flows stat
			sum_1 = 0
			min_1 = 0
			avg_1 = 0
			med_1 = 0
			max_1 = 0

			# unique taint flows stat
			sum_2 = 0
			min_2 = 0
			avg_2 = 0
			med_2 = 0
			max_2 = 0		 
		else:
			# all taint flows stat
			sum_1 = sum(all_taintflows_list)
			min_1 = min(all_taintflows_list)
			avg_1 = statistics.mean(all_taintflows_list)
			med_1 = statistics.median(all_taintflows_list)
			max_1 = max(all_taintflows_list)
			
			# unique taint flows stat
			sum_2 = sum(unique_taintflows_list)
			min_2 = min(unique_taintflows_list)
			avg_2 = statistics.mean(unique_taintflows_list)
			med_2 = statistics.median(unique_taintflows_list)
			max_2 = max(unique_taintflows_list)		 

		return [sum_1, min_1, avg_1, med_1, max_1, sum_2, min_2, avg_2, med_2, max_2]

	else:
		relevant_taintflows_list = []
		for webpage in webpages:
			if webpage in top50_pages:
				relevant_taintflows = taintflow_count_entry[webpage]
				relevant_taintflows_list.append(relevant_taintflows)


		if len(relevant_taintflows_list) == 0:
			sum_1 = 0
			min_1 = 0
			avg_1 = 0
			med_1 = 0
			max_1 = 0
		else:

			# relevant taint flows stat
			sum_1 = sum(relevant_taintflows_list)
			min_1 = min(relevant_taintflows_list)
			avg_1 = statistics.mean(relevant_taintflows_list)
			med_1 = statistics.median(relevant_taintflows_list)
			max_1 = max(relevant_taintflows_list)

		return [sum_1, min_1, avg_1, med_1, max_1]


def count_webpages_with_at_least_one_taintflow(taintflow_entry):
	"""
	returns the number of webpages that have at least one taint flow
	"""
	webpage_counter = 0
	for webpage in taintflow_entry:
		entry = taintflow_entry[webpage]
		total_flows = entry[2]
		if total_flows > 0:
			webpage_counter += 1

	return webpage_counter

def count_webpages_with_at_least_one_taintflow_in_top50(taintflow_entry, top50_pages):
	"""
	returns the number of webpages that have at least one taint flow among the top50 pages
	"""
	webpage_counter = 0
	for webpage in taintflow_entry:
		if webpage in top50_pages:
			entry = taintflow_entry[webpage]
			total_flows = entry[2]
			if total_flows > 0:
				webpage_counter += 1

	return webpage_counter



def count_webpages_with_at_least_one_relevant_taintflow(taintflow_entry):
	"""
	returns the number of webpages that have at least one relevant taint flow
	"""
	webpage_counter = 0
	for webpage in taintflow_entry:
		entry = taintflow_entry[webpage]
		total_flows = entry
		if total_flows > 0:
			webpage_counter += 1

	return webpage_counter

def count_webpages_with_at_least_one_relevant_taintflow_in_top50(taintflow_entry, top50_pages):
	"""
	returns the number of webpages that have at least one relevant taint flow among the top50 pages
	"""
	webpage_counter = 0
	for webpage in taintflow_entry:
		if webpage in top50_pages:
			entry = taintflow_entry[webpage]
			total_flows = entry
			if total_flows > 0:
				webpage_counter += 1

	return webpage_counter




def sha256sum(filename):
	h  = hashlib.sha256()
	b  = bytearray(128*1024)
	mv = memoryview(b)
	with open(filename, 'rb', buffering=0) as f:
		for n in iter(lambda : f.readinto(mv), 0):
			h.update(mv[:n])
	return h.hexdigest()


## see: https://stackoverflow.com/questions/9629179/python-counting-lines-in-a-huge-10gb-file-as-fast-as-possible
def blocks(files, size=65536):
	while True:
		b = files.read(size)
		if not b: break
		yield b



def get_webpage_loc_and_scripts(scripts):
	lines = 0
	scripts_count = 0
	
	script_line_mapping = {}
	# filter out empty scripts and those that contain a single character due to crawler/CDP error
	for script in scripts:
		sha256 = sha256sum(script)
		with open(script, "r", encoding="utf-8", errors='ignore') as f:
			current_line = sum(bl.count("\n") for bl in blocks(f))
			lines += current_line
			script_line_mapping[sha256] = current_line
			if current_line <= 1:
				if len(str(f.readlines())) > 25:
					scripts_count+=1
			else:
				scripts_count+=1
	return [lines, scripts_count, script_line_mapping]



def get_scripts(directory):

	files = os.listdir(directory)
	outputs = []
	for file in files:
		if file.endswith('.js') and not file.endswith('.min.js'):
			outputs.append(os.path.join(directory, file))

	return outputs



def get_scripts_and_loc_stat(website_folder_name, webpages):

	count_scripts = 0
	min_scripts = 0
	max_scripts = -1

	count_loc = 0
	min_loc = 0
	max_loc = -1


	count_unique_scripts = 0
	count_unique_loc = 0
	script_hashs = []



	website_folder_path_name = os.path.join(constantsModule.DATA_DIR, website_folder_name)
	count_webpages = len(webpages)
	for webpage in webpages:
		webpage_folder = os.path.join(website_folder_path_name, webpage)
		
		current_scripts = get_scripts(webpage_folder)
		count_current_scripts = len(current_scripts)

		[count_current_loc, count_current_scripts, script_line_mapping] = get_webpage_loc_and_scripts(current_scripts)

		count_loc+=count_current_loc
		if count_current_loc < min_loc or min_loc == 0:
			min_loc = count_current_loc
		if count_current_loc > max_loc or max_loc == -1:
			max_loc = count_current_loc	

		count_scripts += count_current_scripts
		if count_current_scripts < min_scripts or min_scripts == 0:
			min_scripts = count_current_scripts
		if count_current_scripts > max_scripts or max_scripts == -1:
			max_scripts = count_current_scripts

		for s in current_scripts:
			digest = sha256sum(s)
			if digest not in script_hashs:
				script_hashs.append(digest)
				if digest in script_line_mapping:
					count_unique_loc+=script_line_mapping[digest]


	count_unique_scripts = len(script_hashs)
	min_unique_scripts = min_scripts
	max_unique_scripts = max_scripts

	min_unique_loc = min_loc
	max_unique_loc = max_loc


	if count_webpages == 0:
		avg_scripts = 0
		avg_unique_scripts = 0
		avg_loc = 0
		avg_unique_loc = 0
	else:
		avg_scripts = count_scripts/count_webpages
		avg_loc = count_loc/count_webpages
		avg_unique_scripts = count_unique_scripts/count_webpages
		avg_unique_loc = count_unique_loc/count_webpages	

	output =  [
		# scripts
		count_scripts, 
		min_scripts,
		avg_scripts,
		max_scripts,
		# loc
		count_loc, 
		min_loc,
		avg_loc,
		max_loc,
		# unique scripts
		count_unique_scripts,
		min_scripts,
		avg_unique_scripts,
		max_scripts,
		# unique loc
		count_unique_loc,
		min_loc,
		avg_unique_loc,
		max_loc
	]
	output = [str(item) for item in output]
	return "\t".join(output)



def main():

	COUNT_SCRIPTS_AND_LOC = False

	SITELIST_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "sitelist_final.csv")
	WEBPAGES_JSON_FILE = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpages_final.json")
	WEBPAGES_CLUSTERS =  os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpage_clusters.json")
	WEBPAGES_CLUSTERS_COUNT =  os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "webpage_clusters_count.csv")

	# the last two numbers in each entry show the number of unique taintflows + all taintflows per webpages
	TAINTFLOWS_COUNT = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "taintflows_count.json")

	# this file contains the number of relevant taint flows (filtered to only relevant sinks and sources)
	# the number for each webpage shows the number of relevant flows of that page
	TAINTFLOWS_COUNT_SOURCE_FILTER = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), "taintflows_count_source_filter.json")


	OUTPUT_TEMPT_DIR = os.path.join(constantsModule.OUTPUTS_DIR, "tempt")
	if not os.path.exists(OUTPUT_TEMPT_DIR):
		os.makedirs(OUTPUT_TEMPT_DIR)



	# ---------------------------------- #
	# data preparation / read into memory
	# ---------------------------------- #
	with open(WEBPAGES_CLUSTERS_COUNT, 'r') as fd:
		with open(os.path.join(OUTPUT_TEMPT_DIR, "webpage_clusters_count.out"), 'w+') as fd2:
			rows = fd.readlines();
			for row in rows:
				columns = row.split(',')
				new_row = [column.strip().rstrip('\n').strip() for column in columns]
				# site; # top50 pages; # unique pages (clusters)
				new_row = '\t'.join(new_row)
				fd2.write(new_row + '\n')


	taintflows_count_json = {}
	with open(TAINTFLOWS_COUNT, 'r') as fd:
		taintflows_count_json = json.load(fd)

	taintflows_count_relevant_filter_json = {}
	with open(TAINTFLOWS_COUNT_SOURCE_FILTER, 'r') as fd:
		taintflows_count_relevant_filter_json = json.load(fd)

	webpage_clusters_json = {}
	with open(WEBPAGES_CLUSTERS, 'r') as fd:
		webpage_clusters_json = json.load(fd)


	webpages_final = {}
	with open(WEBPAGES_JSON_FILE, 'r') as fd:
		webpages_final = json.load(fd)

	# ---------------------------------- #
	# temporary data storage
	# ---------------------------------- #
	
	# site; # total pages;
	list_webpages_total_count = [];

	# site; # all_sum; # all_min; # all_avg; # all_med; # all_median; # unique_sum; # unique_min; # unique_avg; # unique_med; # unique_median; # relevant_sum; # relevant_min; # relevant_avg; # relevant_med; # relevant_median
	list_taintflows_allpages_total_unique_relevant_count = [];
	list_taintflows_top50pages_total_unique_relevant_count = [];

	# script and loc
	list_top50_webpages_script_and_loc_stat = []
	# list_all_webpages_script_and_loc_stat = []

	### count webpages with at least one taint flow of ANY kind, and at least one relevant taintflow, in all and top50 pages
	# site; webpages_with_at_least_one_taintflow; # webpages_with_at_least_one_relevant_taintflow; # webpages_with_at_least_one_taintflow_in_top50; # webpages_with_at_least_one_relevant_taintflow_in_top50;
	list_taintflows_webpage_count = [];

	# ---------------------------------- #
	# loop through sites
	# ---------------------------------- #

	chunksize = 10**5
	iteration = 0
	for chunk_df in pd.read_csv(SITELIST_FILE, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
		iteration = iteration + 1
		LOGGER.info("[CSV] reading chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
		
		for (index, row) in chunk_df.iterrows():
			website_rank = row[0]
			website_url = 'http://' + row[1]
			website_folder_name = utilityModule.getDirectoryNameFromURL(website_url)
			
			# gets the total number of webpages per site
			site_webpage_total_count = get_value_count_of_dict(webpage_clusters_json[website_folder_name]) # gets the number of values in dictionary
			webpage_total_count_row = '{0}\t{1}\n'.format(row[1], site_webpage_total_count)
			list_webpages_total_count.append(webpage_total_count_row)


			### count of scripts and LoC
			# all_webpages = webpage_clusters_json[website_folder_name]
			# all_webpages_script_and_loc_stat =  get_scripts_and_loc_stat(website_folder_name, all_webpages)
			# list_all_webpages_script_and_loc_stat.append(all_webpages_script_and_loc_stat + '\n')
			
			if COUNT_SCRIPTS_AND_LOC:
				top50_webpages = webpages_final[website_folder_name]
				top50_webpages_script_and_loc_stat = get_scripts_and_loc_stat(website_folder_name, top50_webpages)
				list_top50_webpages_script_and_loc_stat.append(top50_webpages_script_and_loc_stat + '\n')


			# taint flows
			taintflows_entry = taintflows_count_json[website_folder_name]			

			if website_folder_name in taintflows_count_relevant_filter_json:
				taintflows_entry_relevant = taintflows_count_relevant_filter_json[website_folder_name]

				### taint flows -> all pages
				taintflows_tempt = calculate_stat(taintflows_entry, 'list') + calculate_stat(taintflows_entry_relevant, 'int')
				taintflows_tempt = [str(item) for item in taintflows_tempt]
				taintflows_tempt = '\t'.join(taintflows_tempt)
				taintflows_allpages_total_unique_relevant_count = row[1] + '\t' + taintflows_tempt + '\n'
				list_taintflows_allpages_total_unique_relevant_count.append(taintflows_allpages_total_unique_relevant_count)

				### taint flows -> top webpages
				top50_pages = webpages_final[website_folder_name]
				taintflows_tempt = calculate_stat_only_top50_pages(taintflows_entry, 'list', top50_pages) + calculate_stat_only_top50_pages(taintflows_entry_relevant, 'int', top50_pages)
				taintflows_tempt = [str(item) for item in taintflows_tempt]
				taintflows_tempt = '\t'.join(taintflows_tempt)
				taintflows_top50pages_total_unique_relevant_count = row[1] + '\t' + taintflows_tempt + '\n'
				list_taintflows_top50pages_total_unique_relevant_count.append(taintflows_top50pages_total_unique_relevant_count)


				### count webpages with at least one taint flow of ANY kind, and at least one relevant taintflow
				webpages_with_at_least_one_taintflow = count_webpages_with_at_least_one_taintflow(taintflows_entry)
				webpages_with_at_least_one_relevant_taintflow = count_webpages_with_at_least_one_relevant_taintflow(taintflows_entry_relevant)
				webpages_with_at_least_one_taintflow_in_top50 = count_webpages_with_at_least_one_taintflow_in_top50(taintflows_entry, top50_pages)
				webpages_with_at_least_one_relevant_taintflow_in_top50 = count_webpages_with_at_least_one_relevant_taintflow_in_top50(taintflows_entry_relevant, top50_pages)


				if webpages_with_at_least_one_relevant_taintflow > webpages_with_at_least_one_taintflow:
					webpages_with_at_least_one_taintflow = webpages_with_at_least_one_relevant_taintflow

				if webpages_with_at_least_one_relevant_taintflow_in_top50 > webpages_with_at_least_one_taintflow_in_top50:
					webpages_with_at_least_one_taintflow_in_top50 = webpages_with_at_least_one_relevant_taintflow_in_top50


				taintflows_webpage_count_row = '{0}\t{1}\t{2}\t{3}\t{4}\n'.format(
					website_url,
					webpages_with_at_least_one_taintflow,
					webpages_with_at_least_one_relevant_taintflow,
					webpages_with_at_least_one_taintflow_in_top50,
					webpages_with_at_least_one_relevant_taintflow_in_top50
				)
				list_taintflows_webpage_count.append(taintflows_webpage_count_row)

			else: 
				### taint flows -> all pages
				taintflows_tempt = calculate_stat(taintflows_entry, 'list') + [0, 0, 0, 0, 0] # json parsing error
				taintflows_tempt = [str(item) for item in taintflows_tempt]
				taintflows_tempt = '\t'.join(taintflows_tempt)
				taintflows_allpages_total_unique_relevant_count = row[1] + '\t' + taintflows_tempt + '\n'
				list_taintflows_allpages_total_unique_relevant_count.append(taintflows_allpages_total_unique_relevant_count)

				### taint flows -> top webpages
				top50_pages = webpages_final[website_folder_name]
				taintflows_tempt = calculate_stat_only_top50_pages(taintflows_entry, 'list', top50_pages) + [0, 0, 0, 0, 0] # json parsing error
				taintflows_tempt = [str(item) for item in taintflows_tempt]
				taintflows_tempt = '\t'.join(taintflows_tempt)
				taintflows_top50pages_total_unique_relevant_count = row[1] + '\t' + taintflows_tempt + '\n'
				list_taintflows_top50pages_total_unique_relevant_count.append(taintflows_top50pages_total_unique_relevant_count)


				### count webpages with at least one taint flow of ANY kind, and at least one relevant taintflow
				webpages_with_at_least_one_taintflow = count_webpages_with_at_least_one_taintflow(taintflows_entry)
				webpages_with_at_least_one_relevant_taintflow = 0
				webpages_with_at_least_one_taintflow_in_top50 = count_webpages_with_at_least_one_taintflow_in_top50(taintflows_entry, top50_pages)
				webpages_with_at_least_one_relevant_taintflow_in_top50 = 0

				if webpages_with_at_least_one_relevant_taintflow > webpages_with_at_least_one_taintflow:
					webpages_with_at_least_one_taintflow = webpages_with_at_least_one_relevant_taintflow

				if webpages_with_at_least_one_relevant_taintflow_in_top50 > webpages_with_at_least_one_taintflow_in_top50:
					webpages_with_at_least_one_taintflow_in_top50 = webpages_with_at_least_one_relevant_taintflow_in_top50


				taintflows_webpage_count_row = '{0}\t{1}\t{2}\t{3}\t{4}\n'.format(
					website_url,
					webpages_with_at_least_one_taintflow,
					webpages_with_at_least_one_relevant_taintflow,
					webpages_with_at_least_one_taintflow_in_top50,
					webpages_with_at_least_one_relevant_taintflow_in_top50
				)
				list_taintflows_webpage_count.append(taintflows_webpage_count_row)




	with open(os.path.join(OUTPUT_TEMPT_DIR, "webpage_total_count.out"), 'w+') as fd2:
		for row in list_webpages_total_count:
			fd2.write(row)

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflows_allpages.out"), 'w+') as fd2:
		for row in list_taintflows_allpages_total_unique_relevant_count:
			fd2.write(row)

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflows_top50pages.out"), 'w+') as fd2:
		for row in list_taintflows_top50pages_total_unique_relevant_count:
			fd2.write(row)

	if COUNT_SCRIPTS_AND_LOC:
		with open(os.path.join(OUTPUT_TEMPT_DIR, "script_and_loc_top50pages.out"), 'w+') as fd2:
			for row in list_top50_webpages_script_and_loc_stat:
				fd2.write(row)

	with open(os.path.join(OUTPUT_TEMPT_DIR, "taintflows_webpage_count.out"), 'w+') as fd2:
		for row in list_taintflows_webpage_count:
			fd2.write(row)



if __name__ == "__main__":
	main()

