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
	Interface for Library Analyzer Module (LAM)

	Usage:
	------------
	> import symbolic_modeling.interface as SMInterface

"""




import symbolic_modeling.analysis as symbolicModelingModule


def start(library_path, analyze=True, build=True, activate= False, query=True):

	"""
	@param {string} library_path: absolute path to the library 
	@return {void} starts the library analyzer
	"""

	out =  symbolicModelingModule.run_analyzer(library_path, analyze=analyze, build=build, activate= activate, query=query)
	return out
