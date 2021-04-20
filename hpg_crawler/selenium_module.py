
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
	Selenium Setup and Utility Functions
	
"""

import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import config as CrawlerConfig

# ----------------------------------------------------------------------- #
#				Constants & Globals
# ----------------------------------------------------------------------- #


CHROME = 'chrome'

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
EXTENTIONS_ROOT = os.path.join(BASE_DIR, 'extensions')
EVENT_LOGGER_EXTENTION_CRX = os.path.join(os.path.join(EXTENTIONS_ROOT, "event-logger-crx"), "event-logger.crx")
REQUEST_CAPTURE_EXTENSION_CRX = os.path.join(os.path.join(EXTENTIONS_ROOT, "xhr-crx"), "xhr.crx")
# ----------------------------------------------------------------------- #
#				Utils
# ----------------------------------------------------------------------- #

def get_headless_chrome_instance():

	"""
	@return {seleniumDriver}: headless chromer driver instance
	"""
	chrome_options = Options()
	chrome_options.add_argument('--no-sandbox')
	chrome_options.add_argument("--headless")
	chrome_options.add_argument('--disable-dev-shm-usage')

	if CrawlerConfig.USE_DOCKER:
		driver = webdriver.Chrome(CrawlerConfig.CHROME_DRIVER_DOCKER, options=chrome_options)
	else:
		driver = webdriver.Chrome(CrawlerConfig.CHROME_DRIVER, options=chrome_options)

	return driver



def get_new_browser(name= CHROME, headless_mode=False, xhr_logger=False, event_logger=False):
	"""
		@param name: browser name
		@return: selenium driver handle to the browser or None (if browser not supported)
	"""
	if name == CHROME:
		chrome_options = Options()
		chrome_options.add_argument('--no-sandbox')
		chrome_options.add_argument('--disable-dev-shm-usage')
		if headless_mode:
			chrome_options.add_argument("--headless")

		if xhr_logger:
			# add request capture extension
			chrome_options.add_extension(REQUEST_CAPTURE_EXTENSION_CRX)

		
		if event_logger:
			## add event_logger extension
			chrome_options.add_extension(EVENT_LOGGER_EXTENTION_CRX)
			
		# Read console logs added by event_logger
		# @See: https://stackoverflow.com/questions/20907180/getting-console-log-output-from-chrome-with-selenium-python-api-bindings
		d = DesiredCapabilities.CHROME
		d['goog:loggingPrefs'] = { 'browser':'ALL' }

		if CrawlerConfig.USE_DOCKER:
			driver = webdriver.Chrome(CrawlerConfig.CHROME_DRIVER_DOCKER, options=chrome_options, desired_capabilities=d)
		else:
			driver = webdriver.Chrome(CrawlerConfig.CHROME_DRIVER, options=chrome_options, desired_capabilities=d)
		return driver

	return None

def get_chrome_console_logs(driver):
	"""
	@param driver: selenium browser handle
	@returns: list of log entries
	"""
	return driver.get_log('browser')


def get_xhr_logger_extension_data(driver):
	"""
	@param {pointer} driver: selenium browser handle
	@returns {dict} data collected by logging extension about xhr calls and form submissions!
	"""
	out = {
		'without_data': [],
		'with_data': [],
		'succ': []
	}
	reqs_wob = 'EXCHANGE_TOKEN_REQ_WITHOUT_DATA' # all requests without body
	reqs_wob_elements = driver.find_elements_by_class_name(reqs_wob)

	reqs_wb = 'EXCHANGE_TOKEN_REQ_WITH_DATA' # all requests with body
	reqs_wb_elements = driver.find_elements_by_class_name(reqs_wb)

	reqs_succ = 'EXCHANGE_TOKEN_REQ_SUCC' # requests with 2xx HTTP server response (accepted requests)
	reqs_succ_elements =  driver.find_elements_by_class_name(reqs_succ)

	for el in reqs_wob_elements:
		d = el.get_attribute('innerHTML')
		try:
			# de-searilize if possible
			k = json.loads(d)
		except:
			k = d
		out['without_data'].append(k)

	for el in reqs_wb_elements:
		d = el.get_attribute('innerHTML')
		try:
			# de-searilize if possible
			k = json.loads(d)
		except:
			k = d
		out['with_data'].append(k)

	for el in reqs_succ_elements:
		d = el.get_attribute('innerHTML')
		try:
			# de-searilize if possible
			k = json.loads(d)
		except:
			k = d
		out['succ'].append(k)
		
	return out


"""
	---------------------------------------------------------
	 Test your correct Chrome driver and Xvfb configuration:
	---------------------------------------------------------

	from xvfbwrapper import Xvfb
	vdisplay = Xvfb()
	vdisplay.start()

	from pyvirtualdisplay import Display
	display = Display(visible=0, size=(800, 600))
	display.start()

	driver = get_new_browser(headless_mode=False, xhr_logger=True, event_logger=True)
	driver.get('https://google.com')
	display.stop()

	vdisplay.stop()
	---------------------------------------------------------
"""



