# Syntax Tree

JAW uses the Esprima syntax tree format, which is derived from the original version of the [Mozilla Parser API](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API), and then formalized and expanded as the [ESTree specification](https://github.com/estree/estree).


## Abstract Syntax Tree: PGNodes 

Each AST `PGNode` contains at its base the following parameters. Depending on the `type` of the node, certain properties will have a value or will be empty. These properties include: `raw`, `value`, `code`, `semanticType`, and `kind`. Each property is shown in the corresponding `PGNode` type. For example, `kind` shows the type of a `VariableDeclarator` (i.e, `const`, `let` or `var`). The rest of the properties are detailed next.



```js
PGNode Node {
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
PGNode ArrayPattern {
    type: 'ArrayPattern';
    elements: ArrayPatternElement[];
}
```

with

```js
type ArrayPatternElement = AssignmentPattern | Identifier | BindingPattern | RestElement | null;

PGNode RestElement {
    type: 'RestElement';
    argument: Identifier | BindingPattern;
}
```

### Assignment Pattern

```js
PGNode AssignmentPattern {
    type: 'AssignmentPattern';
    left: Identifier | BindingPattern;
    right: Expression;
}
```

### Object Pattern

```js
PGNode ObjectPattern {
    type: 'ObjectPattern';
    properties: Property[];
}
```

### This Expression

```js
PGNode ThisExpression {
    type: 'ThisExpression';
}
```

### Identifier

```js
PGNode Identifier {
    type: 'Identifier';
    code: string;
}
```

### Literal

```js
PGNode Literal {
    type: 'Literal';
    value: boolean | number | string | RegExp | null;
    raw: string;
    regex?: { pattern: string, flags: string };
}
```

The `regex` property only applies to regular expression literals.

### Array Expression

```js
PGNode ArrayExpression {
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
PGNode ObjectExpression {
    type: 'ObjectExpression';
    properties: Property[];
}
```

where

```js
PGNode Property {
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
PGNode FunctionExpression {
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
PGNode ArrowFunctionExpression {
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
PGNode ClassExpression {
    type: 'ClassExpression';
    id: Identifier | null;
    superClass: Identifier | null;
    body: ClassBody;
}
```

with

```js
PGNode ClassBody {
    type: 'ClassBody';
    body: MethodDefinition[];
}

PGNode MethodDefinition {
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
PGNode TaggedTemplateExpression {
    type: 'TaggedTemplateExpression';
    readonly tag: Expression;
    readonly quasi: TemplateLiteral;
}
```

with

```js
PGNode TemplateElement {
    type: 'TemplateElement';
    value: { cooked: string; raw: string };
    tail: boolean;
}

PGNode TemplateLiteral {
    type: 'TemplateLiteral';
    quasis: TemplateElement[];
    expressions: Expression[];
}
```

### Member Expression

```js
PGNode MemberExpression {
    type: 'MemberExpression';
    computed: boolean;
    object: Expression;
    property: Expression;
}
```

### Super

```js
PGNode Super {
    type: 'Super';
}
```

### MetaProperty

```js
PGNode MetaProperty {
    type: 'MetaProperty';
    meta: Identifier;
    property: Identifier;
}
```

### Call and New Expressions

```js
PGNode CallExpression {
    type: 'CallExpression';
    callee: Expression | Import;
    arguments: ArgumentListElement[];
}

PGNode NewExpression {
    type: 'NewExpression';
    callee: Expression;
    arguments: ArgumentListElement[];
}
```

with

```js
PGNode Import {
    type: 'Import';
}

type ArgumentListElement = Expression | SpreadElement;

PGNode SpreadElement {
    type: 'SpreadElement';
    argument: Expression;
}
```

### Update Expression

```js
PGNode UpdateExpression {
    type: 'UpdateExpression';
    operator: '++' | '--';
    argument: Expression;
    prefix: boolean;
}
```

### Await Expression

```js
PGNode AwaitExpression {
    type: 'AwaitExpression';
    argument: Expression;
}
```

### Unary Expression

```js
PGNode UnaryExpression {
    type: 'UnaryExpression';
    operator: '+' | '-' | '~' | '!' | 'delete' | 'void' | 'typeof';
    argument: Expression;
    prefix: true;
}
```

### Binary Expression

```js
PGNode BinaryExpression {
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
PGNode LogicalExpression {
    type: 'LogicalExpression';
    operator: '||' | '&&';
    left: Expression;
    right: Expression;
}
```

### Conditional Expression

```js
PGNode ConditionalExpression {
    type: 'ConditionalExpression';
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}
```

### Yield Expression

```js
PGNode YieldExpression {
    type: 'YieldExpression';
    argument: Expression | null;
    delegate: boolean;
}
```

### Assignment Expression

```js
PGNode AssignmentExpression {
    type: 'AssignmentExpression';
    operator: '=' | '*=' | '**=' | '/=' | '%=' | '+=' | '-=' |
        '<<=' | '>>=' | '>>>=' | '&=' | '^=' | '|=';
    left: Expression;
    right: Expression;
}
```

### Sequence Expression

```js
PGNode SequenceExpression {
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
PGNode BlockStatement {
    type: 'BlockStatement';
    body: StatementListItem[];
}
```

### Break Statement

```js
PGNode BreakStatement {
    type: 'BreakStatement';
    label: Identifier | null;
}
```

### Class Declaration

```js
PGNode ClassDeclaration {
    type: 'ClassDeclaration';
    id: Identifier | null;
    superClass: Identifier | null;
    body: ClassBody;
}
```

### Continue Statement

```js
PGNode ContinueStatement {
    type: 'ContinueStatement';
    label: Identifier | null;
}
```

### Debugger Statement

```js
PGNode DebuggerStatement {
    type: 'DebuggerStatement';
}
```

### Do-While Statement

```js
PGNode DoWhileStatement {
    type: 'DoWhileStatement';
    body: Statement;
    test: Expression;
}
```

### Empty Statement

```js
PGNode EmptyStatement {
    type: 'EmptyStatement';
}
```

### Expression Statement

```js
PGNode ExpressionStatement {
    type: 'ExpressionStatement';
    expression: Expression;
    directive?: string;
}
```

When the expression statement represents a directive (such as `"use strict"`), then the `directive` property will contain the directive string.

### For Statement

```js
PGNode ForStatement {
    type: 'ForStatement';
    init: Expression | VariableDeclaration | null;
    test: Expression | null;
    update: Expression | null;
    body: Statement;
}
```

### For-In Statement

```js
PGNode ForInStatement {
    type: 'ForInStatement';
    left: Expression | VariableDeclaration;
    right: Expression;
    body: Statement;
    each: false;
}
```

### For-Of Statement

```js
PGNode ForOfStatement {
    type: 'ForOfStatement';
    await: boolean;
    left: Expression | VariableDeclaration;
    right: Expression;
    body: Statement;
}
```

### Function Declaration

```js
PGNode FunctionDeclaration {
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
PGNode IfStatement {
    type: 'IfStatement';
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}
```

### Labelled Statement

A statement prefixed by a label becomes a labelled statement:

```js
PGNode LabeledStatement {
    type: 'LabeledStatement';
    label: Identifier;
    body: Statement;
}
```

### Return Statement

```js
PGNode ReturnStatement {
    type: 'ReturnStatement';
    argument: Expression | null;
}
```

### Switch Statement

```js
PGNode SwitchStatement {
    type: 'SwitchStatement';
    discriminant: Expression;
    cases: SwitchCase[];
}
```

with

```js
PGNode SwitchCase {
    type: 'SwitchCase';
    test: Expression | null;
    consequent: Statement[];
}
```

### Throw Statement

```js
PGNode ThrowStatement {
    type: 'ThrowStatement';
    argument: Expression;
}
```

### Try Statement

```js
PGNode TryStatement {
    type: 'TryStatement';
    block: BlockStatement;
    handler: CatchClause | null;
    finalizer: BlockStatement | null;
}
```

with

```js
PGNode CatchClause {
    type: 'CatchClause';
    param: Identifier | BindingPattern;
    body: BlockStatement;
}
```

### Variable Declaration

```js
PGNode VariableDeclaration {
    type: 'VariableDeclaration';
    declarations: VariableDeclarator[];
    kind: 'var' | 'const' | 'let';
}
```

with

```js
PGNode VariableDeclarator {
    type: 'VariableDeclarator';
    id: Identifier | BindingPattern;
    init: Expression | null;
}
```

### While Statement

```js
PGNode WhileStatement {
    type: 'WhileStatement';
    test: Expression;
    body: Statement;
}
```

### With Statement

```js
PGNode WithStatement {
    type: 'WithStatement';
    object: Expression;
    body: Statement;
}
```

## Scripts and Modules

A program can be either a script or a module.

```js
PGNode Program {
  type: 'Program';
  sourceType: 'script';
  body: StatementListItem[];
}

PGNode Program {
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
PGNode ImportSpecifier {
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
PGNode ExportAllDeclaration {
    type: 'ExportAllDeclaration';
    source: Literal;
}

PGNode ExportDefaultDeclaration {
    type: 'ExportDefaultDeclaration';
    declaration: Identifier | BindingPattern | ClassDeclaration | Expression | FunctionDeclaration;
}

PGNode ExportNamedDeclaration {
    type: 'ExportNamedDeclaration';
    declaration: ClassDeclaration | FunctionDeclaration | VariableDeclaration;
    specifiers: ExportSpecifier[];
    source: Literal;
}
```

with

```js
PGNode ExportSpecifier {
    type: 'ExportSpecifier';
    exported: Identifier;
    local: Identifier;
};
```