

const path1 = 'ajaxloc=index.php';
const path2 = 'ajaxloc=ajax.php';

var x = '#';   
let bool = true;
if(bool){
	x = x + '2' + path1;   
}else{
	x = x + '2' + path2;   
}
var loc = x;      
window.location.hash =	loc;  

var b = "dummy";
var print = function(b){
	console.log(b);
}

var ajaxloc = window.location;
let xhr = new XMLHttpRequest();

xhr.open('GET', ajaxloc);
xhr.send()


