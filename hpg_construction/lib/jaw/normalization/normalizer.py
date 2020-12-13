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
		- Pre-instrumenting code to handle dynamic constructs with constant string parameters  


	Usage:
	------------
	> import hpg_construction.lib.jaw.normalization.normalizer.Normalizer as NormalizerModule

"""


import jsbeautifier
import os
import utils.utility as utilityModule
import constants as constantsModule
from utils.logging import logger


class Normalizer:

	@staticmethod
	def beautify_js_program(file_path_name, create_new_file = False, new_file_name=constantsModule.NAME_JS_PROGRAM_INSTRUMENTED):
		
		"""
		@param {string} file_path_name: input system path to a JS code
		@param {bool} create_new_file: if set to False, overwrites the input JS file with the beautified version, 
				otherwise, it creates a new file with the name set in the new_file_name field
		@param {string} new_file_name
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
				output = utilityModule.get_directory_without_last_part(file_path_name) + new_file_name
			else:
				output = file_path_name

			with open(output, 'w+') as fd:
				fd.write(res)



	@staticmethod
	def instrument_for_dynamic_js_constructs(file_path_name, create_new_file = False, new_file_name=constantsModule.NAME_JS_PROGRAM_INSTRUMENTED):

		"""
		@param {string} file_path_name: input system path to a JS code
		@param {bool} create_new_file: if set to False, overwrites the input JS file with the normalized version, 
				otherwise, it creates a new file with the name set in the new_file_name field
		@param {string} new_file_name
		@description: beautifies a given JS program
		@return None
		"""

		if create_new_file:
			output = utilityModule.get_directory_without_last_part(file_path_name) + new_file_name
		else:
			output = file_path_name

		driver_path = os.path.join(constantsModule.BASE_DIR, 'hpg_construction/lib/jaw/normalization/dynamic.js')
		cmd = 'node %s %s %s'%(driver_path, file_path_name, output)
		utilityModule.run_os_command(cmd)


	@staticmethod
	def deobfusecate_js_program(file_path_name, create_new_file = False): 
		logger.warning('Not Implemented.')
		pass


if __name__ == '__main__':

	tests = os.path.join(constantsModule.BASE_DIR, 'hpg_construction/lib/jaw/normalization/tests')

	test_1 = os.path.join(tests, 'dynamic.test1.js')
	test_1_out = 'out.dynamic.test1.js'
	Normalizer.instrument_for_dynamic_js_constructs(test_1, create_new_file=True, new_file_name=test_1_out)

	test_2 = os.path.join(tests, 'dynamic.test2.js')
	test_2_out = 'out.dynamic.test2.js'
	Normalizer.instrument_for_dynamic_js_constructs(test_2, create_new_file=True, new_file_name=test_2_out)

	test_3 = os.path.join(tests, 'dynamic.test3.js')
	test_3_out = 'out.dynamic.test3.js'
	Normalizer.instrument_for_dynamic_js_constructs(test_3, create_new_file=True, new_file_name=test_3_out)






