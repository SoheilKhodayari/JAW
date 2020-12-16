# Different Edge Types in a Hybrid Property Graph 

The propery graph edges encode the syntax of a program, as well as the semantic of control and data flows.
The schema of the hybrid property graph edges, as accessible in a `Neo4j` database, are shown below.
These schema properties can be used in `Cypher` queries.

## The Schema of Edges
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

The rest of this section describes the values and meaning of each property.

## Abstract Syntax Tree (AST) Edges.
**What is an AST edge?**
an AST edge connects two program elements that are syntactically connected to each other following the calculation of the program.

**Type.** An AST edge has the `Type` attribute set to `AST_parentOf`. 

**RelationType.** The `RelationType` attribute is set to the type of the relationship between to elements of the program in the AST, e.g., `callee` for `CallExpression`

## Control Flow Graph (CFG) Edges.
A CFG edge describes the order in which program statements are executed and the conditions required to reach a particular path of execution.

**Type.** A CFG edge has the `Type` attribute set to `CFG_parentOf`. 

**RelationType.** `RelationType` is set to `Cond_True` or `Cond_False` for conditional control flows, and to `Epsilon` for unconditional flows.

A CFG of a function starts with a `entry` node and ends with a `exit` node, marking the boundaries of the function scope. These fragmented intra-procedural flows are connected to each other by
inter-procedural `call` edges, as presented next. 

## Inter-Procedural Call Graph (IPCG) Edges.
An IPCG associates with each call site in a program the set of functions that may be invoked from that site. We integrate the IPCG in our code representation with directed `call` edges.

**Type.** An IPCG edge has the `Type` attribute set to `CG_parentOf`. 

**Arguments.** The `Arguments` is set to a list of parameters observed at call site, so that we can bind them to the corresponding arguments in the function definition site.


## Program Dependence Graph (PDG) Edges.
A value of a variable depends on a series of statements and predicates and a PDG
models these data flow dependencies.

**Type.** A PDG edge has the `Type` attribute set to `PDG_parentOf`.

**Arguments.** The `Arguments` is set to the variable/identifier name for the data flow.

## Event Registration, Dispatch and Dependency Graph (ERDDG) Edges.
This graph models the dispatch of the events, registration of the event handlers, and the control dependency between statements and events.

### Event Dispatch Edges.
This edge models the dispatch of an event, and it connects the dispatch site to the event registration site.
 
**Type.** An ERDDG dispatch edge has the `Type` attribute set to `ERDDG_Dispatch`.

### Event Registration Edges.
This edge marks the registration of an event, and it connects the top level registration site to the event handling function.

**Type.** An ERDDG registration edge has the `Type` attribute set to `ERDDG_Registration`.

### Event Dependency Edges.
This edge connects the event handling function to each of its statements, specifying the
event dependency for that statement to get executed.

**Type.** An ERDDG dependency edge has the `Type` attribute set to `ERDDG_Dependency`.

## DOM Tree

You can resolve accesses to the DOM tree using the snapshot taken by the crawler. 
For this, you can use JAW's DOM pointer analysis API provided in the `DOMUtils` class in the `hpg_analysis.general.dom_points` package. For example:

```python
from hpg_analysis.general.dom_points_to import DOMUtils
element = DOMUtils.resolve_dom_query("document.querySelector('div[id=x]')")
```
