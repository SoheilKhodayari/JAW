
let b = 'endpoint';
let a = 10;
let url = 'hello' + b;
var ajaxloc = window.location.href;
var data = {};

fetch('/api/'+ url, {
  method: 'POST', // *GET, POST, PUT, DELETE, etc.
  mode: 'cors', // no-cors, *cors, same-origin
  cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
  credentials: 'same-origin', // include, *same-origin, omit
  headers: {
    'Content-Type': 'application/json'
    // 'Content-Type': 'application/x-www-form-urlencoded',
  },
  redirect: 'follow', // manual, *follow, error
  referrer: 'no-referrer', // no-referrer, *client
  body: JSON.stringify(data) // body data type must match "Content-Type" header
});


let xhr = new XMLHttpRequest();
if (a === 10){
  xhr.open('GET', '/graphql/' + ajaxloc);
}else {

  $.ajax({
     url: '/api-v2/'+ ajaxloc + '/bearer1234/',
     xhrFields: {
        withCredentials: true
     }
  });
}