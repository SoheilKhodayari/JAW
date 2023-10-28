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
	Orchestrates processes for verification of the detected data flows / taint flows
	

	Usage:
	------------
	> analyses.request_hijacking.verification_api as request_hijacking_verification_api

"""


import os
import sys
import time
import json
import constants as constantsModule
import utils.io as IOModule
from utils.logging import logger as LOGGER


def get_name_from_url(url):

	"""
	 @param url: eTLD+1 domain name
	 @return converts the url to a string name suitable for a directory by removing the colon and slash symbols

	"""
	return url.replace(':', '-').replace('/', '')


def start_verification_for_site(cmd, website_url, cwd, timeout=10800, overwrite=False):
	
	webapp_folder_name = get_name_from_url(website_url)
	webapp_data_directory = os.path.join(constantsModule.DATA_DIR, webapp_folder_name)
	if not os.path.exists(webapp_data_directory):
		LOGGER.error("[verification] did not found the webpage directory: "+str(webapp_data_directory))
		return -1

	webpages_json_file = os.path.join(webapp_data_directory, "webpages.json")

	if os.path.exists(webpages_json_file):
		LOGGER.info('[verification] reading webpages.json')
		fd = open(webpages_json_file, 'r')
		webapp_pages = json.load(fd)
		fd.close()

	else:
		LOGGER.info('[verification] webpages.json does not exist; falling back to filesystem.')
		# fall back to analyzing all pages if the `webpages.json` file is missing
		webapp_pages = os.listdir(webapp_data_directory)
		# the name of each webpage folder is a hex digest of a SHA256 hash (as stored by the crawler)
		webapp_pages = [item for item in webapp_pages if len(item) == 64]


	for webpage in webapp_pages:
		webpage_folder = os.path.join(webapp_data_directory, webpage)
		if os.path.exists(webpage_folder):

			LOGGER.warning('[verification] taintflow verification analyis for: %s'%(webpage_folder))
			
			# do NOT re-analyze webpages
			if str(overwrite).lower() == 'false':
				OUTPUT_FILE = os.path.join(webpage_folder, "taintflows_verified.json")
				if os.path.exists(OUTPUT_FILE):
					LOGGER.info('[verification] taintflow verification results already exists for webpage: %s'%webpage_folder)
					continue

			command = cmd.replace("PAGE_URL_HASH", webpage).replace("PAGE_URL_DIR", webpage_folder).replace("DYNAMIC_OR_STATIC", "dynamic")
			ret = IOModule.run_os_command(command, cwd= cwd, timeout=timeout, print_stdout=True, log_command=True)
			LOGGER.info('[verification] finished analyis for: %s'%(webpage_folder))


			# LOGGER.warning('[verification] sink flow verification analysis for: %s'%(webpage_folder))
			# # do NOT re-analyze webpages
			# if str(overwrite).lower() == 'false':
			# 	OUTPUT_FILE = os.path.join(webpage_folder, "sinkflows_verified.json")
			# 	if os.path.exists(OUTPUT_FILE):
			# 		LOGGER.info('[verification] sink flow verification results already exists for webpage: %s'%webpage_folder)
			# 		continue

			# command = cmd.replace("PAGE_URL_HASH", webpage).replace("PAGE_URL_DIR", webpage_folder).replace("DYNAMIC_OR_STATIC", "static")
			# ret = IOModule.run_os_command(command, cwd= cwd, timeout=timeout, print_stdout=True, log_command=True)
			# LOGGER.info('[verification] finished analyis for: %s'%(webpage_folder))



def start_verification_for_page(cmd, webpage_folder, cwd, timeout=10800, overwrite=False, df_type="dynamic"):
	
	webpage_folder_absolute = os.path.join(constantsModule.DATA_DIR,webpage_folder)
	command = cmd.replace("DYNAMIC_OR_STATIC", df_type)

	if os.path.exists(webpage_folder_absolute):

		if df_type == "dynamic":
			LOGGER.warning('[verification] taintflow verification analyis for: %s'%(webpage_folder))
			
			if str(overwrite).lower() == 'false':
				OUTPUT_FILE = os.path.join(webpage_folder_absolute, "taintflows_verified.json")
				if os.path.exists(OUTPUT_FILE):
					LOGGER.info('[verification] taintflow verification results already exists for webpage: %s'%webpage_folder_absolute)
					return -1
		else:
			LOGGER.warning('[verification] sink flow verification analysis for: %s'%(webpage_folder))
	
			if str(overwrite).lower() == 'false':
				OUTPUT_FILE = os.path.join(webpage_folder_absolute, "sinkflows_verified.json")
				if os.path.exists(OUTPUT_FILE):
					LOGGER.info('[verification] sink flow verification results already exists for webpage: %s'%webpage_folder_absolute)
					return -1

		ret = IOModule.run_os_command(command, cwd= cwd, timeout=timeout, print_stdout=True, log_command=True)
		LOGGER.info('[verification] finished analyis for: %s'%(webpage_folder))	

