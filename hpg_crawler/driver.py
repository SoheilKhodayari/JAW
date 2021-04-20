
"""
	Copyright (C) 2020  Soheil Khodayari, CISPA
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
	Driver Program for the Crawler's Data Collection Module
	
"""


import time
import re
import sys
from urllib.parse import urlparse
import url_finder as CrawlerModule
import utility as crawlerUtilityModule
import config as CrawlerConfig
import selenium_module as seleniumModule
import requester as RequesterModule

if CrawlerConfig.PLATFORM == "linux":
	from pyvirtualdisplay import Display
else:
	# define a psuedo display object
	class Display(object):
		def ___init___(self, visible=0, size=(800, 600)):
			self.tmp = 0

		def start(self):
			self.tmp = 1

		def stop(self): 
			self.tmp = 2

def get_crawler_urls(site_id):

	"""
	@param {string} site_id
	@param {string} url_file_path
	@return {list} crawled urls
	"""

	crawler_exit_status = CrawlerModule.start_crawler(site_id)
	if crawler_exit_status > 0:
		urls_file_path = crawlerUtilityModule.get_urls_directory(site_id)
		if urls_file_path is not None:
			crawled_urls = crawlerUtilityModule.get_urls_file_content(urls_file_path)
			return crawled_urls
		else:
			## some crawling error
			return []
	else:
		return []


def get_site_urls(site_id):

	"""
	@param {string} site_id
	@param {string} url_file_path
	@return {list} urls to test for site
	"""

	url_file_path = crawlerUtilityModule.get_urls_directory(site_id)
	if url_file_path is not None:
		urls = 	crawlerUtilityModule.get_urls_file_content(url_file_path)
		if len(urls) > 0: 
			return urls
		else:
			return get_crawler_urls(site_id)
	else:
		return get_crawler_urls(site_id)


def main_data_collection():

	args = sys.argv

	if len(args) > 1:
		low = int(args[1])
		high = low
		if len(args) > 2:
			high = int(args[2])

		for i in range(low, high+1):

			site_id = args[1]
			# 1. get saved URLs or find URLs if needed
			urls = get_site_urls(site_id)

			# 2. collect js and data of the site, for each URL found
			if CrawlerConfig.PLATFORM == "linux":
				display = Display(visible=0, size=(800, 600))
				display.start()

			driver= seleniumModule.get_new_browser(xhr_logger=True, event_logger=True, headless_mode=False)

			## load predefined states into the browser (e.g., login)
			driver = CrawlerModule.get_logged_driver(driver, site_id)

			for navigation_url in urls:
				# crawlerUtilityModule.collect_site_data(site_id, navigation_url, driver)

				d = RequesterModule.requester(navigation_url)
				## check if the site base address is reachable 
				if RequesterModule.is_http_response_valid(d):
					# try:
						crawlerUtilityModule.collect_site_data(site_id, navigation_url, driver)
					# except BaseException as error:
					# 	print('chrome runinto error for site: %s'%site_id)
					# 	driver= seleniumModule.get_new_browser(xhr_logger=True, event_logger=True, headless_mode=False)
					# 	continue
				else:
					continue


			if CrawlerConfig.PLATFORM == "linux":
				display.stop()

if __name__ == "__main__":
	main_data_collection()




