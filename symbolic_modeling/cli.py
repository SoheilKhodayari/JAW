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
	Main Script for Library Analyzer Module (LAM)

	Usage:
	------------
	python3 -m symbolic_modeling.cli --input=/data/library/libname/file.js --analyze=True --build=True --query=True

"""

import os
import argparse
import symbolic_modeling.interface as SMInterface
from utils.logging import logger


def start_symbolic_modeling(library_path, analyze, build, query):
	
	"""
	starts the symbolic modeling for the JavaScript library 
	"""

	if os.path.exists(library_path):
		logger.info('started symboling modeling for: %s'%(library_path))
		symbolicModelerInferface.start(library_path, analyze=analyze, build=build, activate=False, query=query)
	else:
		logger.error("library file path not found: %s"%library_path)




if __name__ == "__main__":


	p = argparse.ArgumentParser(description='This script symbolically models a JavaScript library file.')


	p.add_argument('--input', "-I",
					default='None',
					help='input path to the library JavaScript file under the data directory (default: %(default)s)',
					type=str)


	p.add_argument('--analyze', "-A",
					default=True,
					help='analyze the code and model it via a property graph (default: %(default)s)',
					type=bool)

	p.add_argument('--build', "-B",
					default=True,
					help='build a neo4j property graph database by importing the model (default: %(default)s)',
					type=bool)

	p.add_argument('--query', "-Q",
					default=True,
					help='query the property graph database to generate symbolic models (default: %(default)s)',
					type=bool)


	args= vars(p.parse_args())


	library_input_path = args['input']
	run_the_graph_analyzer = args['analyze']
	build_the_neo4j_database = args['build']
	query_the_neo4j_database = args['query']

	start_symbolic_modeling(library_input_path, analyze=run_the_graph_analyzer, build=build_the_neo4j_database, query=query_the_neo4j_database)






