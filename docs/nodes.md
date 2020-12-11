# WPG Nodes and Syntax Tree

JAW uses the Esprima syntax tree format, which is derived from the original version of [Mozilla Parser API](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API), and then formalized and expanded as the [ESTree specification](https://github.com/estree/estree).


## WPG Nodes

Each `WPGNode` contains at its base the following parameters. Depending on the `type` of the node, certain properties will have a value or will be empty. These properties include: `raw`, `value`, `code`, `semanticType`, and `kind`. Each property is shown in the corresponding `WPGNode` type. For example, `kind` shows the type of a `VariableDeclarator` (i.e, `const`, `let` or `var`). The rest of the properties are detailed next.



```js
WPGNode Node {
  id: int;
  type: string;
  range?: [number, number];
  loc?: SourceLocation;
  semanticType: string;
  raw: string;
  value: string;
  code: string;
  kind: string;
}
```

with the source location defined as:

```js
JSON Position {
    line: number;
    column: number;
}

JSON SourceLocation {
    start: Position;
    end: Position;
    source?: string | null;
}
```

## Expressions and Patterns

A binding pattern can be one of the following:

```js
type BindingPattern = ArrayPattern | ObjectPattern;
```

An expression can be one of the following:

```js
type Expression = ThisExpression | Identifier | Literal |
    ArrayExpression | ObjectExpression | FunctionExpression | ArrowFunctionExpression | ClassExpression |
    TaggedTemplateExpression | MemberExpression | Super | MetaProperty |
    NewExpression | CallExpression | UpdateExpression | AwaitExpression | UnaryExpression |
    BinaryExpression | LogicalExpression | ConditionalExpression |
    YieldExpression | AssignmentExpression | SequenceExpression;
```

### Array Pattern

```js
WPGNode ArrayPattern {
    type: 'ArrayPattern';
    elements: ArrayPatternElement[];
}
```

with

```js
type ArrayPatternElement = AssignmentPattern | Identifier | BindingPattern | RestElement | null;

WPGNode RestElement {
    type: 'RestElement';
    argument: Identifier | BindingPattern;
}
```

### Assignment Pattern

```js
WPGNode AssignmentPattern {
    type: 'AssignmentPattern';
    left: Identifier | BindingPattern;
    right: Expression;
}
```

### Object Pattern

```js
WPGNode ObjectPattern {
    type: 'ObjectPattern';
    properties: Property[];
}
```

### This Expression

```js
WPGNode ThisExpression {
    type: 'ThisExpression';
}
```

### Identifier

```js
WPGNode Identifier {
    type: 'Identifier';
    code: string;
}
```

### Literal

```js
WPGNode Literal {
    type: 'Literal';
    value: boolean | number | string | RegExp | null;
    raw: string;
    regex?: { pattern: string, flags: string };
}
```

The `regex` property only applies to regular expression literals.

### Array Expression

```js
WPGNode ArrayExpression {
    type: 'ArrayExpression';
    elements: ArrayExpressionElement[];
}
```

where

```js
type ArrayExpressionElement = Expression | SpreadElement;
```

### Object Expression

```js
WPGNode ObjectExpression {
    type: 'ObjectExpression';
    properties: Property[];
}
```

where

```js
WPGNode Property {
    type: 'Property';
    key: Expression;
    computed: boolean;
    value: Expression | null;
    kind: 'get' | 'set' | 'init';
    method: false;
    shorthand: boolean;
}
```

### Function Expression

```js
WPGNode FunctionExpression {
    type: 'FunctionExpression';
    id: Identifier | null;
    params: FunctionParameter[];
    body: BlockStatement;
    generator: boolean;
    async: boolean;
    expression: boolean;
}
```

with

```js
type FunctionParameter = AssignmentPattern | Identifier | BindingPattern;
```

The value of `generator` is true for a generator expression.

### Arrow Function Expression

```js
WPGNode ArrowFunctionExpression {
    type: 'ArrowFunctionExpression';
    id: Identifier | null;
    params: FunctionParameter[];
    body: BlockStatement | Expression;
    generator: boolean;
    async: boolean;
    expression: false;
}
```

### Class Expression

```js
WPGNode ClassExpression {
    type: 'ClassExpression';
    id: Identifier | null;
    superClass: Identifier | null;
    body: ClassBody;
}
```

with

```js
WPGNode ClassBody {
    type: 'ClassBody';
    body: MethodDefinition[];
}

WPGNode MethodDefinition {
    type: 'MethodDefinition';
    key: Expression | null;
    computed: boolean;
    value: FunctionExpression | null;
    kind: 'method' | 'constructor';
    static: boolean;
}
```

### Tagged Template Expression

```js
WPGNode TaggedTemplateExpression {
    type: 'TaggedTemplateExpression';
    readonly tag: Expression;
    readonly quasi: TemplateLiteral;
}
```

with

```js
WPGNode TemplateElement {
    type: 'TemplateElement';
    value: { cooked: string; raw: string };
    tail: boolean;
}

WPGNode TemplateLiteral {
    type: 'TemplateLiteral';
    quasis: TemplateElement[];
    expressions: Expression[];
}
```

### Member Expression

```js
WPGNode MemberExpression {
    type: 'MemberExpression';
    computed: boolean;
    object: Expression;
    property: Expression;
}
```

### Super

```js
WPGNode Super {
    type: 'Super';
}
```

### MetaProperty

```js
WPGNode MetaProperty {
    type: 'MetaProperty';
    meta: Identifier;
    property: Identifier;
}
```

### Call and New Expressions

```js
WPGNode CallExpression {
    type: 'CallExpression';
    callee: Expression | Import;
    arguments: ArgumentListElement[];
}

WPGNode NewExpression {
    type: 'NewExpression';
    callee: Expression;
    arguments: ArgumentListElement[];
}
```

with

```js
WPGNode Import {
    type: 'Import';
}

type ArgumentListElement = Expression | SpreadElement;

WPGNode SpreadElement {
    type: 'SpreadElement';
    argument: Expression;
}
```

### Update Expression

```js
WPGNode UpdateExpression {
    type: 'UpdateExpression';
    operator: '++' | '--';
    argument: Expression;
    prefix: boolean;
}
```

### Await Expression

```js
WPGNode AwaitExpression {
    type: 'AwaitExpression';
    argument: Expression;
}
```

### Unary Expression

```js
WPGNode UnaryExpression {
    type: 'UnaryExpression';
    operator: '+' | '-' | '~' | '!' | 'delete' | 'void' | 'typeof';
    argument: Expression;
    prefix: true;
}
```

### Binary Expression

```js
WPGNode BinaryExpression {
    type: 'BinaryExpression';
    operator: 'instanceof' | 'in' | '+' | '-' | '*' | '/' | '%' | '**' |
        '|' | '^' | '&' | '==' | '!=' | '===' | '!==' |
        '<' | '>' | '<=' | '<<' | '>>' | '>>>';
    left: Expression;
    right: Expression;
}
```

### Logical Expression

```js
WPGNode LogicalExpression {
    type: 'LogicalExpression';
    operator: '||' | '&&';
    left: Expression;
    right: Expression;
}
```

### Conditional Expression

```js
WPGNode ConditionalExpression {
    type: 'ConditionalExpression';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}
```

### Yield Expression

```js
WPGNode YieldExpression {
    type: 'YieldExpression';
    argument: Expression | null;
    delegate: boolean;
}
```

### Assignment Expression

```js
WPGNode AssignmentExpression {
    type: 'AssignmentExpression';
    operator: '=' | '*=' | '**=' | '/=' | '%=' | '+=' | '-=' |
        '<<=' | '>>=' | '>>>=' | '&=' | '^=' | '|=';
    left: Expression;
    right: Expression;
}
```

### Sequence Expression

```js
WPGNode SequenceExpression {
    type: 'SequenceExpression';
    expressions: Expression[];
}
```

## Statements and Declarations

A statement can be one of the following:

```js
type Statement = BlockStatement | BreakStatement | ContinueStatement |
    DebuggerStatement | DoWhileStatement | EmptyStatement |
    ExpressionStatement | ForStatement | ForInStatement |
    ForOfStatement | FunctionDeclaration | IfStatement |
    LabeledStatement | ReturnStatement | SwitchStatement |
    ThrowStatement | TryStatement | VariableDeclaration |
    WhileStatement | WithStatement;
```

A declaration can be one of the following:

```js
type Declaration = ClassDeclaration | FunctionDeclaration |  VariableDeclaration;
```

A statement list item is either a statement or a declaration:

```js
type StatementListItem = Declaration | Statement;
```

### Block Statement

A series of statements enclosed by a pair of curly braces form a block statement:

```js
WPGNode BlockStatement {
    type: 'BlockStatement';
    body: StatementListItem[];
}
```

### Break Statement

```js
WPGNode BreakStatement {
    type: 'BreakStatement';
    label: Identifier | null;
}
```

### Class Declaration

```js
WPGNode ClassDeclaration {
    type: 'ClassDeclaration';
    id: Identifier | null;
    superClass: Identifier | null;
    body: ClassBody;
}
```

### Continue Statement

```js
WPGNode ContinueStatement {
    type: 'ContinueStatement';
    label: Identifier | null;
}
```

### Debugger Statement

```js
WPGNode DebuggerStatement {
    type: 'DebuggerStatement';
}
```

### Do-While Statement

```js
WPGNode DoWhileStatement {
    type: 'DoWhileStatement';
    body: Statement;
    test: Expression;
}
```

### Empty Statement

```js
WPGNode EmptyStatement {
    type: 'EmptyStatement';
}
```

### Expression Statement

```js
WPGNode ExpressionStatement {
    type: 'ExpressionStatement';
    expression: Expression;
    directive?: string;
}
```

When the expression statement represents a directive (such as `"use strict"`), then the `directive` property will contain the directive string.

### For Statement

```js
WPGNode ForStatement {
    type: 'ForStatement';
    init: Expression | VariableDeclaration | null;
    test: Expression | null;
    update: Expression | null;
    body: Statement;
}
```

### For-In Statement

```js
WPGNode ForInStatement {
    type: 'ForInStatement';
    left: Expression | VariableDeclaration;
    right: Expression;
    body: Statement;
    each: false;
}
```

### For-Of Statement

```js
WPGNode ForOfStatement {
    type: 'ForOfStatement';
    await: boolean;
    left: Expression | VariableDeclaration;
    right: Expression;
    body: Statement;
}
```

### Function Declaration

```js
WPGNode FunctionDeclaration {
    type: 'FunctionDeclaration';
    id: Identifier | null;
    params: FunctionParameter[];
    body: BlockStatement;
    generator: boolean;
    async: boolean;
    expression: false;
}
```

with

```js
type FunctionParameter = AssignmentPattern | Identifier | BindingPattern;
```

### If Statement

```js
WPGNode IfStatement {
    type: 'IfStatement';
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}
```

### Labelled Statement

A statement prefixed by a label becomes a labelled statement:

```js
WPGNode LabeledStatement {
    type: 'LabeledStatement';
    label: Identifier;
    body: Statement;
}
```

### Return Statement

```js
WPGNode ReturnStatement {
    type: 'ReturnStatement';
    argument: Expression | null;
}
```

### Switch Statement

```js
WPGNode SwitchStatement {
    type: 'SwitchStatement';
    discriminant: Expression;
    cases: SwitchCase[];
}
```

with

```js
WPGNode SwitchCase {
    type: 'SwitchCase';
    test: Expression | null;
    consequent: Statement[];
}
```

### Throw Statement

```js
WPGNode ThrowStatement {
    type: 'ThrowStatement';
    argument: Expression;
}
```

### Try Statement

```js
WPGNode TryStatement {
    type: 'TryStatement';
    block: BlockStatement;
    handler: CatchClause | null;
    finalizer: BlockStatement | null;
}
```

with

```js
WPGNode CatchClause {
    type: 'CatchClause';
    param: Identifier | BindingPattern;
    body: BlockStatement;
}
```

### Variable Declaration

```js
WPGNode VariableDeclaration {
    type: 'VariableDeclaration';
    declarations: VariableDeclarator[];
    kind: 'var' | 'const' | 'let';
}
```

with

```js
WPGNode VariableDeclarator {
    type: 'VariableDeclarator';
    id: Identifier | BindingPattern;
    init: Expression | null;
}
```

### While Statement

```js
WPGNode WhileStatement {
    type: 'WhileStatement';
    test: Expression;
    body: Statement;
}
```

### With Statement

```js
WPGNode WithStatement {
    type: 'WithStatement';
    object: Expression;
    body: Statement;
}
```

## Scripts and Modules

A program can be either a script or a module.

```js
WPGNode Program {
  type: 'Program';
  sourceType: 'script';
  body: StatementListItem[];
}

WPGNode Program {
  type: 'Program';
  sourceType: 'module';
  body: ModuleItem[];
}
```

with

```js
type StatementListItem = Declaration | Statement;
type ModuleItem = ImportDeclaration | ExportDeclaration | StatementListItem;
```

### Import Declaration

```js
type ImportDeclaration {
    type: 'ImportDeclaration';
    specifiers: ImportSpecifier[];
    source: Literal;
}
```

with

```js
WPGNode ImportSpecifier {
    type: 'ImportSpecifier' | 'ImportDefaultSpecifier' | 'ImportNamespaceSpecifier';
    local: Identifier;
    imported?: Identifier;
}
```

### Export Declaration

An export declaration can be in the form of a batch, a default, or a named declaration.

```js
type ExportDeclaration = ExportAllDeclaration | ExportDefaultDeclaration | ExportNamedDeclaration;
```

Each possible export declaration is described as follows:

```js
WPGNode ExportAllDeclaration {
    type: 'ExportAllDeclaration';
    source: Literal;
}

WPGNode ExportDefaultDeclaration {
    type: 'ExportDefaultDeclaration';
    declaration: Identifier | BindingPattern | ClassDeclaration | Expression | FunctionDeclaration;
}

WPGNode ExportNamedDeclaration {
    type: 'ExportNamedDeclaration';
    declaration: ClassDeclaration | FunctionDeclaration | VariableDeclaration;
    specifiers: ExportSpecifier[];
    source: Literal;
}
```

with

```js
WPGNode ExportSpecifier {
    type: 'ExportSpecifier';
    exported: Identifier;
    local: Identifier;
};
```