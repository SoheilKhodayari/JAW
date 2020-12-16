# Schema of Nodes in a Hybrid Property Graph 
A hybrid property graph contains two parts: (i) static code representation, and (ii) state values.
The code representation unifies multiple representations of a client-side JavaScript program (e.g., abstract syntax tree, control flow graph, program dependence graph, etc) whereas state values are a series of concrete values observed during the execution of the program (e.g., event traces, network messages and enviornment properties).


Each node of the property graph in `Neo4j` has the following schema. 
These schema properties can be used in `Cypher` queries.

```javascript
PGNode {

  Property: Id,  

  Property: Type, 

  Property: Range, 

  Property: Location, 

  Property: SemanticType, 

  Property: Raw, 

  Property: Value, 

  Property: Code, 

  Property: Kind, 

  Property: Label, 
}
```

The `Label` Property defines the type of the `PGNode`. JAW currently supports five node labels,
i.e., `ASTNode` label for the JavaScript code representation, as well as `RequestNode`, `EventNode`, `CookieNode`, and `DOMSnapshot` labels for the program state values. Depending on each of these node types, the meaning of the rest of the properties are different. Accordingly, the rest of this section clarifies what each property mean for each node type/label.

## Code Represenation

### Abstract Syntax Tree (AST) Nodes
An AST is an ordered tree encoding the hierarchical decomposition of a program to its syntactical constructs. In an AST, terminal nodes represent operands (e.g., identifiers), and non-terminal nodes correspond to operators (e.g., assignments).


```javascript
ASTNode: PGNode {
  // the id of an AST node: an integer 
  Property: Id,  

  // the type of the AST node in the syntax tree
  Property: Type, 

  // the range of the AST node LoC in source code
  Property: Range, 

  // a json indicating the location of the AST node LoC in the source code
  Property: Location, 

  // an arbitrary label assigned to a AST node defining its behaviour symbolically.
  Property: SemanticType, 

  // raw value of identifier AST nodes
  Property: Raw, 

  // value of identifier AST nodes
  Property: Value, 

  // name of identifier AST nodes
  Property: Code, 

  // kind of variable declaration AST nodes
  Property: Kind, 

  // the label of a AST node is the string `ASTNode`
  Property: Label,
}
```

For further information about the `Type` property of the `ASTNode` node, see the syntax tree of JAW, see [here](syntax-tree.md).


## State Values

state values are a series of concrete values (dynamic information) observed during the execution of the program (e.g., event traces, network messages, DOM snapshot, or enviornment properties).

### Event Traces
Event traces are a sequence of events fired during the execution. The meaning of each property of a `PGNode` of label `EventNode` is as follows.  

```javascript
EventNode: PGNode {
  // the id of an EventNode: a uuid string 
  Property: Id,  

  // the type of the fired event
  Property: Type, 

  // event target. i.e., the DOM element on which the element fired
  Property: Value, 

  // the label of the node is the string `EventNode`
  Property: Label,
}
```

### HTTP Requests
The asynchronous HTTP requests triggered during the execution can be modeled in the property graph as a series of `PGNode` objects. The meaning of each property of a `PGNode` of label `RequestNode` is as follows.  

```javascript
RequestNode: PGNode {
  // the id of an RequestNode: a uuid string 
  Property: Id,  

  // the HTTP request method (e.g, GET, POST, etc)
  Property: Type, 
  
  // the kind of the HTTP request (e.g., xmlhttprequest, etc)
  Property: Kind, 

  // the HTTP request endpoint, i.e., the request URL
  Property: Value, 

  // the HTTP request body
  Property: Raw, 

  // the HTTP response status code
  Property: Code, 

  // the label of the node is the string `RequestNode`
  Property: Label,
}
```


### Cookies
In order to conduct a path sensitive control flow analysis, cookies observed during the execution can be stored.
The meaning of each property of a `PGNode` of label `CookieNode` is as follows. 

```javascript
CookieNode: PGNode {
  // the id of an CookieNode: a uuid string 
  Property: Id,  

  // the cookie name
  Property: Raw, 

  // the cookie value
  Property: Value, 

  // whether the cookie is httpOnly
  Property: Type, 

  // the label of the node is the string `CookieNode`
  Property: Label,
}
```


### DOM Snapshot
The snapshots of the rendered HTML tree can be stored in the property graph for points-to analysis of DOM elements.
The meaning of each property of a `PGNode` of label `DOMSnapshot` is as follows. 


```javascript
DOMSnapshot: PGNode {
  // the id of an DOMSnapshot: a uuid string 
  Property: Id,  

  // the path to the HTML file / snapshot
  Property: Location, 

  // the HTML code / snapshot of the DOM tree
  Property: Code, 

  // the label of the node is the string `DOMSnapshot`
  Property: Label,
}
```










