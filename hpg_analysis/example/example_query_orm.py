
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
	Example file showing how to query an imported property graph using the NeoModel ORM (Django-like Syntax)

	Usage:
	------------
	python -m hpg_analysis.queries.example_query_orm 


	Further Documentation on NeoModel ORM:
	--------
	please visit: 
		https://neomodel.readthedocs.io/en/latest/module_documentation.html
		https://github.com/neo4j-contrib/neomodel/tree/master/neomodel
"""

import hpg_neo4j.orm as ORM
import neomodel


# get all nodes
nodes = ORM.ASTNode.nodes.all()
print(nodes)


# get node with a specific id
n10 = ORM.ASTNode.nodes.get_or_none(Id='10')
print(n10)

