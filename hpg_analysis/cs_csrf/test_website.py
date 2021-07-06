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
	Analyzes a website stored by the JAW crawler under /hpg_construction/outputs/<WEBSITE>/ for the detection of client-side CSRF 


	Usage:
	------------
	python3 -m hpg_analysis.cs_csrf.test_website --siteid=<site-identifier>


	Help Command:
	------------
	python -m hpg_analysis.cs_csrf.test_website -h

"""



import argparse 
import sys, os
from utils.logging import logger
from hpg_analysis.cs_csrf.main import driver_program_web_site



def main():

	parser = argparse.ArgumentParser(description='This script analyzes a given website collected by the JAW crawler to detect client-side CSRF.')
	parser.add_argument('--siteid', help='Identifier of the site to be tested, located under /hpg_construction/outputs/<WEBSITE>', default='')

	# dictionary of the provided arguments
	args = vars(parser.parse_args())


	website_id = args['siteid']
	if website_id != '' and webpage_url != '':
		driver_program_web_site(website_id)
	else:
		logger.warning('input parameter siteid is not valid.')


if __name__ == '__main__':
	main()














