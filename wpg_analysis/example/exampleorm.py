"""
	Description:
	------------
	Example file showing how to query an imported property graph using the NeoModel ORM (Django-like Syntax)

	Usage:
	------------
	python -m wpg_analysis.queries.exampleorm 


	Further Documentation on NeoModel ORM:
	--------
	please visit: 
		https://neomodel.readthedocs.io/en/latest/module_documentation.html
		https://github.com/neo4j-contrib/neomodel/tree/master/neomodel
"""

import wpg_neo4j.orm as WPG
import neomodel


# get all nodes
nodes = WPG.ASTNode.nodes.all()
print(nodes)


# get node with a specific id
n10 = WPG.ASTNode.nodes.get_or_none(Id='10')
print(n10)

