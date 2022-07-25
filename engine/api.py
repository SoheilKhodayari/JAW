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
	High-level interface to build the property graph


	Usage:
	------------
	python3 -m engine.api <path> --js=<program.js> --import=<bool> --hybrid=<bool> --reqs=<requests.out> --evts=<events.out> --cookies=<cookies.pkl> --html=<html_snapshot.html>


	Help Command:
	------------
	python -m engine.api -h

"""



import argparse 
import sys, os
import uuid

import constants as constantsModule
import utils.utility as utilityModule

from utils.logging import logger
from engine.lib.jaw.hybrid.state_values import StateValues
from hpg_neo4j.db_utility import API_neo4j_prepare



def main():
	parser = argparse.ArgumentParser(description='This script builds a property graph from a given JavaScript program.')
	parser.add_argument('path', metavar='P', help='base path to the folder containing the program files for analysis (must be under the /data/ folder).')
	parser.add_argument('--js', help='name of the JavaScript program for analysis (default: js_program.js)', default='js_program.js')
	parser.add_argument('--import', help='whether the constructed property graph should be imported to an active neo4j database (default: true)', default='true')
	parser.add_argument('--hybrid', help='whether the hybrid mode is enabled (default: false)', default='false')
	parser.add_argument('--reqs', help='for hybrid mode only, name of the file containing the sequence of obsevered network requests, pass the string false to exclude (default: request_logs_short.out)', default='request_logs_short.out')
	parser.add_argument('--evts', help='for hybrid mode only, name of the file containing the sequence of fired events, pass the string false to exclude (default: events.out)', default='events.out')
	parser.add_argument('--cookies', help='for hybrid mode only, name of the file containing the cookies, pass the string false to exclude (default: cookies.pkl)', default='cookies.pkl')
	parser.add_argument('--html', help='for hybrid mode only, name of the file containing the DOM tree snapshot, pass the string false to exclude (default: html_rendered.html)', default='html_rendered.html')


	# dictionary of the provided arguments
	args = vars(parser.parse_args())

	base_path = args['path']
	if constantsModule.DATA_DIR not in base_path:
		logger.error('Path of the program under analysis must be within the /data/ folder.')
		sys.exit(1)

	js_program = os.path.join(args['path'], args['js'])

	# find the folder name of the program under analysis within the /outputs folder
	output_path = args['path']

	# random graph id
	graphid = uuid.uuid4().hex

	# build the property graph for the js program
	command = "node --max-old-space-size=32000 %s --input=%s --output=%s --lang=js --mode=csv --graphid=%s"%(constantsModule.STATIC_ANALYZER_CLI_DRIVER_PATH, js_program, output_path, graphid)
	utilityModule.run_os_command(command, timeout=15*60)


	# store also the dynamic info inside the csv
	if args['hybrid'] == 'true':
		
		if args['reqs'] != 'false':
			StateValues.add_requests_to_graph(base_path, args['reqs'])

		if args['evts'] != 'false':
			StateValues.add_events_to_graph(base_path, args['evts'])

		if args['cookies'] != 'false':
			StateValues.add_cookies_to_graph(base_path, args['cookies'])

		if args['html'] != 'false':
			StateValues.add_dom_tree_snapshot_to_graph(base_path, args['html'])


	# import the constructed csv into an active neo4j database
	if args['import'] == 'true':
		API_neo4j_prepare(base_path)


if __name__ == '__main__':
	main()





