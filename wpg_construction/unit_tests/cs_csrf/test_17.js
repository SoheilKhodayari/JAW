

// sources
var s1 = window.location.hash; // URL
var s2 = document.cookie; // Cookie
var s3 = document.referrer; // Referrer
var s4 = window.name; 
var s5 = window.localStoraage.getItem('key') // Storage
var s6 = window.sessionStorage.getItem('key') // Storage
var s7; // Post Message


window.addEventListner('message', function(e){
	s7= e.message;
});

// HTML sinks
// 1) document.write
// 2) setTimeout
// 3) element.innerHTML
// 4) breaking html attributes!!
// 5) setInterval
// 6) ...


// may be a library function!
function sanitize(string) {
	return 'sanitized';
}	


document.write(s1);


