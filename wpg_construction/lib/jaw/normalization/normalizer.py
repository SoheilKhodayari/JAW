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
	Normalize a given JavaScript program. This includes, among others:
		- Beautifying the JavaScript code
		- De-obfusecation
		- Instrumenting code to handle dynamic constructs with constant string parameters  


	Usage:
	------------
	> import wpg_construction.lib.jaw.normalization.normalizer.Normalizer as NormalizerModule

"""


import jsbeautifier
from utils.logging import logger
import constants as constantsModule

class Normalizer:

	@staticmethod
	def beautify_js_program(file_path_name, create_new_file = False):
		
		"""
		@param {string} file_path_name: input system path to a JS code
		@param {bool} create_new_file: if set to False, overwrites the input JS file with the beautify version, 
				otherwise, it creates a new file with the name set in constantsModule.NAME_JS_PROGRAM_INSTRUMENTED
		@description: beautifies a given JS program
		@return None
		"""

		beautified_out_is_not_corrupted=True
		try:
			res = jsbeautifier.beautify_file(file_path_name)
		except:
			beautified_out_is_not_corrupted = False
			logger.warning('beautifying failed for the input program at: %s'%file_path_name)

		if beautified_out_is_not_corrupted:
			if create_new_file:
				output = constantsModule.NAME_JS_PROGRAM_INSTRUMENTED
			else:
				output = file_path_name

			with open(output, 'w+') as fd:
				fd.write(res)



	@staticmethod
	def deobfusecate_js_program(file_path_name, create_new_file = False): 
		pass




	@staticmethod
	def instrument_for_dynamic_js_constructs(file_path_name, create_new_file = False):
		pass










