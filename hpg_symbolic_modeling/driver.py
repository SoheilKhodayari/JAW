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
	Interface Functions for Library Analyzer Module (LAM)

	Usage:
	------------
	python3 -m hpg_symbolic_modeling.driver

"""

import urllib.parse
import os
import time
import re
import sys
import constants as constantsModule
import utils.utility as utilityModule
import hpg_symbolic_modeling.interface as symbolicModelerInferface
from neo4j import GraphDatabase
from datetime import datetime



def start_symbolic_modeling():
	
	"""
	@description 
	"""

	library_paths = [
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/yuihistory/yuihistory.js', # YUI
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/dojo/dojo.js', # Dojo
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/backbone/dev_backbone.js', # Backbone 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/jquery/jquery.js', # JQuery
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/bootstrap/bootstrap.js', # Bootstrap
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/bootstrapgrowl/bootstrap-growl.min.js', # Growl (Third-Party Bootstrap Plugin)
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/gwt/gwt.js', # Google Web Toolkit
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/handlebars/handlebars.js', # handlebars
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/spinjs/spin.js', # spin
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/jit/jit.js', # jit
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/modernizr/modernizr.js', # modernizr
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/prototype/prototype.js', # prototype
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/react/react.dev.js', # react 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/reactdom/react-dom.dev.js', # react dom
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/chartjs/chart.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/cookiesjs/cookies.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/google-analytics/analytics.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/gwt/webstarterkit.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/requirejs/require.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/scriptaculous/scriptaculous.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/vue/vue.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/angularjs/angular.js', 
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/yui/yui.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/swfobject/swfobject.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/momentjs/momentjs.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/leaflet/leaflet.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/hammerjs/hammerjs.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/gzip-js/gzip-js.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/flowchart/flowchart.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/extjs/extjs.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/bpmn-modeler/bpmn-viewer.development.js',
		constantsModule.OUTPUT_CRAWLER_DATA + '/libraries/jquery-ui/jquery-ui.js',
	]

	# give neo4j a chance to prepare for analyzing subsequent libraries
	# default: 10 seconds
	DELAY_BETWEEN_LIBRARY_ANALYSIS_TASKS = 10 # seconds
	first_iteration = True
	for library_path in library_paths:
		if first_iteration:
			first_iteration= False
		else:
			time.sleep(DELAY_BETWEEN_LIBRARY_ANALYSIS_TASKS) 
		if os.path.exists(library_path):
			print('[+] started: %s'%(library_path))
			symbolicModelerInferface.start(library_path, analyze=False, build=True, activate=False, query=True, general=True)
		else:
			print("[-] Path Not found: %s"%library_path)



if __name__ == "__main__":
	start_symbolic_modeling()




