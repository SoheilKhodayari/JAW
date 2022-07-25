
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
	------------
	Utility Functions 
	this module contains common methods used by other components

"""

import io
import subprocess
from threading import Timer
import time
import os
import re
import constants as constantsModule
from neo4j import GraphDatabase
from datetime import datetime
import signal
import hashlib
from utils.logging import logger


# -------------------------------------------------------------------------- #
#  		OS Utils
# -------------------------------------------------------------------------- #



def run_os_command(cmd, print_stdout=True, timeout=30*60, prettify=False):
	
	"""
	@description run a bash command 
	@param {string} cmd: bash command
	@return {int} process return code and -1 on timeout
	"""

	def kill(process): 
		process.kill()

	logger.debug('Running command: %s'%cmd)
	p = subprocess.Popen(cmd, shell=True, stdout = subprocess.PIPE)
	my_timer = Timer(timeout, kill, [p])

	ret = -1
	try:
		my_timer.start()
		if print_stdout:
			if not prettify:
				for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
					logger.info(line.strip())
			else:
				lst = []
				for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
					lst.append(line.strip())
				logger.info(re.sub(' +', ' ', '\n'.join(lst)))

		p.wait()
		ret = p.returncode
	except subprocess.TimeoutExpired:
		logger.warning('process timed out for cmd: %s'%cmd)
	finally:
		my_timer.cancel()

	return ret


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

	
		
# -------------------------------------------------------------------------- #
#  		Other Utils
# -------------------------------------------------------------------------- #


def get_output_header_sep():

	sep = '====================================================\n'
	return sep


def get_output_subheader_sep():

	subsep = '----------------------------------------------------\n'
	return subsep



def get_current_timestamp():
	
	"""
	@return {string} current date and time string
	"""
	
	now = datetime.now()
	dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
	return dt_string


def get_unique_list(lst):
	"""
	@param {list} lst
	@return remove duplicates from list and return the resulting array
	"""
	return list(set(lst))


def list_contains(needle, haystack):
	for p in haystack:
		if p.strip() == needle.strip():
			return True
	return False



def _hash(s):
	"""
	@param s :input string
	@return the same hashed string across all process invocations
	"""
	return hashlib.sha256(s.encode('utf-8')).hexdigest()


# -------------------------------------------------------------------------- #
#  		Uitlity Classes
# -------------------------------------------------------------------------- #


class Timeout:
	""" Timeout class using ALARM signal. """

	class Timeout(Exception):
		pass

	def __init__(self, sec):
		self.sec = sec

	def __enter__(self):
		signal.signal(signal.SIGALRM, self.raise_timeout)
		signal.alarm(self.sec)

	def __exit__(self, *args):
		signal.alarm(0)  # disable alarm

	def raise_timeout(self, *args):
		raise Timeout.Timeout()

















