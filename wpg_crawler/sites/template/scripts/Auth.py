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

loginURL= "REPLACE_WITH_APP_LOGIN_URL>"


# -------------------------------------------------------------------------------- #
# 				  	   State Functions
# -------------------------------------------------------------------------------- #
# Inputs
# @param driver:  The selenium driver that the state function must use (and return).
# @param username_cred:	 username
# @param password_cred:	 password

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

	username_cred="<REPLACE_WITH_USERNAME>"
	password_cred="<REPLACE_WITH_PASS>"

	return get_logged_driver(driver, username_cred, password_cred)

def User2Login(driver):

	username_cred="<REPLACE_WITH_USERNAME>"
	password_cred="REPLACE_WITH_PASS"

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
