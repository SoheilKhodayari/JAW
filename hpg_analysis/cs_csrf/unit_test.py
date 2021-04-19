# -*- coding: utf-8 -*-

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
	Run all or any of the `Unit-Test` programs under /hpg_construction/unit_tests/cs_csrf/* for the detection of client-side CSRF 


	Usage:
	------------
	python3 -m hpg_analysis.cs_csrf.unit_test --js=<test_1.js>
	
	Note: the file specified with --js option must exist in the Unit Test folder, i.e., /hpg_construction/unit_tests/cs_csrf/.


	Help Command:
	------------
	python -m hpg_analysis.cs_csrf.unit_test -h

"""



import argparse 
import sys, os

from utils.logging import logger
from hpg_analysis.cs_csrf.main import driver_program_unit_test



def main():

	parser = argparse.ArgumentParser(description='This script analyzes a given unit test JS program to detect client-side CSRF.')
	parser.add_argument('--js', help='name of the JavaScript program for analysis located under /hpg_construction/unit_tests/cs_csrf/ (default: ALL)', default='ALL')

	# dictionary of the provided arguments
	args = vars(parser.parse_args())

	if args['js'] == 'ALL':
		driver_program_unit_test()
	else:
		driver_program_unit_test(test_file_name=args['js'])


if __name__ == '__main__':
	main()














