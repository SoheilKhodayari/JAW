// 'pass/transform-dynamic-to-static-property-access'
var b = a["b"]; 

// 'pass/transform-dynamic-to-static-property-definition',
var x = {"a": "b"};


// 'pass/reordering-function-declarations',
f();
function f(){
}

// 'pass/remove-empty-statement'
;

// 'pass/remove-wasted-blocks',
if(a){}
{}

// 'pass/reduce-sequence-expression',
 d=(4, 7) + (3, a)

// 'pass/reduce-multiple-if-statements',
 if(x){
 	if(y){
 		console.log(x, y);
 	}
 }

// 'pass/dead-code-elimination' && 'pass/remove-side-effect-free-expressions'
if(false){
	console.log(z);
}


// 'pass/tree-based-constant-folding',
var x = "x" + "y" + "z"
var b = a["b" + "c"]; 


// 'pass/remove-context-sensitive-expressions',
a?0:1;
a?0:b;
a?b:0 ;


// 'pass/reduce-branch-jump',
function g(){
	if(cond) return v;
	return v2;
}


