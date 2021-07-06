
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
	Example file showing how to query an imported property graph

	Usage:
	------------
	python -m hpg_analysis.queries.example_query_cypher 

"""

import constants as constantsModule
from neo4j import GraphDatabase

neo_driver = GraphDatabase.driver(constantsModule.NEO4J_CONN_STRING, auth=(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS))
with neo_driver.session() as session:
	with session.begin_transaction() as tx:
		# select all identifiers
		query = """
			MATCH (n {Type: 'Identifier'})
			RETURN n
		"""
		results= tx.run(query)
		for record in results:
			print(record['n'])