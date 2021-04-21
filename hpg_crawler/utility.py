
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
	Crawler Utility Module:
	this module collects data (HTML pages, form elements, JS programs, libraries, etc) from a given URL
	
"""


import selenium_module as seleniumModule
import dom_collector as DOMCollectorModule
import html_parser as HTMLParserModule
import config as CrawlerConfig
import sites.sitesmap as sitesmapModule
import requester as RequesterModule
import jsbeautifier
import os
import re
import hashlib
import json
import urllib.parse
import pickle
import uuid
import time
from datetime import datetime
import json

# -------------------------------------------------------------------- # 
"""
	Helper Functions for Data Collection

"""


def get_current_timestamp():
	"""
	@return {string} get the current timestamp
	"""
	d = datetime.now().strftime('%Y_%m_%d__%H_%M_%S')
	return d


def get_output_header_sep():
	"""
	output formatting
	"""

	sep = '====================================================\n'
	return sep


def get_output_subheader_sep():

	"""
	output formatting
	"""
	
	subsep = '----------------------------------------------------\n'
	return subsep



def get_directory_last_part(path):

	"""
	@param {string} path
	@return {string} the last part of the path string
	"""

	return os.path.basename(os.path.normpath(path))


def get_directory_without_last_part(path):

	"""
	@oaram {string} path
	@return {string} omits the last part of the path and returns the remainder
	"""

	index = path.rfind('/')
	if index == -1:
		return path
	remove_str = path[index+1:]
	return path.rstrip(remove_str)

def remove_part_from_str(haystack, needle):
	
	"""
	@param {string} haystack
	@param {string} needle
	return {string} the haystack with the needle removed from it
	"""
	if needle in haystack:
		out = haystack.replace(needle, '')
		return out

	return haystack


def find_nth(haystack, needle, n):
    """
	@param {string} haystack
	@param {string} needle
    @param {int} n
    @return {int} the index of the nth occurence of needle in haystack
    """

    start = haystack.find(needle)
    while start >= 0 and n > 1:
        start = haystack.find(needle, start+len(needle))
        n -= 1
    return start


def _get_last_subpath(s):
	"""
	@param s :input string
	@return the last part of the given directory as string
	"""
	return os.path.basename(os.path.normpath(s))

	
def get_urls_directory(site_id):
	
	"""
	@param {string} site_id
	@return {string} the path to the urls.out file of the target site, None if no such file exists yet
	"""
	
	file_path = os.path.join(os.path.join(os.path.join(CrawlerConfig.SITES_DIRECTORY, str(site_id)), "urls"), "urls.out")
	if(os.path.exists(file_path)):
		return file_path

	return None

# def data_folder_exists(site_id):
# 	"""
# 	checks if the data folder of a given site id exists or not
# 	"""
# 	absolute_path = os.path.join(CrawlerConfig.OUTPUT_DATA_DIRECTORY, str(site_id))
# 	if os.path.exists(absolute_path):
# 		return True
# 	return False


def get_urls_file_content(file_path):
	
	"""
	@param {string} file_path: path to the url file
	@return {list} urls of the file
	"""
	# try:
	fd = open(file_path, 'r')
	content = fd.readlines()
	urls = []
	for url in content:
		if url != '':
			url = url.rstrip('\n')
			urls.append(url)
	fd.close()
	return urls
	# except:
	# 	return []

def _unquote_url(url):
	
	"""
	@param {string} url
	@return {string} decoded url
	"""
	
	out = urllib.parse.unquote(url)
	out = out.replace('&amp;', '&')
	return out


def _hash(s):
	
	"""
	@param {string} s: input string
	@return {string} the same hashed string across all process invocations
	"""
	
	return hashlib.sha256(s.encode('utf-8')).hexdigest()


def _beautify_js(program_path_name):
	
	"""
	beautifies the given js program
	@param {string} program_path_name: input system path to a JS code
	@description: beautifies the target JS code
	@return {None}
	"""

	if CrawlerConfig.BEAUTIFY_FILES: 
		overwrite=True
		try:
			res = jsbeautifier.beautify_file(program_path_name)
		except:
			overwrite = False
		if overwrite:
			with open(program_path_name, 'w') as fp:
				fp.write(res)


def _save_program_libraries(save_directory, lib_links_dictionary):

	"""
	fetches and then saves the given library urls
	@param {string} save_directory
	@param {dict} lib_links_dictionary
	@return {None} 
	"""

	for lib_name in lib_links_dictionary:
		lib_link = lib_links_dictionary[lib_name]
		response = DOMCollectorModule.get_external_resource(lib_link)
		if response != '':
			lib_name = lib_name.split("___")[0]
			lib_save_path = os.path.join(save_directory, lib_name)
			if not os.path.exists(lib_save_path):
				os.makedirs(lib_save_path)

			save_lib_name = get_directory_last_part(lib_link)
			save_lib_name = save_lib_name.rstrip('.js')
			if len(save_lib_name) > 50:
				save_lib_name = str(uuid.uuid4())[:8]
			lib_save_path_name = os.path.join(lib_save_path, save_lib_name) + '.js'
			with open(lib_save_path_name, 'w+') as fp:
				fp.write(response)
			_beautify_js(lib_save_path_name)


def _check_if_req_is_successful(reqId, ks):

	for item in ks:
		if isinstance(item, dict):
			if str(item['requestId']) == str(reqId):
				return [True, str(item['status'])]
		elif type(item) is str:

			pattern = "\"requestId\":\"%s\""%(reqId)
			idx = item.find(pattern)
			if idx != -1:
				haystack = item[idx+len(pattern):]
				# find the pattern status:integer
				needle_pattern = r'\"status\":\d+'
				m = re.findall(needle_pattern, haystack)
				if len(m)>0:
					status_code_str = m[0] # get the first immediate match
					status_code = status_code_str.split(":")[1]
					return [True, status_code]
	not_accepted = '!2xx'
	return [False, not_accepted]



# -------------------------------------------------------------------- # 



def collect_site_data(site_id, url, driver, out_path = CrawlerConfig.OUTPUT_DATA_DIRECTORY):

	"""
	@param {string} site_id
	@param {string} url
	@param {object} driver: selenium driver handle
	@param {string} out_path
	@return {bool} whether or not the operation has succeeded
	"""

	# possible return values
	ERR_INVALID_URL = False
	SUCCESS = True

	# created output file names
	NAME_HTML_UNRENDERED = "html_initial.html"
	NAME_HTML_RENDERED = "html_rendered.html"
	NAME_JS_PROGRAM = "js_program.js"
	NAME_URL_FILE = "navigation_url.out"
	
	NAME_DOCUMENT_PROPS = 'document_props.out'
	NAME_DOCUMENT_PROPS_MACHINE = 'document_props_short.out'
	
	NAME_LIBRARIES_FOLDER = "libraries"
	
	NAME_XHR_LOGS = "request_logs.out"
	NAME_XHR_LOGS_MACHINE = "request_logs_short.out"

	NAME_COOKIE_FILE = "cookies.pkl"
	NAME_COOKIE_FILE_STR = "cookies_str.out"

	NAME_FIRED_EVENTS = "events.out"
	NAME_FIRED_EVENTS_PICKLE = "events_pickle.pkl"


	# prepare save path directories
	# site_map_name = sitesmapModule.get_site_data(site_id)[0]
	output_folder_of_this_site = os.path.join(out_path, str(site_id))
	folder_name_of_this_page = _hash(url)
	output_folder_path_name_of_this_page = os.path.join(output_folder_of_this_site, folder_name_of_this_page)


	if not os.path.exists(output_folder_path_name_of_this_page):
		os.makedirs(output_folder_path_name_of_this_page)


	# save the navigation url
	path_name_navigation_url = os.path.join(output_folder_path_name_of_this_page, NAME_URL_FILE)
	with open(path_name_navigation_url, "wb") as fp:
		fp.write(url.encode('utf-8'))

	# step 2: capture the rendered HTML page and JS
	dynamic_data = DOMCollectorModule.get_dynamic_data(site_id, url, driver, close_conn=False)
	if dynamic_data is None:
		return ERR_INVALID_URL

	time.sleep(1) 

	html_content = dynamic_data[0]
	soup_content = dynamic_data[1]
	js_of_page = DOMCollectorModule.combine_js_scripts(dynamic_data)
	inline_js_of_html = DOMCollectorModule.process_inline_dom_javascript(html_content, soup_content)


	# capture xhr requests via extension for lator use
	xhr_logs = seleniumModule.get_xhr_logger_extension_data(driver)

	# cookies
	cookies = driver.get_cookies()

	# DOM level 3 spec: first inline HTML events are fired, then others
	path_name_js_program = os.path.join(output_folder_path_name_of_this_page, NAME_JS_PROGRAM)
	with open(path_name_js_program, "wb") as fp:
		fp.write(inline_js_of_html.encode('utf-8'))  
		fp.write(b'\n')
		fp.write(js_of_page.encode('utf-8'))
	_beautify_js(path_name_js_program)


	path_name_html_rendered = os.path.join(output_folder_path_name_of_this_page, NAME_HTML_RENDERED)
	with open(path_name_html_rendered, "wb") as fp:
		fp.write(html_content.encode('utf-8'))
		fp.write(b'\n')


	# store individual script files
	scripts_folder = os.path.join(output_folder_path_name_of_this_page, "scripts")
	if not os.path.exists(scripts_folder):
			os.makedirs(scripts_folder)

	script_files = dynamic_data[2]
	script_files_counter = 0

	mappings = {}
	for item in script_files:
		script_files_counter+=1

		script_content = item[1]
		if len(script_content.strip()) == 0: 
			continue

		if item[0] == 'internal_script':
			# remove HTML comment obfuscation in the start and end of inline script tags <!-- and -->
			script_content = script_content.strip().lstrip('<!--').rstrip('-->')

			# @ISSUE fixed: make the implicit reference to internal scripts in the scripts description file explicit  
			mappings[script_files_counter] = 'internal_script'

		else:
			link = item[2]
			mappings[script_files_counter] = link

		script_save_file_name = os.path.join(scripts_folder, str(script_files_counter)+'.js')
		with open(script_save_file_name, "w+") as fd:
			fd.write(script_content)
		_beautify_js(script_save_file_name)


	with open( os.path.join(scripts_folder,"mappings.json"), 'w+', encoding='utf-8') as fd:
		json.dump(mappings, fd, ensure_ascii=False, indent=4)

	# step 3: save library files
	lib_links_dictionary = dynamic_data[3]
	library_output_folder_of_this_site = os.path.join(output_folder_path_name_of_this_page, NAME_LIBRARIES_FOLDER)
	_save_program_libraries(library_output_folder_of_this_site, lib_links_dictionary)


	# create timestamp for reports
	timestamp = get_current_timestamp()
	sep = get_output_header_sep()
	sep_templates = get_output_subheader_sep()


	# step 4: save document and form variables (accessible through document.form_name.input_name)
	document_form_variables = HTMLParserModule.get_document_properties_from_html(soup_content)
	path_name_document_props = os.path.join(output_folder_path_name_of_this_page, NAME_DOCUMENT_PROPS)
	with open(path_name_document_props, 'w+') as fd:
		fd.write(sep)
		fd.write('[timestamp] generated on %s\n'%timestamp)
		fd.write('[description] defined properties in HTML for \'document\' DOM API\n')
		fd.write(sep+'\n\n')

		for counter, elm in enumerate(document_form_variables, start=1):
			fd.write("(%s): %s\n"%(counter, elm))

	path_name_document_props_machine = os.path.join(output_folder_path_name_of_this_page, NAME_DOCUMENT_PROPS_MACHINE)
	with open(path_name_document_props_machine, 'w+') as fd:
		fd.write(str(document_form_variables))


	# step 5: save captured onload requests via extension
	without_data_reqs = xhr_logs['without_data'] # no formData 
	with_data_reqs = xhr_logs['with_data'] # also contains formData
	succ_reqs = xhr_logs['succ'] # all successully accepted requests with 2xx

	path_name_xhr_logs_machine = os.path.join(output_folder_path_name_of_this_page, NAME_XHR_LOGS_MACHINE)
	with open(path_name_xhr_logs_machine, "w+") as fp:
		fp.write(str(xhr_logs))


	# save also a nicer human readable version
	path_name_xhr_logs = os.path.join(output_folder_path_name_of_this_page, NAME_XHR_LOGS)
	with open(path_name_xhr_logs, "w+") as fp:

		for each_request in without_data_reqs:
			try:
				if isinstance(each_request, dict):

					xhr_url = each_request['url']
					xhr_url = _unquote_url(xhr_url)
					xhr_status = _check_if_req_is_successful(each_request['requestId'], succ_reqs)
					fp.write("Navigation_URL: '%s'\n"%(url))
					fp.write("Request_URL: '%s'\n"%(xhr_url))
					fp.write("Request_Accepted: '%s'\n"%(str(xhr_status[0])))
					fp.write("Response_HTTP_Status: '%s'\n"%(str(xhr_status[1])))
					fp.write(sep_templates)
				else:
					d = json.loads(each_request)
					xhr_url = d['url']
					xhr_url = _unquote_url(xhr_url)
					xhr_status = _check_if_req_is_successful(d['requestId'], succ_reqs)
					fp.write("Navigation_URL: '%s'\n"%(url))
					fp.write("Request_URL: '%s'\n"%(xhr_url))
					fp.write("Request_Accepted: '%s'\n"%(str(xhr_status[0])))
					fp.write("Response_HTTP_Status: '%s'\n"%(str(xhr_status[1])))
					fp.write(sep_templates)
			except:
				continue

		for each_request in with_data_reqs:
			try:
				if isinstance(each_request, dict):
					xhr_url = each_request['url']
					xhr_url = _unquote_url(xhr_url)
					form_data_dict = each_request['requestBody']
					form_data_str = str(form_data_dict)
					fp.write("Navigation_URL: '%s'\n"%(url))
					fp.write("Request_URL: '%s'\n"%(xhr_url))
					fp.write("Form_Data: \n%s\n"%(form_data_str))
					xhr_status = _check_if_req_is_successful(each_request['requestId'], succ_reqs)
					fp.write("Request_Accepted: %s\n"%(str(xhr_status[0])))
					fp.write("Response_HTTP_Status: %s\n"%(str(xhr_status[1])))
					fp.write(sep_templates)
				else:
					d = json.loads(each_request)
					xhr_url = d['url']
					xhr_url = _unquote_url(xhr_url)
					form_data_dict = d['requestBody']
					form_data_str = str(form_data_dict)
					fp.write("Navigation_URL: '%s'\n"%(url))
					fp.write("Request_URL: '%s'\n"%(xhr_url))
					fp.write("Form_Data: \n%s\n"%(form_data_str))
					xhr_status = _check_if_req_is_successful(d['requestId'], succ_reqs)
					fp.write("Request_Accepted: '%s'\n"%(str(xhr_status[0])))
					fp.write("Response_HTTP_Status: '%s'\n"%(str(xhr_status[1])))
					fp.write(sep_templates)
			except:
				continue

	# step 6: save cookies
	# @Thanks to: https://stackoverflow.com/questions/15058462/how-to-save-and-load-cookies-using-python-selenium-webdriver
	path_name_cookie_logs = os.path.join(output_folder_path_name_of_this_page, NAME_COOKIE_FILE)
	path_name_cookie_logs_str = os.path.join(output_folder_path_name_of_this_page, NAME_COOKIE_FILE_STR)
	with open(path_name_cookie_logs, "wb") as fp:
		pickle.dump(cookies, fp)

	with open(path_name_cookie_logs_str, "w+") as fd:
		fd.write(str(cookies))


	# step 7: save events
	logs = seleniumModule.get_chrome_console_logs(driver)
	with open(os.path.join(output_folder_path_name_of_this_page, NAME_FIRED_EVENTS_PICKLE), 'wb') as fd:
		pickle.dump(logs, fd)

	with open(os.path.join(output_folder_path_name_of_this_page, NAME_FIRED_EVENTS), 'w+') as fd:
		for log in logs:
			if log['level'] == 'INFO' and log['message'].startswith('chrome-extension://'):
				fd.write(str(log['message'])+'\n')




	d = RequesterModule.requester(url)
	if RequesterModule.is_http_response_valid(d):
		unrendered_html_page = str(d).strip()
	else:
		driver.get("view-source:"+str(url))
		unrendered_html_page = 	driver.page_source

	# save the initial html
	path_name_html_unrendered = os.path.join(output_folder_path_name_of_this_page, NAME_HTML_UNRENDERED)
	with open(path_name_html_unrendered, "wb") as fp:
		fp.write(unrendered_html_page.encode('utf-8'))
		fp.write(b'\n')

	return SUCCESS

















