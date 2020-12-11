

const path1 = 'ajaxloc=index.php'; (2)
const path2 = 'ajaxloc=ajax.php'; (6)

var x = '#';    (10)
let bool = true;
if(bool){
	x = x + '2' + path1;   (21)
}else{
	x = x + '2' + path2;   (30)
}
var loc = x;      (38)
window.location.hash =	loc;  (42)

var b = "dummy";
var print = function(b){
	console.log(b);
}

var ajaxloc = window.location;
let xhr = new XMLHttpRequest();

xhr.open('GET', ajaxloc);
xhr.send()


2¿ 21¿ "PDG_parentOf"¿ "DataFlow"¿ "path1"
21¿ 38¿ "PDG_parentOf"¿ "DataFlow"¿ "x"

6¿ 30¿ "PDG_parentOf"¿ "DataFlow"¿ "path2"
30¿ 38¿ "PDG_parentOf"¿ "DataFlow"¿ "x"

10¿ 21¿ "PDG_parentOf"¿ "DataFlow"¿ "x"
10¿ 30¿ "PDG_parentOf"¿ "DataFlow"¿ "x"
10¿ 38¿ "PDG_parentOf"¿ "DataFlow"¿ "x"


38, 42



valueOf(x, 34) --> output = ['ajaxloc=index.php', 'ajaxloc=ajax.php'] 

