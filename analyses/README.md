# Analyses

This folder contains the security analysis scripts and traversals over the constructed HPG.

## In-Memory and Cypher Traversals

Graph traversals can be performed at two stages: 
- Before importing the HPG inside a neo4j graph database: via the in-memory `FlowNode` representation and `walkes`.
- After importing the HPG inside a neo4j graph database: via `Cypher` queries over the neo4j DB.

