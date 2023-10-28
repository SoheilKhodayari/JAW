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
	Clean crawled data by removing empty website folders
	

	Running:
	------------
	$ python3 -m scripts.clean_data

"""

import os, sys
import shutil

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER



def main():

	LOGGER.info('started cleaning the data...')
	webapps = os.listdir(constantsModule.DATA_DIR)
	for appname in webapps:
		app = os.path.join(constantsModule.DATA_DIR, appname)
		if os.path.exists(app) and os.path.isdir(app):
			files = os.listdir(app)
			if len(files) <= 1:
				shutil.rmtree(app)


	LOGGER.info('finished.')


main()