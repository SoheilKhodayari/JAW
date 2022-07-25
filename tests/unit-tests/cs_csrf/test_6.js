
/*

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


  Usage:
  ------------
  python3 -m hpg_analysis.cs_csrf.unit_test --js=test_6.js


  Output:
  ------------
  The following outputs will be located under the /hpg_construction/outputs/unit_tests/cs_csrf/ folder.
    - the hpg model (nodes.csv, rels.csv)
    - request templates (template.out)
  

  Description:
  ------------
  Unit Test file for the detection of client-side CSRF

  
  Source: window.location.hash
  Sink:   Fetch
  Type: Inter-Procedural Call Graph, Aliasing, Nested Objects
  Checks: AST, CFG, PDG, IPCG Edges


*/



var source = window.location.hash;
function sink(url){
	fetch(url);
}


// basic function call
function f1(a1){
	console.log('function f1() invoked.')
	sink(a1);
}
f1(source);


// variable declaration function call
var f2 = function (a2){
	console.log('function f2() invoked.')
	sink(a2);
}
f2(source);


// function call via nested pointers
var lib = { 
		util: { 
			f3: function(a3, a33){

				console.log('function lib.util.f3() invoked.')
				sink(a3);

			}, 
			dummy1: 12 }, 
			dummy2: 13
		};

lib.util.f3(source, null);



// function call via nested pointer dynamically added to the object and aliasing
var d = {}
d.short = lib.util;
d.short.f3(source);




// function call via aliased nested pointer
var obj = { 
	f4: function(a4){
		console.log('function obj.f4() invoked.')
		sink(a4);

	} 
};
var alias = obj;
alias.f4(source);



// function call via nested pointer dynamically added to the object
obj.f5.f55 = function(a5){
		console.log('function obj.f55() invoked.')
		sink(a5);
}
obj.f5.f55(source);


// function call for expression statements (no var/let/const declaration)
f6 = function(a6){
		console.log('function obj.f6() invoked.')
		sink(a6);
}
f6(source)


// function call via nested pointer dynamically added to the object and aliasing
instance1.instance2.dict={ k1: { f7: function(a7){
		console.log('function instance1.instance2.dict.k1.f7() invoked.')
		sink(a7);

}, f8: function(a8){} }, k2: "12", k3: { f9: function(a9){} } };

instance1.instance2.dict.k1.f7(source); // call

var ii = instance1.instance2.dict.k1;
ii.f7(source); // call


