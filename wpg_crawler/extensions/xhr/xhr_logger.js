
/* See https://developer.chrome.com/extensions/webRequest for documentation! */

var EXCHANGE_TOKEN_REQ_WITHOUT_DATA = 'EXCHANGE_TOKEN_REQ_WITHOUT_DATA'; /* all requests without requestBody */
var EXCHANGE_TOKEN_REQ_WITH_DATA = 'EXCHANGE_TOKEN_REQ_WITH_DATA'; /* all requests with requestBody */
var EXCHANGE_TOKEN_REQ_SUCC = 'EXCHANGE_TOKEN_REQ_SUCC';  /* requests with sucessful HTTP response from server */
/**
 * @WebRequestTypes:
 * "main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", or "other"
 */

var DEBUG = false;

function createDataElement(details, exchange_token){


  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    var currentTab = tabs[0];
    if(currentTab && currentTab.id){

      let tabId = currentTab.id;
      let d = JSON.stringify(details);
      DEBUG && console.log(details);
      chrome.tabs.executeScript(tabId,
        { code:
        `if (typeof mdivElement !== 'undefined') {
          mdivElement = window.document.createElement('div'); 
          mdivElement.setAttribute('class', '${exchange_token}');
          mdivElement.innerHTML = JSON.stringify('${ d }');
          window.document.body.appendChild(mdivElement);
        }else{
          let mdivElement = window.document.createElement('div');
          mdivElement.setAttribute('class', '${exchange_token}');
          mdivElement.innerHTML = JSON.stringify('${ d }');
          window.document.body.appendChild(mdivElement);
        }`
      }, _=>{
          /* catch exceptions thrown when accessing chrome:// URLs; should not happen in selenium testing! */
          let e = chrome.runtime.lastError;
          if(e !== undefined){
            // console.log(tabId, _, e);
          }
      });

    }/* end-if */

  });

}

/* @USAGE: capture formData or posted xhr calls*/
/* @ExampleFormat: these are key:values sent as formData to the server
 * includeBlocks: (2) ["LEGACY_CHAT_BLOCKS", "USER_TO_USER"]
 * key: ["AIzaSyD7InnYR3VKdb4j2rMUEbTCIr2VyEazl6k"]
 * personExpansion: ["ID_AND_NAME_ONLY"]
 * requestMask.includeField.paths: (2) ["person.metadata", "person.name"]
 */

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if(details.type == 'xmlhttprequest' || details.type == 'other') { /* filter-out non-xhr or non-form requests */

        if(details && details.requestBody){
           // e.g., POST request: requestBody is present
           let d = {'requestId': details.requestId ,'url': details.url, 'type': details.type, 'initiator': details.initiator, 'method': details.method, 'requestBody': details.requestBody} // details.requestBody.formData
           createDataElement(d, EXCHANGE_TOKEN_REQ_WITH_DATA);    
        }
        else if(details){
           // e.g., GET request: no requestBody is present
           let d = {'requestId': details.requestId, 'url': details.url, 'type': details.type, 'initiator': details.initiator, 'method': details.method}
           createDataElement(d, EXCHANGE_TOKEN_REQ_WITHOUT_DATA);      
        } 
    }

  },
  {urls: ["<all_urls>"]},
  ["requestBody"]
);


/* @USAGE: capture accepted requests: server response HTTP status code */
/* @ExampleFormat 
 * {"frameId":0,"fromCache":false,"initiator":"https://stackoverflow.com","ip":"151.101.65.69",
 * "method":"GET","parentFrameId":-1,"requestId":"51936","statusCode":204,"statusLine":"HTTP/1.1 204",
 * "tabId":642,"timeStamp":1572962581283.0278,"type":"xmlhttprequest","url":"https://stackoverflow.com/posts/16493498/ivc/5b47?_=1572962580908"}
 */
chrome.webRequest.onCompleted.addListener(function (details) {

	let statusCode = '' + details.statusCode;
	let skip = statusCode.substring(0, 1) !== '2'; /* request not accepted */
	if(!skip && 
	  (details.type === "xmlhttprequest" || details.type === "other")){
    let d = {'requestId': details.requestId, 'url': details.url, 'type': details.type, 'initiator': details.initiator, 'method': details.method, 'status': details.statusCode };
    createDataElement(d, EXCHANGE_TOKEN_REQ_SUCC);
	}
}, {urls: ['*://*/*']}) // limit to http/https




// Other Method: Hook xhr call or form submission API's
// // XML HTTP Request && Fetch API Overwrite
// (function() {

//  // open -->> capture XHR url
//     var proxied_open = window.XMLHttpRequest.prototype.open;
//     window.XMLHttpRequest.prototype.open = function() {
//         console.log( arguments );
//         return proxied_open.apply(this, [].slice.call(arguments));
//     };

//     // send -->> capture XHR formData
//     var proxied_send = window.XMLHttpRequest.prototype.send;
//     window.XMLHttpRequest.prototype.send = function() {
//         console.log( arguments );
//         return proxied_send.apply(this, [].slice.call(arguments));
//     };

// })();



 