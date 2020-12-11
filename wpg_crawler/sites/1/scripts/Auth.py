# -------------------------------------------------------------------------------- #
# 						Library Imports
# -------------------------------------------------------------------------------- #
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import time, os, sys

# -------------------------------------------------------------------------------- #
# 					  Global Variables
# -------------------------------------------------------------------------------- #
# Place your global variables here

loginURL= "https://s2.demo.opensourcecms.com/sugarcrm/index.php?action=Login&module=Users"


# -------------------------------------------------------------------------------- #
# 				  	   State Functions
# -------------------------------------------------------------------------------- #
# Inputs
# @param driver:	  The selenium driver that the state function must use (and return).
# @param first_phase: The first phase is the URL crawling phase. Used to know if you
# 					  need to use a different credential for each phase. This flag will
#					  be passed as true if the first phase is already completed, false ow.
# 					  NOTE: ignore if un-relevant to state definition
# @param site_url



def get_logged_driver(driver, username_cred, password_cred):

	driver.get(loginURL)
	time.sleep(4)

	username = driver.find_element_by_id("user_name")
	username.send_keys(username_cred)

	password = driver.find_element_by_id("user_password")
	password.send_keys(password_cred)

	submit = driver.find_element_by_id("login_button")
	submit.click()
	time.sleep(5)

	return driver


def User1Login(driver):

	username_cred="opensourcecms"
	password_cred="opensourcecms"

	return get_logged_driver(driver, username_cred, password_cred)

def User2Login(driver):

	username_cred="opensourcecms"
	password_cred="opensourcecms"

	return get_logged_driver(driver, username_cred, password_cred)


# -------------------------------------------------------------------------------- #
# 				  	   Input to Tool
# -------------------------------------------------------------------------------- #
# This is your input states to the tool
# @WARNING do NOT change the name of the variable 'states'
#		   that needs to be imported by the tool. Otherwise,
#		   the tool can NOT identify your states properly.
# @WARNING state labels must only include characters from r'/[\w-]+/' and no UNDERLINES

states = [{"function": User1Login, "label": "User1Login"},
		  {"function": User2Login, "label": "User2Login"}]


### TEST state script ###
# package = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# utils = os.path.join(package, "utils")
# sys.path.insert(0, utils)
# import selenium_utility as seleniumModule
# driver = seleniumModule.get_new_browser()
# User1Login(driver)
