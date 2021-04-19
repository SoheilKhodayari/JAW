


const arg = 'ajaxloc=';
const val = 'ajax.php';
let xhr = new XMLHttpRequest();
var ajaxloc = arg  + val;

// triggers the onhashchange and thus xhr send
window.location.hash = ajaxloc;


window.addEventListener('onhashchange', function(e){
	var newURL = e.newURL;
	var oldURL = e.oldURL;
	var newHash = newURL.split("#")[1];

	xhr.open('GET', newHash);
	xhr.send()
});