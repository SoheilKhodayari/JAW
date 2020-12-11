
const path1 = 'ajaxloc=index.php';
const path2 = 'ajaxloc=ajax.php';

var x = '#';
let bool = true;
if(bool){
	x = x + path1;
}else{
	x = x + path2;
}

var joinStrings= function(z, y){
	return z + y + ';'
}

var loc = joinStrings('#', 'init')+ x;

window.location.hash =	loc;

var ajaxloc = window.location;
let xhr = new XMLHttpRequest();

xhr.open('GET', ajaxloc);
xhr.send()


