# -*- coding: utf-8 -*-

"""
	Copyright (C) 2021  Soheil Khodayari, CISPA
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
	Analyzes a webpage stored by JAW crawler under /hpg_construction/outputs/<WEBSITE>/<WEBPAGE> for the detection of client-side CSRF 


	Usage:
	------------
	python3 -m hpg_analysis.cs_csrf.test_webpage --siteid=<site-identifier> --url=<webpage-url>


	Help Command:
	------------
	python -m hpg_analysis.cs_csrf.test_webpage -h

"""



import argparse 
import sys, os
from utils.logging import logger
from hpg_analysis.cs_csrf.main import driver_program_web_page



def main():

	parser = argparse.ArgumentParser(description='This script analyzes a given webpage collected by the JAW crawler to detect client-side CSRF.')
	parser.add_argument('--siteid', help='Identifier of the site to be tested, located under /hpg_construction/outputs/<WEBSITE>', default='')
	parser.add_argument('--url', help='URL of the webpage to be tested, whose data is located under /hpg_construction/outputs/<WEBSITE>/<WEBPAGE>', default='')

	# dictionary of the provided arguments
	args = vars(parser.parse_args())


	website_id = args['siteid']
	webpage_url = args['url']
	if website_id != '' and webpage_url != '':
		driver_program_web_page(website_id, webpage_url)
	else:
		logger.warning('input parameters siteid or url is not valid.')


if __name__ == '__main__':
	main()













