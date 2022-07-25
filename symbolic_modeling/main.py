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
	python3 -m symbolic_modeling.main

"""

import os
import time
import constants as constantsModule
import symbolic_modeling.interface as SMInterface
from utils.logging import logger


def start_symbolic_modeling(library_input_paths):
	
	"""
	starts the symbolic modeling for the JavaScript libraries 
	"""

	run_the_graph_analyzer = True
	build_the_neo4j_database = True
	query_the_neo4j_database = True

	# give neo4j a chance to prepare for analyzing subsequent libraries
	DELAY_BETWEEN_LIBRARY_ANALYSIS_TASKS = 10 # seconds

	for idx in range(len(library_input_paths)):
		library_path = library_input_paths[idx]
		if idx != 0:
			time.sleep(DELAY_BETWEEN_LIBRARY_ANALYSIS_TASKS) 

		if os.path.exists(library_path):
			logger.info('started symboling modeling for: %s'%(library_path))
			SMInterface.start(library_path, analyze=run_the_graph_analyzer, build=build_the_neo4j_database, activate=False, query=query_the_neo4j_database)
		else:
			logger.error("library file path not found: %s"%library_path)



if __name__ == "__main__":


	library_input_paths = [
		constantsModule.DATA_DIR + '/libraries/yuihistory/yuihistory.js', # YUI
		constantsModule.DATA_DIR + '/libraries/dojo/dojo.js', # Dojo
		constantsModule.DATA_DIR + '/libraries/backbone/dev_backbone.js', # Backbone 
		constantsModule.DATA_DIR + '/libraries/jquery/jquery.js', # JQuery
		constantsModule.DATA_DIR + '/libraries/bootstrap/bootstrap.js', # Bootstrap
		constantsModule.DATA_DIR + '/libraries/bootstrapgrowl/bootstrap-growl.min.js', # Growl (Third-Party Bootstrap Plugin)
		constantsModule.DATA_DIR + '/libraries/gwt/gwt.js', # Google Web Toolkit
		constantsModule.DATA_DIR + '/libraries/handlebars/handlebars.js', # handlebars
		constantsModule.DATA_DIR + '/libraries/spinjs/spin.js', # spin
		constantsModule.DATA_DIR + '/libraries/jit/jit.js', # jit
		constantsModule.DATA_DIR + '/libraries/modernizr/modernizr.js', # modernizr
		constantsModule.DATA_DIR + '/libraries/prototype/prototype.js', # prototype
		constantsModule.DATA_DIR + '/libraries/react/react.dev.js', # react 
		constantsModule.DATA_DIR + '/libraries/reactdom/react-dom.dev.js', # react dom
		constantsModule.DATA_DIR + '/libraries/chartjs/chart.js', 
		constantsModule.DATA_DIR + '/libraries/cookiesjs/cookies.js',
		constantsModule.DATA_DIR + '/libraries/google-analytics/analytics.js', 
		constantsModule.DATA_DIR + '/libraries/gwt/webstarterkit.js', 
		constantsModule.DATA_DIR + '/libraries/requirejs/require.js', 
		constantsModule.DATA_DIR + '/libraries/scriptaculous/scriptaculous.js', 
		constantsModule.DATA_DIR + '/libraries/vue/vue.js', 
		constantsModule.DATA_DIR + '/libraries/angularjs/angular.js', 
		constantsModule.DATA_DIR + '/libraries/yui/yui.js',
		constantsModule.DATA_DIR + '/libraries/swfobject/swfobject.js',
		constantsModule.DATA_DIR + '/libraries/momentjs/momentjs.js',
		constantsModule.DATA_DIR + '/libraries/leaflet/leaflet.js',
		constantsModule.DATA_DIR + '/libraries/hammerjs/hammerjs.js',
		constantsModule.DATA_DIR + '/libraries/gzip-js/gzip-js.js',
		constantsModule.DATA_DIR + '/libraries/flowchart/flowchart.js',
		constantsModule.DATA_DIR + '/libraries/extjs/extjs.js',
		constantsModule.DATA_DIR + '/libraries/bpmn-modeler/bpmn-viewer.development.js',
		constantsModule.DATA_DIR + '/libraries/jquery-ui/jquery-ui.js',
	]

	start_symbolic_modeling(library_input_paths)




