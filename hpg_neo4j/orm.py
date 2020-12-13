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
	Neo4j database utility functions


	Usage:
	--------
	python3 -m hpg_neo4j.orm


	Further Documentation on NeoModel ORM:
	--------
	please visit: 
		https://neomodel.readthedocs.io/en/latest/module_documentation.html
		https://github.com/neo4j-contrib/neomodel/tree/master/neomodel

"""

import neomodel
import constants as constantsModule

neomodel.config.DATABASE_URL = constantsModule.NEOMODEL_NEO4J_CONN_STRING


class RelationshipSchema(neomodel.StructuredRel):

	RelationType= neomodel.StringProperty()
	Arguments= neomodel.StringProperty()


class ASTNode(neomodel.StructuredNode):

	# properties
	Id= neomodel.UniqueIdProperty()
	Type= neomodel.StringProperty()
	Kind= neomodel.StringProperty()
	Code= neomodel.StringProperty()
	Range= neomodel.StringProperty()
	Location= neomodel.StringProperty()
	Value= neomodel.StringProperty()
	Raw= neomodel.StringProperty()
	Async= neomodel.StringProperty()
	SemanticType= neomodel.StringProperty()

	# Abstract Syntax Tree (AST) relationships
	ASTConnectionsTo= neomodel.RelationshipTo('ASTNode', 'AST_parentOf', model=RelationshipSchema)
	ASTConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'AST_parentOf', model=RelationshipSchema)
	ASTConnections= neomodel.Relationship('ASTNode', 'AST_parentOf', model=RelationshipSchema)

	# Control Flow Graph (CFG) relationships
	CFGConnectionsTo= neomodel.RelationshipTo('ASTNode', 'CFG_parentOf', model=RelationshipSchema)
	CFGConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'CFG_parentOf', model=RelationshipSchema)
	CFGConnections= neomodel.Relationship('ASTNode', 'CFG_parentOf', model=RelationshipSchema)

	# Program Dependence Graph (PDG) relationships
	PDGConnectionsTo= neomodel.RelationshipTo('ASTNode', 'PDG_parentOf', model=RelationshipSchema)
	PDGConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'PDG_parentOf', model=RelationshipSchema)
	PDGConnections= neomodel.Relationship('ASTNode', 'PDG_parentOf', model=RelationshipSchema)

	# Inter-Procedural Call Graph (IPCG) relationships
	IPCGConnectionsTo= neomodel.RelationshipTo('ASTNode', 'CG_parentOf', model=RelationshipSchema)
	IPCGConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'CG_parentOf', model=RelationshipSchema)
	IPCGConnections= neomodel.Relationship('ASTNode', 'CG_parentOf', model=RelationshipSchema)

	# Event Registration of ERDDG relationships
	ERDDGRegistrationConnectionsTo= neomodel.RelationshipTo('ASTNode', 'ERDDG_Registration', model=RelationshipSchema)
	ERDDGRegistrationConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'ERDDG_Registration', model=RelationshipSchema)
	ERDDGRegistrationConnections= neomodel.Relationship('ASTNode', 'ERDDG_Registration', model=RelationshipSchema)

	# Event Dispatch of ERDDG relationships
	ERDDGDispatchConnectionsTo= neomodel.RelationshipTo('ASTNode', 'ERDDG_Dispatch', model=RelationshipSchema)
	ERDDGDispatchConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'ERDDG_Dispatch', model=RelationshipSchema)
	ERDDGRegistrationConnections= neomodel.Relationship('ASTNode', 'ERDDG_Registration', model=RelationshipSchema)

	# Event Dependency of ERDDG relationships
	ERDDGDependencyConnectionsTo= neomodel.RelationshipTo('ASTNode', 'ERDDG_Dependency', model=RelationshipSchema)
	ERDDGDependencyConnectionsFrom= neomodel.RelationshipFrom('ASTNode', 'ERDDG_Dependency', model=RelationshipSchema)
	ERDDGDependencyConnections= neomodel.Relationship('ASTNode', 'ERDDG_Dependency', model=RelationshipSchema)


	# ------------------------------------------------------------------------------------------------ #
	#					General Methods
	# ------------------------------------------------------------------------------------------------ #
	
	def get_line(self):

		"""
		@return {list|None}: [(a, b)] where a, b are the start and end lines for the code of the AST node 
		
		"""
		if self.location is not None:
			loc= eval(self.location)
			return [loc.start.line, loc.end.line]

		return None


	def is_cfg_node(self):
		# TODO
		pass

	def has_cfg_edge(self):
		# TODO
		pass

	def has_pdg_edge(self):
		# TODO
		pass


	# ------------------------------------------------------------------------------------------------ #
	#					Edge Traversals
	# ------------------------------------------------------------------------------------------------ #

	def get_connections_by_ast(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list}: related AST nodes
		"""

		if direction == neomodel.match.OUTGOING:
			return self.ASTConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.ASTConnectionsFrom.match(**kwargs).all()
		else:
			return self.ASTConnections.match(**kwargs).all()


	def get_connections_by_cfg(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related CFG nodes
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.CFGConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.CFGConnectionsFrom.match(**kwargs).all()
		else:
			return self.CFGConnections.match(**kwargs).all()


	def get_connections_by_pdg(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related PDG nodes
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.PDGConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.PDGConnectionsFrom.match(**kwargs).all()
		else:
			return self.PDGConnections.match(**kwargs).all()


	def get_connections_by_ipcg(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related IPCG nodes
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.IPCGConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.IPCGConnectionsFrom.match(**kwargs).all()
		else:
			return self.IPCGConnections.match(**kwargs).all()



	def get_connections_by_erddg_dispatch(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related nodes via ERDDG Dispatch edges
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.ERDDGDispatchConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.ERDDGDispatchConnectionsFrom.match(**kwargs).all()
		else:
			return self.ERDDGDispatchConnections.match(**kwargs).all()



	def get_connections_by_erddg_registration(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related nodes via ERDDG Registration edges
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.ERDDGRegistrationConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.ERDDGRegistrationConnectionsFrom.match(**kwargs).all()
		else:
			return self.ERDDGRegistrationConnections.match(**kwargs).all()



	def get_connections_by_erddg_dependency(self, direction=neomodel.match.OUTGOING, **kwargs):

		"""
		@param {string} direction: neomodel.match.OUTGOING / neomodel.match.INCOMING / neomodel.match.EITHER
		@param **kwargs: positional keyword arguments specifying the constraints on the edges for traversals
		@return {list} related nodes via ERDDG Dependency edges
		"""
		
		if direction == neomodel.match.OUTGOING:
			return self.ERDDGDependencyConnectionsTo.match(**kwargs).all()
		elif direction == neomodel.match.INCOMING:
			return self.ERDDGDependencyConnectionsFrom.match(**kwargs).all()
		else:
			return self.ERDDGDependencyConnections.match(**kwargs).all()




class RequestNode(neomodel.StructuredNode):

	## request method 					   --> Type field
	## request kind (e.g., xmlhttprequest) --> Kind field
	## request URL						   --> Value field
	## request body						   --> Raw field
	## request status code 				   --> Code field
	## other properties are currently empty

	# properties
	Id= neomodel.UniqueIdProperty()
	Type= neomodel.StringProperty()
	Kind= neomodel.StringProperty()
	Code= neomodel.StringProperty()
	Range= neomodel.StringProperty()
	Location= neomodel.StringProperty()
	Value= neomodel.StringProperty()
	Raw= neomodel.StringProperty()
	Async= neomodel.StringProperty()
	SemanticType= neomodel.StringProperty()


class EventNode(neomodel.StructuredNode):

	## event name --> Type field
	## event target --> Value field
	## other properties are currently empty

	# properties
	Id= neomodel.UniqueIdProperty()
	Type= neomodel.StringProperty()
	Kind= neomodel.StringProperty()
	Code= neomodel.StringProperty()
	Range= neomodel.StringProperty()
	Location= neomodel.StringProperty()
	Value= neomodel.StringProperty()
	Raw= neomodel.StringProperty()
	Async= neomodel.StringProperty()
	SemanticType= neomodel.StringProperty()


class CookieNode(neomodel.StructuredNode):

	## cookie name 		--> Raw field
	## cookie value 	--> Value field
	## cookie httpOnly  --> Type field
	## other properties are currently empty

	# properties
	Id= neomodel.UniqueIdProperty()
	Type= neomodel.StringProperty()
	Kind= neomodel.StringProperty()
	Code= neomodel.StringProperty()
	Range= neomodel.StringProperty()
	Location= neomodel.StringProperty()
	Value= neomodel.StringProperty()
	Raw= neomodel.StringProperty()
	Async= neomodel.StringProperty()
	SemanticType= neomodel.StringProperty()

class DOMSnapshot(neomodel.StructuredNode):

	## html path 		--> Location field
	## html code 		--> Code field
	## other properties are currently empty

	# properties
	Id= neomodel.UniqueIdProperty()
	Type= neomodel.StringProperty()
	Kind= neomodel.StringProperty()
	Code= neomodel.StringProperty()
	Range= neomodel.StringProperty()
	Location= neomodel.StringProperty()
	Value= neomodel.StringProperty()
	Raw= neomodel.StringProperty()
	Async= neomodel.StringProperty()
	SemanticType= neomodel.StringProperty()


