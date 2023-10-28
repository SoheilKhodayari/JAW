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
	generates a JSON file containting the final webpages that need to be analyzed
		
		- eliminates near-duplicates
		- then, consider a maximum of M webpages per site
		- to choose the M pages, it prioritizes webpages based on the number of relevant dynamic taintflows of each webpage
		- then, it outputs a JSON file containing the unique webpages considered per site

	Running:
	------------
	$ python3 -m scripts.process_clusters_of_pages --sitelist=sitelist_crawled.csv --top_n=10000 --clusters=/path/to/webpage_clusters.json --taintflows=taintflows_count

"""

import os, sys
import json
import argparse

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule




def get_pages_with_highest_taint_flow_count_across_clusters(webpages, n_pages):

	"""
	@param n: number of pages to select
	@param webpages: JSON-like object with the structure of {page1 -> [`page-cluster-hash-1`, taintcount], page2 -> ...}

	@return list of pages with the highest taintflows across different clusters
	"""
	all_pages = dict(sorted(webpages.items(), key=lambda x: x[1][1], reverse=True))
	out_pages = []
	out_page_hashes = []

	for page in all_pages:
		page_hash = all_pages[page][0]
		page_taintflow_count = all_pages[page][1]
		if page_hash not in out_page_hashes:
			out_page_hashes.append(page_hash)
			out_pages.append(page)
	
	if len(out_pages) <= n_pages:
		return out_pages
	else:
		return out_pages[:n_pages]

def main():


	SITE_LIST_FILE_NAME = 'sitelist_crawled.csv'
	TAINTFLOWS_COUNT_FILE_NAME_DEFAULT = 'taintflows_count.json'
	CLUSTERS_FILE_NAME_DEFAULT = 'webpage_clusters.json'
	

	OUTPUT_CLUSTERS_WITH_TAINT_COUNT = 'webpages_clusters_with_taint_count.json' # webpage clusters with the number of taint flows per page
	OUTPUT_CLUSTERS_COUNT = 'webpage_clusters_count.csv' # count of webpage clusters per site
	OUTPUT_CLUSTERS_STAT = 'webpages_clusters_stat.json' # total count of clusters and sites
	OUTPUT_SITELIST_FINAL = 'sitelist_final.csv' # the final list of sites (--top_n) to consider in the analysis among the crawled ones
	OUTPUT_WEBPAGES_FINAL = 'webpages_final.json' # the final list of webpages to analyze per webapp
	OUTPUT_WEBPAGES_FINAL_SITE = 'webpages.json' # the final list of webpages to analyze to be stored in the webapp directory
	
	p = argparse.ArgumentParser(description='This script counts the number of unique webpages per site.')
	
	p.add_argument('--sitelist', "-S",
		  metavar="FILE",
		  default=SITE_LIST_FILE_NAME,
		  help='sitelist file (default: %(default)s)',
		  type=str)

	p.add_argument('--taintflows', "-T",
		  metavar="FILE",
		  default=TAINTFLOWS_COUNT_FILE_NAME_DEFAULT,
		  help='taintflows JSON file showing count of flows per page (default: %(default)s)',
		  type=str)

	p.add_argument('--max_sites', "-N", type=int, default=10000, help='max sites to consider (default: %(default)s)')
	p.add_argument('--max_pages', "-M", type=int, default=50, help='max pages to consider (default: %(default)s)')


	p.add_argument('--clusters', "-I",
		  metavar="FILE",
		  default=CLUSTERS_FILE_NAME_DEFAULT,
		  help='webpage clusters JSON file (default: %(default)s)',
		  type=str)


	args= vars(p.parse_args())
	clusters_file_name = args["clusters"]

	sitelist_file_name = args['sitelist']
	taintflows_file_name = args['taintflows']
	max_sites = int(args['max_sites'])
	max_pages = int(args['max_pages'])


	if clusters_file_name == CLUSTERS_FILE_NAME_DEFAULT:
		clusters_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), CLUSTERS_FILE_NAME_DEFAULT)

	if sitelist_file_name == SITE_LIST_FILE_NAME:
		sitelist_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), SITE_LIST_FILE_NAME)

	if taintflows_file_name == TAINTFLOWS_COUNT_FILE_NAME_DEFAULT:
		taintflows_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), TAINTFLOWS_COUNT_FILE_NAME_DEFAULT)


	sitelist = { }  # site folder name -> site rank or index
	sitelist_url = {} # site folder name  -> site etld
	with open(sitelist_file_name, 'r') as fd:
		lines = fd.readlines()
		for line in lines:
			line_items = line.split(',')
			etld_url = line_items[1].strip().strip('\n').strip()
			url = 'http://' + etld_url
			index = int(line_items[0].strip().strip('\n').strip())
			folder_name = utilityModule.getDirectoryNameFromURL(url)
			sitelist[folder_name] = index
			sitelist_url[folder_name] = etld_url


	# find the sites with non-zero number of webpages
	websites_dict = {}
	websites_clusters = {}
	with open(clusters_file_name, 'r') as fd:
		json_content = json.load(fd)
		count_sites = 0
		for website_folder_name in sitelist:
			if count_sites == max_sites:
				break
			if website_folder_name in json_content:
				unique_page_hashes = json_content[website_folder_name].keys()
				count_web_pages = len(unique_page_hashes)
				if count_web_pages > 0:
					websites_dict[website_folder_name] = count_web_pages
					websites_clusters[website_folder_name] = json_content[website_folder_name]
					count_sites += 1


	stats = {
		'total_sites': 0,
		'total_pages': 0,
	}
	stats['total_sites'] = len(websites_dict.keys())


	websites_clusters_with_taint_count = { } #  webapp-folder -> { `page-cluster-hash-1` -> [{page1: [taintcounts]}, {page2: [taintcounts]}],  `page-cluster-hash-2`: ... }
	websites_clusters_with_taint_count_inverse = { }  # webapp-folder -> {page1 -> [`page-cluster-hash-1`, taintcount], page2 -> ...}
	with open(taintflows_file_name, 'r') as fd:
		taint_flows_count_json = json.load(fd)
		for website_folder_name in websites_clusters:

			websites_clusters_with_taint_count[website_folder_name] = {}
			websites_clusters_with_taint_count_inverse[website_folder_name] = {}

			if website_folder_name in taint_flows_count_json:
				taint_webpages = taint_flows_count_json[website_folder_name]

				page_clusters = websites_clusters[website_folder_name]
				for page_hash in page_clusters:

					websites_clusters_with_taint_count[website_folder_name][page_hash] = []

					page_folder_names = page_clusters[page_hash]
					for page_folder_name in page_folder_names: 

						if page_folder_name in taint_webpages:
							taint_flows_count_list = taint_webpages[page_folder_name] # [n, m, t] where n= relevant flows, m= unique flows, t= total flows
							websites_clusters_with_taint_count[website_folder_name][page_hash].append({page_folder_name: taint_flows_count_list})
							websites_clusters_with_taint_count_inverse[website_folder_name][page_folder_name] = [page_hash, taint_flows_count_list[0]]

						else:
							websites_clusters_with_taint_count[website_folder_name][page_hash].append({page_folder_name: [0, 0, 0]})
							websites_clusters_with_taint_count_inverse[website_folder_name][page_folder_name] = [page_hash, 0]

	dirname = os.path.join(constantsModule.BASE_DIR, "input")

	# count of taint flows per webpage clusters
	with open(os.path.join(dirname, OUTPUT_CLUSTERS_WITH_TAINT_COUNT), 'w+') as fd:
		json.dump(websites_clusters_with_taint_count, fd, ensure_ascii=False, indent=4)

	# count of clusters per website
	with open(os.path.join(dirname, OUTPUT_CLUSTERS_COUNT), 'w+') as fd:
		fd.write("{0}, {1}, {2}\n".format("domain", "considered_page_clusters", "total_page_clusters"))
		for k in websites_dict:
			v = websites_dict[k]
			if v > max_pages:
				considered_pages = max_pages
			else:
				considered_pages = v
			stats['total_pages'] += considered_pages
			fd.write("{0}, {1}, {2}\n".format(k, considered_pages, v))
	
	# generate some statistics about the number of pages and sites
	with open(os.path.join(dirname, OUTPUT_CLUSTERS_STAT), 'w+') as fd:
		json.dump(stats, fd, ensure_ascii=False, indent=4)
	print(stats)

	# generate the sitelist (analysis set)
	with open(os.path.join(dirname, OUTPUT_SITELIST_FINAL), 'w+') as fd:
		idx = 0
		length = len(websites_dict)
		for k in websites_dict:
			idx = idx + 1
			etld = sitelist_url[k]
			if idx == length:
				fd.write('{0},{1}'.format(idx, etld))
			else:
				fd.write('{0},{1}\n'.format(idx, etld))


	# final list of webpages to analyze per website
	# JSON: appname -> [webpage1, webpage2, ...]
	webpages_final = {}
	for webapp_folder_name in websites_clusters_with_taint_count_inverse:
		website_data = websites_clusters_with_taint_count_inverse[webapp_folder_name]
		website_pages = get_pages_with_highest_taint_flow_count_across_clusters(website_data, max_pages)
		webpages_final[webapp_folder_name] = website_pages

	with open(os.path.join(dirname, OUTPUT_WEBPAGES_FINAL), 'w+') as fd:
		json.dump(webpages_final, fd, ensure_ascii=False, indent=4)

	# store the list of webpages to analyze in each webapp directory as well
	for webapp_folder_name in websites_clusters_with_taint_count_inverse:
		webpages = webpages_final[webapp_folder_name]

		webapp_folder_path_name = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
		if os.path.exists(webapp_folder_path_name):
			file_name = os.path.join(webapp_folder_path_name, OUTPUT_WEBPAGES_FINAL_SITE)
			with open(file_name, 'w+') as fd:
				json.dump(webpages, fd, ensure_ascii=False, indent=4)


if __name__ == '__main__':
	LOGGER.info('started processing...')
	main()
	LOGGER.info('finished.')












