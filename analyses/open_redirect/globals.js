/**
 * List of Window object properties
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Window
 */
const window_properties = ["caches", "closed", "console", "controllers", "crossOriginIsolated", "crypto", "customElements", "defaultStatus", "devicePixelRatio", "dialogArguments", "directories", "document", "event", "frameElement", "frames", "fullScreen", "history", "indexedDB", "innerHeight", "innerWidth", "isSecureContext", "isSecureContext", "length", "localStorage", "location", "locationbar", "menubar", "mozAnimationStartTime", "mozInnerScreenX", "mozInnerScreenY", "name", "navigator", "onabort", "onafterprint", "onanimationcancel", "onanimationend", "onanimationiteration", "onappinstalled", "onauxclick", "onbeforeinstallprompt", "onbeforeprint", "onbeforeunload", "onblur", "oncancel", "oncanplay", "oncanplaythrough", "onchange", "onclick", "onclose", "oncontextmenu", "oncuechange", "ondblclick", "ondevicemotion", "ondeviceorientation", "ondeviceorientationabsolute", "ondragdrop", "ondurationchange", "onended", "onerror", "onfocus", "onformdata", "ongamepadconnected", "ongamepaddisconnected", "ongotpointercapture", "onhashchange", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onlanguagechange", "onload", "onloadeddata", "onloadedmetadata", "onloadend", "onloadstart", "onlostpointercapture", "onmessage", "onmessageerror", "onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onpaint", "onpause", "onplay", "onplaying", "onpointercancel", "onpointerdown", "onpointerenter", "onpointerleave", "onpointermove", "onpointerout", "onpointerover", "onpointerup", "onpopstate", "onrejectionhandled", "onreset", "onresize", "onscroll", "onselect", "onselectionchange", "onselectstart", "onstorage", "onsubmit", "ontouchcancel", "ontouchstart", "ontransitioncancel", "ontransitionend", "onunhandledrejection", "onunload", "onvrdisplayactivate", "onvrdisplayblur", "onvrdisplayconnect", "onvrdisplaydeactivate", "onvrdisplaydisconnect", "onvrdisplayfocus", "onvrdisplaypointerrestricted", "onvrdisplaypointerunrestricted", "onvrdisplaypresentchange", "onwheel", "opener", "origin", "outerHeight", "outerWidth", "pageXOffset", "pageYOffset", "parent", "performance", "personalbar", "pkcs11", "screen", "screenLeft", "screenTop", "screenX", "screenY", "scrollbars", "scrollMaxX", "scrollMaxY", "scrollX", "scrollY", "self", "sessionStorage", "sidebar", "speechSynthesis", "status", "statusbar", "toolbar", "top", "visualViewport"];

/**
 * List of Window object methods
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Window
 */
const window_methods = ["alert", "atob", "blur", "btoa", "cancelAnimationFrame", "cancelIdleCallback", "captureEvents", "clearImmediate", "clearInterval", "clearTimeout", "close", "confirm", "convertPointFromNodeToPage", "convertPointFromPageToNode", "createImageBitmap", "dump", "fetch", "find", "focus", "getComputedStyle", "getDefaultComputedStyle", "getSelection", "home", "matchMedia", "minimize", "moveBy", "moveTo", "open", "openDialog", "postMessage", "print", "prompt", "queueMicrotask", "releaseEvents", "requestAnimationFrame", "requestIdleCallback", "resizeBy", "resizeTo", "routeEvent", "scroll", "scrollBy", "scrollByLines", "scrollByPages", "scrollTo", "setCursor", "setImmediate", "setInterval", "setTimeout", "showDirectoryPicker", "showModalDialog", "showOpenFilePicker", "showSaveFilePicker", "sizeToContent", "stop", "updateCommands", "addEventListener"];

/**
 * List of Window object event properties
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Window
 */
const window_events = ["event", "afterprint", "animationcancel", "animationend", "animationiteration", "beforeprint", "beforeunload", "blur", "copy", "cut", "DOMContentLoaded", "error", "focus", "hashchange", "languagechange", "load", "message", "messageerror", "offline", "online", "orientationchange", "pagehide", "pageshow", "paste", "popstate", "rejectionhandled", "storage", "transitioncancel", "unhandledrejection", "unload", "vrdisplayconnect", "vrdisplaydisconnect", "vrdisplaypresentchange"];



/**
 * List of Window object properties
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Document
 */
const document_properties = ["cookie", "activeElement", "alinkColor", "all", "anchors", "applets", "bgColor", "body", "characterSet", "childElementCount", "children", "compatMode", "contentType", "currentScript", "defaultView", "designMode", "dir", "doctype", "documentElement", "documentURI", "documentURIObject", "domain", "embeds", "fgColor", "firstElementChild", "forms", "fullscreen", "fullscreenElement", "fullscreenEnabled", "head", "height", "hidden", "images", "implementation", "lastElementChild", "lastModified", "lastStyleSheetSet", "linkColor", "links", "location", "mozSyntheticDocument", "onabort", "onafterscriptexecute", "onanimationcancel", "onanimationend", "onanimationiteration", "onauxclick", "onbeforescriptexecute", "onblur", "oncancel", "oncanplay", "oncanplaythrough", "onchange", "onclick", "onclose", "oncontextmenu", "oncuechange", "ondblclick", "ondurationchange", "onended", "onerror", "onfocus", "onformdata", "onfullscreenchange", "onfullscreenerror", "ongotpointercapture", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload", "onloadeddata", "onloadedmetadata", "onloadend", "onloadstart", "onlostpointercapture", "onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onoffline", "ononline", "onpause", "onplay", "onplaying", "onpointercancel", "onpointerdown", "onpointerenter", "onpointerleave", "onpointermove", "onpointerout", "onpointerover", "onpointerup", "onreset", "onresize", "onscroll", "onselect", "onselectionchange", "onselectstart", "onsubmit", "ontouchcancel", "ontouchstart", "ontransitioncancel", "ontransitionend", "onvisibilitychange", "onwheel", "pictureInPictureElement", "pictureInPictureEnabled", "plugins", "pointerLockElement", "popupNode", "preferredStyleSheetSet", "readyState", "referrer", "rootElement", "scripts", "scrollingElement", "selectedStyleSheetSet", "styleSheets", "styleSheetSets", "timeline", "title", "tooltipNode", "URL", "visibilityState", "vlinkColor", "width", "xmlEncoding", "xmlVersion"];

/**
 * List of document object methods
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Document
 */
const document_methods = ["adoptNode", "append", "caretPositionFromPoint", "caretRangeFromPoint", "clear", "close", "createAttribute", "createCDATASection", "createComment", "createDocumentFragment", "createElement", "createElementNS", "createEntityReference", "createEvent", "createExpression", "createExpression", "createNodeIterator", "createNSResolver", "createNSResolver", "createProcessingInstruction", "createRange", "createTextNode", "createTouch", "createTouchList", "createTreeWalker", "elementFromPoint", "elementsFromPoint", "enableStyleSheetsForSet", "evaluate", "evaluate", "execCommand", "exitFullscreen", "exitPictureInPicture", "exitPointerLock", "getAnimations", "getBoxObjectFor", "getElementById", "getElementsByClassName", "getElementsByName", "getElementsByTagName", "getElementsByTagNameNS", "getSelection", "hasFocus", "hasStorageAccess", "importNode", "mozSetImageElement", "open", "prepend", "queryCommandEnabled", "queryCommandSupported", "querySelector", "querySelectorAll", "registerElement", "releaseCapture", "replaceChildren", "requestStorageAccess", "write", "writeln", "addEventListener"];

/**
 * List of document object event properties
 * Fetch from: https://developer.mozilla.org/en-US/docs/Web/API/Document
 */
const document_events = ["animationcancel", "animationend", "animationiteration", "animationstart", "copy", "cut", "DOMContentLoaded", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "fullscreenchange", "fullscreenerror", "gotpointercapture", "keydown", "keypress", "keyup", "lostpointercapture", "paste", "pointercancel", "pointerdown", "pointerenter", "pointerleave", "pointerlockchange", "pointerlockerror", "pointermove", "pointerout", "pointerover", "pointerup", "readystatechange", "scroll", "selectionchange", "selectstart", "touchcancel", "touchend", "touchmove", "touchstart", "transitioncancel", "transitionend", "transitionrun", "transitionstart", "visibilitychange", "wheel"];


const _2nd_level_method_calls = ["appendChild", "console", "log"];



const all_global_props = window_properties.concat(document_properties,document_methods,window_methods);


// List curated through aggregation of other lists
// - https://www.w3schools.com/jsref/jsref_obj_array.asp
var js_builtin_methods = new Set([
    
    // Functions
    "apply",
    "call",
    "bind",

    // Arrays         
    "concat",    
    "copyWithin",
    "entries",   
    "every",     
    "fill",      
    "filter",    
    "find",      
    "findIndex", 
    "forEach",   
    "from",      
    "includes",  
    "indexOf",   
    "isArray",   
    "join",      
    "keys",      
    "lastIndexOf",
    "map",       
    "pop",       
    "push",      
    "reduce",    
    "reduceRight",
    "reverse",   
    "shift",     
    "slice",     
    "some",      
    "sort",      
    "splice",    
    "toString",  
    "unshift",   
    "valueOf",   

    // Boolean
    "toString",  
    "valueOf", 

    // Classes
    "extends",
    "super",
    "static",

    // Date
    "getDate",
    "getDay",
    "getFullYear",
    "getHours",
    "getMilliseconds",
    "getMinutes",
    "getMonth",
    "getSeconds",
    "getTime",
    "getTimezoneOffset",
    "getUTCDate",
    "getUTCDay",
    "getUTCFullYear",
    "getUTCHours",
    "getUTCMilliseconds",
    "getUTCMinutes",
    "getUTCMonth",
    "getUTCSeconds",
    "getYear",
    "now",
    "parse",
    "setDate",
    "setFullYear",
    "setHours",
    "setMilliseconds",
    "setMinutes",
    "setMonth",
    "setSeconds",
    "setTime",
    "setUTCDate",
    "setUTCFullYear",
    "setUTCHours",
    "setUTCMilliseconds",
    "setUTCMinutes",
    "setUTCMonth",
    "setUTCSeconds",
    "setYear",
    "toDateString",
    "toGMTString",
    "toISOString",
    "toJSON",
    "toLocaleDateString",
    "toLocaleTimeString",
    "toLocaleString",
    "toString",
    "toTimeString",
    "toUTCString",
    "UTC",
    "valueOf",

    // JSON
    "parse",
    "stringify",

    // MATH
    "abs",
    "acos",
    "acosh",
    "asin",
    "asinh",
    "atan",
    "atan2",
    "atanh",
    "cbrt",
    "ceil",
    "clz32",
    "cos  ",
    "cosh",
    "exp",
    "expm1",
    "floor",
    "fround",
    "log",
    "log10",
    "log1p",
    "log2",
    "max",
    "min",
    "pow",
    "random",
    "round",
    "sign ",
    "sin  ",
    "sinh",
    "sqrt",
    "tan",
    "tanh",
    "trunc",

    // Number
    "isFinite",
    "isInteger",
    "isNaN",
    "isSafeInteger",
    "toExponential",
    "toFixed",
    "toLocaleString",
    "toPrecision",
    "toString",
    "valueOf",

    // RegExp
    "compile",

    // String
    "charAt",
    "charCodeAt",
    "concat",
    "endsWith",
    "fromCharCode",
    "includes",
    "indexOf",
    "lastIndexOf",
    "localeCompare",
    "match",
    "repeat",
    "replace",
    "search",
    "slice",
    "split",
    "startsWith",
    "substr",
    "substring",
    "toLocaleLowerCase",
    "toLocaleUpperCase",
    "toLowerCase",
    "toString",
    "toUpperCase",
    "trim",
    "valueOf"
]);


js_builtin_methods = Array.from(js_builtin_methods)
const buildint_dom_api = [
    "window",
    "document"
].concat(all_global_props)

const js_builtin = js_builtin_methods.concat(buildint_dom_api);



var lib_content_heuristics = [
    // jquery
    "*! jQuery v",
    "(c) OpenJS Foundation and other contributors | jquery.org/license",
    "jQuery Foundation, Inc. | jquery.org/license *",
    // bootstrap
    "* Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)",
    "* Bootstrap v",
    // prototype
    "*  Prototype JavaScript framework, version",
    // angular js
    "@license AngularJS v",
    "Google LLC. http://angularjs.org",
    "AngularJS v",
    // react
    "* @license React",
    // d3
    "https://d3js.org v",
    // require js
    "* @license r.js ",
    "* @license RequireJS ",
    // ext js
    "This file is part of Ext JS ",
    "Contact:  http://www.sencha.com/contact",
    // leaflet
    "* Leaflet "
];


// one-to-one mapping between the name of the library and the heuristic
// as in `lib_content_heuristics` list
var lib_content_heuristics_names = [
    'jquery',
    'jquery',
    'jquery',
    'bootstrap',
    'bootstrap',
    'prototype',
    'angularjs',
    'angularjs',
    'angularjs',
    'reactjs',
    'd3js',
    'requirejs',
    'requirejs',
    'extjs',
    'extjs',
    'leaflet',
]; 

var lib_src_heuristics = [
    // common cdns
    "unpkg.com/",
    "ajax.googleapis.com/ajax/libs/",
    "cdnjs.cloudflare.com/ajax/libs/",
    // custom 
    "lib/",
    "libs/",
    "/libraries/",
    // library names
    "gajs", // google analytics
    "google-analytics-js",
    "analytics.js",
    "gwt",
    "ink",
    "vaadin",
    "bootstrap",
    "zurb",
    "polymer",
    "highcharts",
    "infovis",
    "flotcharts",
    "createjs",
    "googlemaps",
    "google-maps",
    "jquery",
    "jqueryui",
    "dojo",
    "prototype",
    "scriptaculous",
    "mootools",
    "spry",
    "yui",
    "yui2",
    "yui3",
    "qooxdoo",
    "extjs",
    "ext.js",
    "ext-all.js",
    "base2",
    "closurelibrary",
    "rapha&euml",
    "react",
    "reactjs",
    "nextjs",
    "next.js",
    "preact",
    "preactjs",
    "modernizr",
    "processingjs",
    "backbone",
    "leaflet",
    "mapbox",
    "lo-dash",
    "underscore",
    "sammy",
    "rico",
    "mochikit",
    "grapha&euml",
    "glow",
    "socketio",
    "socket.io",
    "mustache",
    "fabricjs",
    "fabric.js",
    "fusejs",
    "fuse.js",
    "tweenjs",
    "sproutcore",
    "zeptojs",
    "threejs",
    "three",
    "three.js",
    "philogl",
    "camanjs",
    "yepnope",
    "labjs",
    "headjs",
    "controljs",
    "requirejs",
    "require.js",
    "rightjs",
    "jquerytools",
    "pusher",
    "paperjs",
    "swiffy",
    "movejs",
    "amplifyjs",
    "popcornjs",
    "d3js",
    "d3.",
    "handlebars",
    "knockout",
    "spine",
    "jquerymobile",
    "webfontloader",
    "angular",
    "angularjs",
    "angular.js",
    "emberjs",
    "ember.js",
    "hammerjs",
    "visibilityjs",
    "velocityjs",
    "ifvisiblejs",
    "pixijs",
    "dcjs",
    "greensockjs",
    "fastclick",
    "isotope",
    "marionette",
    "canjs",
    "vuejs",
    "vue.cjs",
    "vue.global.js",
    "vue",
    "nuxtjs",
    "twojs",
    "two.js",
    "brewser",
    "materialdesignlite",
    "material-design-lite",
    "kendoui",
    "matterjs",
    "riotjs",
    "seajs",
    "momentjs",
    "momenttimezone",
    "scrollmagic",
    "swfobject",
    "flexslider",
    "spfjs",
    "numeraljs",
    "boomerangjs",
    "boomerang.js",
    "framerjs",
    "marko",
    "ampjs",
    "gatsby",
    "shopify",
    "magentojs",
    "wordpress",
    "wix",
    "workbox",
    "bpmn-js",
    "googletagmanager",
    "gtm.js"
];



module.exports = {
  js_builtin: js_builtin,
  lib_src_heuristics: lib_src_heuristics,
  lib_content_heuristics: lib_content_heuristics
};


















