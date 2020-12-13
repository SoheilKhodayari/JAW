


var loc = '#ajaxloc=index.php';
if(loc){

window.location.hash =	loc;
var ajaxloc = window.location;
let xhr = new XMLHttpRequest();
xhr.open('GET', ajaxloc);
}
else{
	
}

