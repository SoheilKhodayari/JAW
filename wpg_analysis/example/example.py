
"""
	Description:
	------------
	Example file showing how to query an imported property graph

	Usage:
	------------
	python -m wpg_analysis.queries.example 

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