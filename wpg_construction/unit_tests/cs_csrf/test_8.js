


const arg = 'ajaxloc=';
const val = 'ajax.php';
let xhr = new XMLHttpRequest();
var ajaxloc = arg  + val;

var w = window; 
console.log(w);
var wl = w.location;
var wlh = wl.hash; 

// triggers the onhashchange and thus xhr send
wlh = ajaxloc;


var b = "dummy";
var print = function(b){
	console.log(b);
}

window.addEventListener('onhashchange', function(e){
	var newURL = e.newURL;
	var oldURL = e.oldURL;
	var newHash = newURL.split("#")[1];

	xhr.open('GET', newHash);
	xhr.send()
});