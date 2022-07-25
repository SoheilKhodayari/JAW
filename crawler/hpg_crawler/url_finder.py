
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
	Auth-based Crawler Based on Headless Chromium
	:Finds URLs for a given target
	
"""


import time
import random
import os
import tld
import json
import sys
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import config as CrawlerConfig
import sites.sitesmap as sitesmapModule
import selenium_module as seleniumModule


class NavigationStorage(object):

	"""
	Storage Static Class for Crawler Navigation Graph
	"""

	def __init__(self):

		self.navigation_graph = []
		self.navigation_url_id_map = {} # hash map from url to id
		self.url_counter_id = 1
		self.founded_urls = []


def pick_randomly_from(input_list, n_samples):
	"""
	@param {list} input_list
	@param {int} n_samples
	@return a list containing randomly choosen elements from input_list with a length of up to n_sample
	"""
	
	random.shuffle(input_list)
	if len(input_list) > n_samples:
		return input_list[:n_samples]
	else:
		return input_list

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

	# ext = tld.get_tld(url, fix_protocol=fix_protocol)
	# toplevel = '.'.join(urlparse(url).netloc.split('.')[-2:]).split(
	# 	ext)[0] + ext
	# return toplevel

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

def get_base_url(url):
	
	"""
	@description: extract the base part from a given url
	@param {string} url
	@return {string} base part of the given url
	"""
	
	split_result = get_url_parts(url)
	## 	base_url = split_result.scheme + "://" + split_result.netloc  + '/' + path
	## no last path part as it seems that each page is always relative to the top domain, not the path
	base_url = split_result.scheme + "://" + split_result.netloc

	return base_url




def get_protocol_scheme(url):
	"""
	@param {string} url
	@return: get the protocol scheme of a given url
	"""
	http = 'http://'
	https = 'https://'

	if url.startswith(http):
		return http
	elif url.startswith(https):
		return https
	
	return ''

def fix_relative_link(link, preprend_url, fix_prepend=True):
	"""
	@param {string} link: input url
 	@param {string} preprend_url: base path for url (e.g., domain)
 	@param {bool} fix_prepend: whether the prepend_url is base_url or needs to be fixed
 	@return {string} absolute url
	"""

	# check if link is relative
	if link.startswith("http:/") or link.startswith("https:/"):
		return link

	if fix_prepend:
		preprend_url = get_base_url(preprend_url)

	if len(link):
		# handle the case where ./ is at the begining of the link
		if '.' == link[0]:
			link = link.lstrip('.')
			link = link.lstrip('/')
	scheme = get_protocol_scheme(link)
	no_scheme = 0
	if len(scheme) == no_scheme:

		# check if the last of prepend_url has a duplicate part in first part of link
		preprend_url = preprend_url.rstrip('/')
		link = link.lstrip('/')
		prepend_path = get_url_parts(preprend_url).path.strip('/') #IMPORTANT: path may contain '/' on both ends

		# remove duplicate parts of the link iteratively
		done = False
		while not done:
			if '/' in prepend_path:
				idx = prepend_path.rindex('/')
				last = prepend_path[idx+1:]
				if link.startswith(last):
					link = link[link.index(last)+len(last):]
				prepend_path = prepend_path[:idx] # update the path
			else:
				if len(prepend_path):
					last = prepend_path
					if link.startswith(last):
						link = link[link.index(last)+len(last):]
				done = True
				break
		if preprend_url.endswith('/'):
			return preprend_url + link
		else:
			return preprend_url + '/' + link

	return link

def is_valid_link(link):
	"""
	@param {string} link
	@return {boolean} returns whether link is valid or not.
	"""

	link = link.strip()
	for forbidden_type in CrawlerConfig.FILTER_OUT_LINK_TYPES:
		if link.endswith(forbidden_type):
			return False

	if link.startswith('javascript:'):
		return False

	if link.startswith("mailto:"):
		return False

	if link == '#':
		return False
	# if link.startswith('#'):
	# 	return False

	return True

def get_valid_links_and_fix_relative(links, current_url):
	
	"""
	@param {list} links
	@param {string} current_url: url open in headless chrome
	@return {list} list of valid links
	"""

	current_url = get_base_url(current_url)

	# compare: link vs current_url.path
	host = get_url_top_level(current_url)

	out = []
	for link in links:
		if is_valid_link(link):
			url = fix_relative_link(link, current_url, False) 
			if does_url_belong_to_host(url, host): # do not capture/follow urls of other origins
				out.append(url)
	return out


def remove_regex(urls, regex):
	"""
	@description parse a list for non-matches to a regex.
	@param {list} urls: iterable of urls
	@param {string} regex: string regex to be parsed for
	@return {list} list of strings not matching regex
	"""

	if not regex or not len(regex.strip()):
		return urls

	# avoid iterating over the characters of a string
	if not isinstance(urls, (list, set, tuple)):
		urls = [urls]

	try:
		non_matching_urls = [url for url in urls if not re.search(regex, url)]
	except TypeError:
		return []

	return non_matching_urls


def get_current_timestamp():
	"""
	@return {string} get the current timestamp
	"""
	d = datetime.now().strftime('%Y_%m_%d__%H_%M_%S')
	return d

def get_robots_txt():
	
	"""
	process robots.txt file
	"""

	pass


# approach 1: save urls only when opened by browser
# approach 2: save urls when captured by the crawler even if they are not visited by the browser
def find_html_resource_urls(stateful_driver, 
		site_address,
		max_urls = CrawlerConfig.MAX_CRAWLING_URLS_DEFAULT,
		timeout_bucket = CrawlerConfig.TIMEOUT_BUCKET_DEFAULT,
		max_depth = CrawlerConfig.MAX_CRAWLING_DEPTH_DEFAULT,
		max_followed_urls_per_depth = CrawlerConfig.MAX_FOLLOWED_URLS_PER_DEPTH_DEFAULT,
		page_load_time = CrawlerConfig.PAGE_LOAD_WAIT_TIME_DEFAULT):
	
	"""
	@description: breadth-first searching for URLs with presumable content-type of 'text/html' up to max_depth
	@param {pointer} stateful_driver: selenium driver after 'successful' exectuion of the state script
	@param {string} site_address: address to crawl
	@param {int} max_urls: number of urls to find before normal termination, i.e., if found_urls > max_urls, then terminate
	@param {int} timeout_bucket: maximum number of allowed crawling time in seconds
	@param {int} max_depth: maximum depth of breadth-first search for crawler
	@oaran {int} max_followed_urls_per_depth: maximum number of URLs to follow (randomly choosen) at each depth
	@param {int} page_load_time: number of seconds to wait for headless chrome to load each page
	@return {list} list of founded urls
	"""


	def _save_urls_if_new(urls):

		for each_url in urls:
			if "logout" not in each_url:
				navigation_storage.founded_urls.append(each_url)
		navigation_storage.founded_urls = list(set(navigation_storage.founded_urls))

	def _save_url_if_new(url):

		if url not in navigation_storage.founded_urls:
			navigation_storage.founded_urls.append(url)

	def _save_urls_to_navigation_graph(urls, parent_id, depth, navigation_storage):

		if CrawlerConfig.SAVE_NAVIGATION_GRAPH:

			for url in urls:
				if url in navigation_storage.navigation_url_id_map:
					url_id = navigation_storage.navigation_url_id_map[url]
				else:
					url_id = navigation_storage.url_counter_id
					navigation_storage.navigation_url_id_map[url] = navigation_storage.url_counter_id
					navigation_storage.url_counter_id += 1

				obj = {
					"node_id": str(url_id),
					"parent_id": str(parent_id),
					"url": url,
					"depth": str(depth)
				}

				navigation_storage.navigation_graph.append(obj)

		return navigation_storage

	def _get_urls_from_page_and_save(url):	

		try:
			stateful_driver.get(url)
		except:
			err = sys.exc_info()[0]
			print(err)
			return []
			# stateful_driver = seleniumModule.get_headless_chrome_instance()
			
		time.sleep(CrawlerConfig.PAGE_LOAD_WAIT_TIME_DEFAULT)
		
		page_content = stateful_driver.page_source
		soup_content = BeautifulSoup(page_content, "html.parser")

		# selenium failed
		if stateful_driver.current_url.strip() == 'data:,':
			return []

		# if the loaded_url is redirected, or has an added hash fragment, also store that variant
		_save_url_if_new(stateful_driver.current_url)

		# @Note: can capture JS, stylesheet, fonts, imgs, etc in here but not needed for our HTML page crawler
		anchor_links = [ a.get('href') for a in soup_content.find_all('a') if a.get('href') ]
		form_actions = [ form.get('action') for form in soup_content.find_all('form') if form.get('action')]

		links = list(set(anchor_links + form_actions))
		links = get_valid_links_and_fix_relative(links, url)
		return links

	navigation_storage = NavigationStorage()

	tick = time.time()

	navigation_storage = _save_urls_to_navigation_graph([site_address], "None", -1, navigation_storage) 
	first_depth_urls = _get_urls_from_page_and_save(site_address) # 1. inital page scraping
	
	_save_urls_if_new(first_depth_urls) # approach 2: saving

	current_depth_urls = pick_randomly_from(first_depth_urls, max_followed_urls_per_depth)

	done = False
	depth_counter = 0
	founded_urls_dictionary = {}
	founded_urls_dictionary[depth_counter] = first_depth_urls
	navigation_storage = _save_urls_to_navigation_graph(first_depth_urls, navigation_storage.navigation_url_id_map[site_address], depth_counter, navigation_storage)

	while not done:

		passed_time = time.time() - tick
		if passed_time > timeout_bucket:
			done = True
			break

		depth_counter = depth_counter + 1
		if depth_counter not in founded_urls_dictionary:
			founded_urls_dictionary[depth_counter] = []

		for each_url in current_depth_urls:
			if 'logout' in each_url:
				# tweak to disallow logout from logged account (due to login CSRF allowed by this url) 
				continue

			next_depth_urls = _get_urls_from_page_and_save(each_url)
			founded_urls_dictionary[depth_counter].extend(next_depth_urls)
			navigation_storage = _save_urls_to_navigation_graph(next_depth_urls, navigation_storage.navigation_url_id_map[each_url], depth_counter, navigation_storage)
			if len(navigation_storage.founded_urls) >= max_urls:
				done = True
				break

		current_depth_urls = founded_urls_dictionary[depth_counter]
		_save_urls_if_new(current_depth_urls) # approach 2: saving
		current_depth_urls = pick_randomly_from(current_depth_urls, max_followed_urls_per_depth)
		if depth_counter >= max_depth:
			done = True
			break

	return [navigation_storage.founded_urls, navigation_storage.navigation_graph]



def get_logged_driver(driver, site_id, state_index=0):
	"""
	@param driver {pointer}: seleniumDriver instance
	@param site_id {int}: site identifier in global site map
	@param state_index {string}: desigantes which state script function to be executed 
	@return {pointer}: stateful seleniumDriver instance
	"""

	if CrawlerConfig.USE_STATE_SCRIPTS:
		stateModule = __import__("sites.%s.scripts.%s"%(site_id, CrawlerConfig.STATES_SCRIPT_FILE_NAME), fromlist=["states"])
		states = stateModule.states
		logged_state = states[state_index]
		state_func_ptr = logged_state["function"]
		state_label = logged_state["label"]
		driver = state_func_ptr(driver)
		time.sleep(CrawlerConfig.DRIVER_WAIT_TIME_AFTER_STATE_LOAD)
	
	return driver


def get_seed_url(site_id):

	data = sitesmapModule.get_site_data(site_id)
	if data is None:
		print("ERROR: site with id %s does not exists. please check your inputs."%str(site_id))
		sys.exit(1)
	else:
		seed_url = data[1]
		return seed_url
		
def start_crawler(site_id, state_index=0):

	"""
	@param site_id {int}: site identifier in global site map
	@param state_index {string}: desigantes which state script function to be executed 
	@returns {int}: crawls the target site, and returns a exit code of 0 or 1 upon failure and success, respectively
	"""

	FAILED_EXIT_CODE = 0
	SUCCESS_EXIT_CODE = 1

	print("[*] started URL discovery for site %s"%site_id)
	site_id = str(site_id)
	driver = seleniumModule.get_headless_chrome_instance()
	driver = get_logged_driver(driver, site_id)
	seed_url = get_seed_url(site_id)


	[urls, navigation_graph] = find_html_resource_urls(driver, seed_url)

	if len(urls) > 0:

		base = CrawlerConfig.CRAWLER_BASE_DIR
		directory = os.path.join(os.path.join('sites', site_id), 'urls')
		save_path = os.path.join(base, directory)
		if not os.path.exists(save_path):
			os.makedirs(save_path)

		save_path_name = os.path.join(save_path, CrawlerConfig.URLS_SAVE_FILE_NAME + '.out')
		navigation_graph_path_name = os.path.join(save_path, CrawlerConfig.NAVIGATION_GRAPH_SAVE_FILE_NAME + '.json')
		
		# check if such file already exists
		if os.path.isfile(save_path_name):
			save_path_name = save_path_name.rstrip('.out') + "_" + get_current_timestamp() + '.out'

		if os.path.isfile(navigation_graph_path_name):
			navigation_graph_path_name = navigation_graph_path_name.rstrip('.json') + "_" + get_current_timestamp() + '.json'

		with open(save_path_name, 'w+') as fp:
			for url in urls:
				fp.write("%s\n"%(url))

		with open(navigation_graph_path_name, 'w+') as fd:
			json_content= {"navigation_graph": navigation_graph}
			json.dump(json_content, fd)


	print("[*] finished URL discovery for site %s"%site_id)
	return SUCCESS_EXIT_CODE
	
	






