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
	---------------
	This script imports a CSV of a property graph into an active Neo4j database
	
	Usage:
	---------------
	python -m hpg_neo4j.hpg_import <path-to-the-folder-of-the-csv-files> --nodes=<nodes.csv> --edges=<rels.csv>

	Note: <path-to-the-folder-of-the-csv-files> is either the absolute path, or 
		  the relative base with respect to the ROOT directory.

	Help Command:
	---------------
	python -m hpg_neo4j.hpg_import -h


"""


import argparse 
from hpg_neo4j.db_utility import API_neo4j_prepare, does_neo4j_db_exists

parser = argparse.ArgumentParser(description='This script imports a CSV of a property graph into an active Neo4j database.')
parser.add_argument('csv_path', metavar='P', help='path to the folder containing the graph in CSVs')
parser.add_argument('--nodes', help='the name of the nodes csv file (default: nodes.csv)', default='nodes.csv')
parser.add_argument('--edges', help='the name of the relations csv file (default: rels.csv)', default='rels.csv')

# dictionary of the provided arguments
args = vars(parser.parse_args())

API_neo4j_prepare(args['csv_path'], args['nodes'], args['edges'])