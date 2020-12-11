# WPG Edges

A WPG edges encode the syntax of the program, as well as the semantic of control and data flows.

## Abstract Syntax Tree (AST) Edges.
**What is an AST edge?**
an AST edge connects two program elements that are syntactically connected to each other following the calculation of the program.

**Type.** An AST edge has the `Type` attribute set to `AST_parentOf`. 

**RelationType.** The `RelationType` attribute is set to the type of the relationship between to elements of the program in the AST, e.g., `callee` for `CallExpression`

## Control Flow Graph (CFG) Edges.
A CFG edge describes the order in which program statements are executed and the conditions required to reach a particular path of execution.

**Type.** A CFG edge has the `Type` attribute set to `CFG_parentOf`. 

**RelationType.** `RelationType` is set to `true` or `false` for conditional control flows, and to `epsilon` for unconditional flows.

## Program Dependence Graph (PDG) Edges.
A value of a variable depends on a series of statements and predicates and a PDG
models these data flow dependencies.

**Type.** A PDG edge has the `Type` attribute set to `PDG_parentOf`.

**Arguments.** The Argument is set to the variable/identifier name for the data flow.

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
You can resolve accesses to the DOM tree using the snapshot taken by the crawler. For this, you can use [BeautifulSoup](https://pypi.org/project/beautifulsoup4/) or [Domino](https://github.com/fgnass/domino).

```javascript
var domino = require('domino');
var Element = domino.impl.Element; 

html = 'a string containing the html snapshot taken by the crawler'

var window = domino.createWindow(html);
var document = window.document;

var h1 = document.querySelector('h1');
console.log(h1.innerHTML);
```

