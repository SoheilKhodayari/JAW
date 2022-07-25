
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
	JS Stream Collector Module
	:collects and processes JS from a web page
	
"""


import os
import time
import sys, re
from bs4 import BeautifulSoup
import requester as RequesterModule
import selenium_module as seleniumModule
import constants as constantsModule 
import uuid
from url_finder import get_base_url
# ----------------------------------------------------------------------- #
#				Utils
# ----------------------------------------------------------------------- #

def get_short_uuid():

	return str(uuid.uuid4())[:8]

def _get_data_external_links(scripts, driver=None):
	"""
	@param scripts: a list of HTML internal scripts and exernal script links (src)
	@returns: an ordered list containing inline scripts and 
			  the contents of the REACHABLE external script links
	"""
	data = []
	if driver is None:
		# use python requests
		for item in scripts:
			script_type = item[0]
			if script_type == "external_script":
				link = item[1]
				d = RequesterModule.requester(link)
				if RequesterModule.is_http_response_valid(d):
					d_str = str(d).strip()
					if (not d_str.startswith("""<!doctype html>""")) and ('doctype html' not in d_str): #ignore the case when resource is HTML, e.g, non-authenticated access via python requests
						data.append([script_type, d, link])
				else:
					## no valid content
					if constantsModule.DEBUG_PRINTS:
						print("+ InvalidResourceURL encountered!")
					continue
			else:
				data.append(item)
		return data
	else:
		# use browser
		for item in scripts:
			script_type = item[0]
			if script_type == "external_script":
				link = item[1]
				current_handle = driver.current_window_handle
				driver.execute_script("""window.open('', '_blank')""") # new tab
				time.sleep(1)
				driver.switch_to_window(driver.window_handles[1])
				driver.get(link)
				time.sleep(1)
				d = driver.page_source
				driver.close() # closes the new tab
				driver.switch_to_window(current_handle)


				dp = BeautifulSoup(d, 'html.parser')
				d_str = dp.find('pre', recursive=True) # js is rendered in a pre tag in chrome
				if d_str is None: 
					continue
				else:
					d_str = d_str.text # get the 'pre' tag content

				if (not d_str.startswith("""<!doctype html>""")): #ignore the case when resource is HTML, e.g, non-authenticated access via python requests
					data.append([script_type, d_str, link])
				else:
					## no valid content
					if constantsModule.DEBUG_PRINTS:
						print("+ InvalidResourceURL encountered!")
					continue
			else:
				data.append(item)
		return data

def _normalize_js_library_names(libs):
	"""
	@param {array} libs: a list of string items of format libraryName:libraryVersion 
	@return a list of lowercase library names with whitespace removed 
	"""
	out = []
	for lib_pair in libs:
		elements = lib_pair.split(":")
		if(len(elements)):
			# remove whitespace
			name1 = elements[0].replace(" ","").lower()
			# replace whitespace with dash
			name2 = name = elements[0].replace(" ","-").lower()
			# remove versioning numbers 
			digits_pattern = '[0-9]'
			name3 = name1
			name3 = re.sub(digits_pattern, '', name3)
			out += [name1, name2, name3]

	out+= constantsModule.JS_LIB_DETECTION_ALWAYS_CHECK_FOR
	return out


# ----------------------------------------------------------------------- #
#				Main
# ----------------------------------------------------------------------- #

def is_valid_script_type(input_type):
	
	"""
	@param {string} type
	@return {boolean} whether or not type is a valid javascript MIME type
	"""

	input_type = input_type.lower()

	# according to: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#JavaScript_types
	valid_mime_types = [
		"text/javascript",
		"application/javascript",
		"application/ecmascript",
		"application/x-ecmascript ",
		"application/x-javascript ",
		"text/ecmascript",
		"text/javascript1.0 ",
		"text/javascript1.1 ",
		"text/javascript1.2 ",
		"text/javascript1.3 ",
		"text/javascript1.4 ",
		"text/javascript1.5 ",
		"text/jscript ",
		"text/livescript ",
		"text/x-ecmascript ",
		"text/x-javascript"]

	for each_valid_type in valid_mime_types: 
		if each_valid_type in input_type: # @note: in firefox one may have: type="text/javascript;version=1.8"
			return True
	return False


def get_external_resource(resource_url):
	"""
	@param {string} resource_url
	@return {string} http response if valid, o/w empty string
	"""

	response = RequesterModule.requester(resource_url)
	if RequesterModule.is_http_response_valid(response):
		return response
	return ''

def get_dynamic_data(siteId, url, driver= None, close_conn= True, internal_only=False):
	"""
	@returns: 
		None if url is not reachable
		O.W. a list containing page_content + soup_content + scripts (internal & external) from a reachable URL
	"""
	if not driver:
		driver = seleniumModule.get_new_browser()
	try:
		driver.get(url)
	except:
		# url unreachable
		return None

	driver.execute_script(open(constantsModule.JS_LIB_DETECTION_FILE_PATH_NAME, "r").read())
	time.sleep(constantsModule.JS_LIB_DETECTION_WAIT_TIME)


	# Note: 
	# We skip re-analyzing JS libriares embedded in the pages
	# to make the JS property graph analyzer return faster
	# and prevent re-analyzing millions of (similar) nodes 
	# on our Neo4j DB for every single URL
	jslibs = constantsModule.JS_LIB_DETECTION_DEFAULT_LIST_WHEN_FAILED
	jslibs += constantsModule.JS_LIB_DETECTION_ALWAYS_CHECK_FOR
	try:
		elements = driver.find_elements_by_class_name(constantsModule.JS_LIB_DETECTION_SLUG_CLASS_OUTPUT)
		if(len(elements) > 0):
			lib_detection_output = elements[0].text
			libs_list = lib_detection_output.split(',')
			jslibs = _normalize_js_library_names(libs_list)
	except:
		if constantsModule.DEBUG_PRINTS:
			print("[Warning]: selenium found no library detection outputs!")

	page_content = driver.page_source
	soup_content = BeautifulSoup(page_content, "html.parser")

	domain = get_base_url(url)

	library_links = {} # lib name -> lib address
	scripts = []
	internals = []
	for i in soup_content.find_all("script"):
		if not i.get('src'):
			if not i.get('type'):
				# script contains JS if type is absent
				scripts.append(['internal_script', i.string])
				internals.append(['internal_script', i.string])
			else:
				script_type = i.get('type')
				# filter out text/json, etc
				if is_valid_script_type(script_type): 
					scripts.append(['internal_script', i.string])
					internals.append(['internal_script', i.string])	

		else:
			relative_link = i.get('src').lstrip('/')
			if relative_link.startswith('//'):
				link = relative_link.lstrip('//')
			elif relative_link.startswith('www'):
				link = "http://" + relative_link
			elif relative_link.startswith('http'):
				link = relative_link
			else:
				link = domain + '/' + relative_link

			# filter libs by checking if the keyword of any library names exists in link string:
			addLink = True
			for keyword in jslibs:
				if keyword in link and addLink == True:
					addLink = False
					key = keyword + "___" + get_short_uuid() 
					library_links[key] = link 
					break
			if addLink:
				if constantsModule.DEBUG_PRINTS:
					print("++ Ext JS Link: %s"%link)

				if not i.get('type'):
					scripts.append(['external_script', link])
				else:
					script_type = i.get('type')
					if is_valid_script_type(script_type):
						scripts.append(['external_script', link])

	if internal_only:
		all_scripts = internals
	else:
		all_scripts = _get_data_external_links(scripts, driver=driver)

	if close_conn:
		driver.close()
		
	return [page_content, soup_content, all_scripts, library_links]

### USAGE EXAMPLES:
# print(get_dynamic_data("https://google.com"))
# print(_get_chrome_console_logs(d))


def combine_js_scripts(dynamic_data):
	"""
	@returns:
		a single string containing the combined JS code of different files
	"""
	out = []
	scripts = dynamic_data[2]
	for each_script_item in scripts:
		script_content = each_script_item[1]
		if each_script_item[0] == 'internal_script':
			# remove HTML comment obfuscation in the start and end of inline script tags <!-- and -->
			script_content = script_content.strip().lstrip('<!--').rstrip('-->')
		out.append(script_content)
	js = "\n".join(out)
	return js

def process_inline_dom_javascript(page_content, soup_content):
	"""
	@description: handle the javascript code in HTML tag attributes
	@param {string} page_content: html page as string 
	@param {BeautifulSoup} soup_content: beautiful soup object of html page
	@returns {None} transforms inline DOM-Tree javascripts of 
			 HTML elements (e.g., onerror='func()') to  
			 pure javascript code
	"""

	# @doc: https://stackoverflow.com/questions/2706109/are-event-handlers-in-javascript-called-in-order
	def _has_inline_event(tag):

		boolean = False
		for evt in constantsModule.JS_EVENT_NAMES:
			boolean = tag.has_attr("on%s"%evt)
			if boolean: return True
		return boolean

	def _escape_quotes(s):
		return s.replace("\'","\\'").replace("\"","\\\"")

	def _create_js_query_selector_for_element(tag):
		
		attrs = tag.attrs
		if 'id' in attrs:
			return """document.getElementById('%s')"""%attrs['id']
		if 'src' in attrs:
			selector_value = str(attrs['src'])
			if not selector_value.startswith('data:image'):
				return """document.querySelector('%s[src="%s"]')"""%(tag.name, attrs['src'])
		for attr in attrs:
			if attr.startswith('data-'):
				return """document.querySelector('%s[%s="%s"]')"""%(tag.name, attr, attrs[attr])
		if 'name' in attrs:
			return """document.querySelector('%s[name="%s"]')"""%(tag.name, attrs['name'])
		if 'class' in attrs:
			return  """document.querySelector('%s[class="%s"]')"""%(tag.name, ' '.join(attrs['class'])) #attrs[class] is a list of class names for the elements
		if 'href' in attrs:
			return  """document.querySelector('%s[href="%s"]')"""%(tag.name, attrs['href'])
		return  """document.querySelector('%s')"""%(tag.name)	

	out = []
	template = """
	%s.addEventListener('%s', function() {
		%s
	});
	"""

	# @doc https://www.crummy.com/software/BeautifulSoup/bs4/doc/#navigating-the-tree
	tags = soup_content.find_all(_has_inline_event)
	for tag in tags:
		attrList = tag.attrs
		for attr in attrList:
			if attr.startswith('on'):
				value = tag.attrs[attr]
				if value.startswith('javascript:'):
					value = value[value.index('javascript:')+len('javascript:'):]
				selector = _create_js_query_selector_for_element(tag)
				js = template%(selector, attr, value)
				out.append(js)

	return '\n'.join(out)





