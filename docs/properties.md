# WPG Properties
The following node properties are available in a `Neo4j`-based WPG. These properties can be used in `Cypher` queries.

```javascript
Neo4j_WPGNode
{
  // the id of a node
  Property: Id,  

  // the type of the node in the syntax tree
  Property: Type, 

  // the range of the node LoC in source code
  Property: Range, 

  // a json indicating the location of the node LoC in the source code
  Property: Location, 

  // an arbitrary label assigned to a node defining its behaviour symbolically.
  Property: SemanticType, 

  // raw value of identifiers
  Property: Raw, 

  // value of identifiers
  Property: Value, 

  // name of identifiers
  Property: Code, 

  // kind of variable declarations
  Property: Kind, 
}
```
## Edge Properties
```javascript
{
  // the type of the relation between two nodes in the syntax tree
  Property: RelationType,  

  // a json indicating additional arguments for the type of the relation
  Property: Arguments,

  // the type of the edge, e.g., 
  // AST_parentOf, 
  // CFG_parentOf, CG_parentOf, 
  // PDG_parentOf, 
  // ERDDG_Dispatch, ERDDG_Registration, ERDDG_Dependency
  Property: Type,
}
```

