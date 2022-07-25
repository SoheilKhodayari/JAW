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
	IO utility functions 

"""

import io
import subprocess
import yaml
import zipfile
import os
import shutil
import constants as constantsModule
from threading import Timer
from utils.logging import logger





def load_config_yaml(yaml_file):
	"""
	loads a yaml config into json
	"""
	fd = open(yaml_file, "r")
	config = yaml.safe_load(fd)
	fd.close()
	return config


def run_os_command(cmd, print_stdout=True, timeout=30*60, cwd='default'):
	
	"""
	@description run a bash command
	"""

	def kill(process): 
		logger.warning('process timed out for cmd: %s'%cmd)
		process.kill()

	
	if print_stdout:
		logger.debug('Running command: %s'%cmd)
		
	if cwd == 'default':
		p = subprocess.Popen(cmd, shell=True, stdout = subprocess.PIPE)
	else:
		p = subprocess.Popen(cmd, shell=True, stdout = subprocess.PIPE, cwd=cwd)
	my_timer = Timer(timeout, kill, [p])

	ret = -1
	try:
		my_timer.start()
		if print_stdout:
			for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
				logger.info(line.strip())

		p.wait()
		ret = p.returncode
	except subprocess.TimeoutExpired:
		logger.warning('process timed out for cmd: %s'%cmd)
	finally:
		my_timer.cancel()

	return ret


def bash_command(cmd, cwd=None, timeout=30*60, capture_output=False, log_command=False):
	ret = 1
	try:
		if log_command:
			logger.debug('Running command: %s'%cmd)
		subprocess.run(cmd, cwd=cwd, timeout=timeout, capture_output=capture_output, check=True, shell=True)
	except subprocess.TimeoutExpired as e:
		ret = -1
		logger.warning('TimeoutExpired for cmd: %s'%cmd)
	except subprocess.CalledProcessError as e:
		ret = -1
		logger.warning('CalledProcessError for cmd: %s'%cmd)

	return ret 



# https://stackoverflow.com/questions/8156707/gzip-a-file-in-python
def unzip(path_to_zip_file, directory_to_extract_to):
	with zipfile.ZipFile(path_to_zip_file, 'r') as zip_ref:
	    zip_ref.extractall(directory_to_extract_to)


def compress_graph(webpage_folder_path, node_file=constantsModule.NODE_INPUT_FILE_NAME, edge_file=constantsModule.RELS_INPUT_FILE_NAME):

	cmd1="pigz %s"%(os.path.join(webpage_folder_path, node_file))
	cmd2="pigz %s"%(os.path.join(webpage_folder_path, edge_file))

	bash_command(cmd1)
	bash_command(cmd2)

def decompress_graph(webpage_folder_path, node_file=constantsModule.NODE_INPUT_FILE_NAME, edge_file=constantsModule.RELS_INPUT_FILE_NAME):

	cmd1="pigz -d %s"%(os.path.join(webpage_folder_path, node_file))
	cmd2="pigz -d %s"%(os.path.join(webpage_folder_path, edge_file))
	bash_command(cmd1)
	bash_command(cmd2)


