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
import signal
import yaml
import zipfile
import os
import re
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


def run_os_command(cmd, print_stdout=True, timeout=30*60, cwd='default', log_command=False, prettify=False):
	
	"""
	@description run a bash command
	"""

	def kill(process): 
		logger.warning('Killing Process.')
		logger.warning('TimeoutExpired (%s seconds) for cmd: %s'%(str(timeout), cmd))
		# kill the whole process group (i.e., including all subprocesses, not just the process)
		# process.kill()
		os.killpg(os.getpgid(process.pid), signal.SIGTERM)
		

	
	if log_command:
		logger.debug('Running command: %s'%cmd)
		
	if cwd == 'default':
		p = subprocess.Popen(cmd, start_new_session=True, shell=True, stdout = subprocess.PIPE, stderr= subprocess.PIPE)
	else:
		p = subprocess.Popen(cmd, start_new_session=True, shell=True, stdout = subprocess.PIPE, stderr= subprocess.PIPE, cwd=cwd)
	my_timer = Timer(timeout, kill, [p])

	ret = -1
	try:
		my_timer.start()

		try:
			if print_stdout:
				if not prettify:
					if p.stdout:
						for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
							if len(line.strip()) > 0:
								logger.info(line.strip())		

					if p.stderr:
						for line in io.TextIOWrapper(p.stderr, encoding="utf-8"):
							if len(line.strip()) > 0:
								logger.info(line.strip())	
				else:
					if p.stdout:
						lst = []
						for line in io.TextIOWrapper(p.stdout, encoding="utf-8"):
							if len(line.strip()) > 0:
								lst.append(line.strip())
						logger.info(re.sub(' +', ' ', '\n'.join(lst)))

					if p.stderr:
						lst = []
						for line in io.TextIOWrapper(p.stderr, encoding="utf-8"):
							if len(line.strip()) > 0:
								lst.append(line.strip())
						logger.info(re.sub(' +', ' ', '\n'.join(lst)))
		except Exception as e:
			logger.warning('error while reading the stdout')
			logger.error(e)
		p.wait(timeout=timeout)
		# ret = p.returncode
		ret = 1
	except subprocess.TimeoutExpired:
		logger.warning('TimeoutExpired (%s s)for cmd: %s'%(str(timeout), cmd))
		os.killpg(os.getpgid(process.pid), signal.SIGTERM)
		ret = -1
	finally:
		my_timer.cancel()

	return ret



def bash_command(cmd, cwd=None, timeout=30*60, capture_output=False, log_command=False):
	ret = 1
	try:
		if log_command:
			logger.debug('Running command: %s'%cmd)
			# https://stackoverflow.com/questions/41171791/how-to-suppress-or-capture-the-output-of-subprocess-run
		
		# >= python 3.7
		p = subprocess.run(cmd, cwd=cwd, timeout=timeout, capture_output=capture_output, check=True, shell=True, text=True)
		# p = subprocess.run(cmd, cwd=cwd, timeout=timeout, check=True, shell=True, text=True)
		
		if p.stderr:
			stderr = p.stderr.strip()
		else:
			stderr = ''

		if p.stdout:
			stdout = p.stdout.strip()
		else:
			stdout = ''

		if len(stdout):
			logger.info(stdout)

		if len(stderr):
			logger.error(stderr)
			
	except subprocess.TimeoutExpired as e:
		ret = -1
		logger.warning('TimeoutExpired for cmd: %s'%cmd)
	except subprocess.CalledProcessError as e:
		ret = -1
		logger.warning('CalledProcessError for cmd: %s'%cmd)
		logger.error(e)

	return ret 



# https://stackoverflow.com/questions/8156707/gzip-a-file-in-python
def unzip(path_to_zip_file, directory_to_extract_to):
	with zipfile.ZipFile(path_to_zip_file, 'r') as zip_ref:
		zip_ref.extractall(directory_to_extract_to)


def compress_graph(webpage_folder_path, node_file=constantsModule.NODE_INPUT_FILE_NAME, edge_file=constantsModule.RELS_INPUT_FILE_NAME, edges_file_dynamic=constantsModule.RELS_DYNAMIC_INPUT_FILE_NAME):

	cmd1="pigz %s"%(os.path.join(webpage_folder_path, node_file))
	cmd2="pigz %s"%(os.path.join(webpage_folder_path, edge_file))

	bash_command(cmd1)
	bash_command(cmd2)

	if os.path.exists(os.path.join(webpage_folder_path, edges_file_dynamic)):
		cmd3="pigz %s"%(os.path.join(webpage_folder_path, edges_file_dynamic))
		bash_command(cmd3)

def decompress_graph(webpage_folder_path, node_file=constantsModule.NODE_INPUT_FILE_NAME, edge_file=constantsModule.RELS_INPUT_FILE_NAME, edges_file_dynamic=constantsModule.RELS_DYNAMIC_INPUT_FILE_NAME):

	cmd1="pigz -d %s"%(os.path.join(webpage_folder_path, node_file))
	cmd2="pigz -d %s"%(os.path.join(webpage_folder_path, edge_file))
	
	bash_command(cmd1)
	bash_command(cmd2)

	if os.path.exists(os.path.join(webpage_folder_path, edges_file_dynamic)):
		cmd3="pigz %s"%(os.path.join(webpage_folder_path, edges_file_dynamic))
		bash_command(cmd3)


