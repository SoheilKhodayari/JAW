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

/**
 * List of all global properties that 
 * are NOT clobberable in any browser
 * Obtained from an external set of systematic experiments
 * [non-clobberable = all props - clobbered props]
 */



const all_global_props = window_properties.concat(document_properties,document_methods,window_methods);
// const global_nonclobberable_props = ["AbortSignal","Notification","MouseEvent","TextDecoder","Request", "Worker", "WebSocket","Touch", "TouchEvent", "chrome", "SVGRect", "CSSRule", "CSSStyleDeclaration", "CSSStyleSheet", "CSSStyleRule", "Node", "Element", "HTMLDocument", "HTMLElement", "HTMLTemplateElement", "HTMLIFrameElement", "NamedNodeMap", "DOMParser", "MediaSource", "trustedTypes", "TextEncoder", "ResizeObserver", "ReportingObserver", "IntersectionObserver", "PerformanceObserver", "attachEvent", "Math","CustomEvent","NodeList", "JSON", "jQuery", "$", "_jQuery", "body", "appendChild", 'onwheel', 'screenTop', 'screen', 'locationbar', 'onpointerover', 'onloadeddata', 'onmousemove', 'onloadstart', 'onstorage', 'toolbar', 'devicePixelRatio', 'onsubmit', 'onended', 'crypto', 'onpointermove', 'onplaying', 'screenY', 'onmousedown', 'customElements', 'onkeyup', 'ondurationchange', 'onpointerup', 'onkeydown', 'frameElement', 'onerror', 'scrollX', 'scrollbars', 'ontransitionend', 'onhashchange', 'onanimationend', 'event', 'onmouseleave', 'statusbar', 'name', 'onpopstate', 'ongotpointercapture', 'scrollY', 'innerHeight', 'oncuechange', 'closed', 'localStorage', 'onmouseenter', 'onmouseover', 'outerWidth', 'opener', 'onblur', 'navigator', 'onresize', 'onunload', 'oninput', 'console', 'oninvalid', 'onpointerenter', 'origin', 'onplay', 'onlanguagechange', 'onclick', 'ondblclick', 'performance', 'onmessage', 'sessionStorage', 'onpointerdown', 'isSecureContext', 'ontransitioncancel', 'length', 'onpointerleave', 'onabort', 'onreset', 'innerWidth', 'onmouseup', 'onpointercancel', 'onselect', 'pageYOffset', 'onafterprint', 'speechSynthesis', 'onanimationiteration', 'onpointerout', 'location', 'onbeforeprint', 'oncanplay', 'outerHeight', 'onunhandledrejection', 'menubar', 'oncontextmenu', 'onmouseout', 'onload', 'onkeypress', 'onscroll', 'indexedDB', 'onchange', 'onfocus', 'screenLeft', 'onloadedmetadata', 'onrejectionhandled', 'pageXOffset', 'onpause', 'personalbar', 'onlostpointercapture', 'screenX', 'history', 'oncanplaythrough', 'status', 'onbeforeunload', 'stop', 'moveTo', 'addEventListener', 'close', 'getSelection', 'requestAnimationFrame', 'cancelAnimationFrame', 'captureEvents', 'blur', 'clearInterval', 'open', 'queueMicrotask', 'confirm', 'releaseEvents', 'setInterval', 'fetch', 'print', 'getComputedStyle', 'moveBy', 'setTimeout', 'scroll', 'resizeBy', 'scrollTo', 'find', 'focus', 'resizeTo', 'postMessage', 'btoa', 'clearTimeout', 'matchMedia', 'atob', 'scrollBy', 'prompt', 'alert', 'location', 'cookie', 'exitPictureInPicture', 'hasFocus', 'createExpression', 'getElementsByTagName', 'addEventListener', 'append', 'elementsFromPoint', 'close', 'createCDATASection', 'getSelection', 'createTouch', 'getElementsByClassName', 'execCommand', 'prepend', 'createEvent', 'replaceChildren', 'createEntityReference', 'getElementById', 'open', 'hasStorageAccess', 'createAttribute', 'getElementsByTagNameNS', 'createProcessingInstruction', 'adoptNode', 'createTextNode', 'writeln', 'createDocumentFragment', 'caretPositionFromPoint', 'queryCommandSupported', 'registerElement', 'clear', 'exitFullscreen', 'querySelector', 'exitPointerLock', 'releaseCapture', 'createNSResolver', 'createTreeWalker', 'queryCommandEnabled', 'createComment', 'createElementNS', 'enableStyleSheetsForSet', 'caretRangeFromPoint', 'querySelectorAll', 'createElement', 'createRange', 'elementFromPoint', 'importNode', 'getAnimations', 'createTouchList', 'getElementsByName', 'mozSetImageElement', 'requestStorageAccess', 'createNodeIterator', 'write', 'getBoxObjectFor', 'evaluate'];
// const js_builtin_constructs = ["Float64Array","Float32Array","HTMLInputElement","HTMLAnchorElement", "HTMLButtonElement", "firefoxAccessException", "SharedArrayBuffer", "self", "Image", "Number", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "Int16Array", "Int32Array", "Int8Array", "Uint8Array","ArrayBuffer","globalThis","Math","Proxy","ReferenceError","RangeError","FormData", "Blob", "FileReader", "WeakMap", "WeakSet", "JSON", "Symbol", "Boolean", "Object", "String", "Array", "Function", "navigator", "localStorage", "sessionStorage", "Reflect", "TypeError", "arguments", "XMLHttpRequest", "ActiveXObject", "Map", "MutationObserver", "importScripts", "module", "requirejs", "require", "jQuery", "setTimeout", "setInterval", "define", "Error", "Date", "Infinity", "console", "undefined", "null", "RegExp" ,"Event", "EventTarget", "EventEmitter", "EventSource", "Promise", "fetch", "eval" ];



const nonclobberable_props = ["body", "appendChild", 'onwheel', 'screenTop', 'screen', 'locationbar', 'onpointerover', 'onloadeddata', 'onmousemove', 'onloadstart', 'onstorage', 'toolbar', 'devicePixelRatio', 'onsubmit', 'onended', 'crypto', 'onpointermove', 'onplaying', 'screenY', 'onmousedown', 'customElements', 'onkeyup', 'ondurationchange', 'onpointerup', 'onkeydown', 'frameElement', 'onerror', 'scrollX', 'scrollbars', 'ontransitionend', 'onhashchange', 'onanimationend', 'event', 'onmouseleave', 'statusbar', 'name', 'onpopstate', 'ongotpointercapture', 'scrollY', 'innerHeight', 'oncuechange', 'closed', 'localStorage', 'onmouseenter', 'onmouseover', 'outerWidth', 'opener', 'onblur', 'navigator', 'onresize', 'onunload', 'oninput', 'console', 'oninvalid', 'onpointerenter', 'origin', 'onplay', 'onlanguagechange', 'onclick', 'ondblclick', 'performance', 'onmessage', 'sessionStorage', 'onpointerdown', 'isSecureContext', 'ontransitioncancel', 'length', 'onpointerleave', 'onabort', 'onreset', 'innerWidth', 'onmouseup', 'onpointercancel', 'onselect', 'pageYOffset', 'onafterprint', 'speechSynthesis', 'onanimationiteration', 'onpointerout', 'location', 'onbeforeprint', 'oncanplay', 'outerHeight', 'onunhandledrejection', 'menubar', 'oncontextmenu', 'onmouseout', 'onload', 'onkeypress', 'onscroll', 'indexedDB', 'onchange', 'onfocus', 'screenLeft', 'onloadedmetadata', 'onrejectionhandled', 'pageXOffset', 'onpause', 'personalbar', 'onlostpointercapture', 'screenX', 'history', 'oncanplaythrough', 'status', 'onbeforeunload', 'stop', 'moveTo', 'addEventListener', 'close', 'getSelection', 'requestAnimationFrame', 'cancelAnimationFrame', 'captureEvents', 'blur', 'clearInterval', 'open', 'queueMicrotask', 'confirm', 'releaseEvents', 'setInterval', 'fetch', 'print', 'getComputedStyle', 'moveBy', 'setTimeout', 'scroll', 'resizeBy', 'scrollTo', 'find', 'focus', 'resizeTo', 'postMessage', 'btoa', 'clearTimeout', 'matchMedia', 'atob', 'scrollBy', 'prompt', 'alert', 'location', 'cookie', 'exitPictureInPicture', 'hasFocus', 'createExpression', 'getElementsByTagName', 'addEventListener', 'append', 'elementsFromPoint', 'close', 'createCDATASection', 'getSelection', 'createTouch', 'getElementsByClassName', 'execCommand', 'prepend', 'createEvent', 'replaceChildren', 'createEntityReference', 'getElementById', 'open', 'hasStorageAccess', 'createAttribute', 'getElementsByTagNameNS', 'createProcessingInstruction', 'adoptNode', 'createTextNode', 'writeln', 'createDocumentFragment', 'caretPositionFromPoint', 'queryCommandSupported', 'registerElement', 'clear', 'exitFullscreen', 'querySelector', 'exitPointerLock', 'releaseCapture', 'createNSResolver', 'createTreeWalker', 'queryCommandEnabled', 'createComment', 'createElementNS', 'enableStyleSheetsForSet', 'caretRangeFromPoint', 'querySelectorAll', 'createElement', 'createRange', 'elementFromPoint', 'importNode', 'getAnimations', 'createTouchList', 'getElementsByName', 'mozSetImageElement', 'requestStorageAccess', 'createNodeIterator', 'write', 'getBoxObjectFor', 'evaluate'];

// List curated through aggregation of other lists and experiments
// - https://www.w3schools.com/jsref/jsref_obj_global.asp
// - https://www.tutorialspoint.com/javascript/javascript_builtin_functions.htm
const other_nonclobberable_props =[
    // APIs
    "DOMParser",
    "Notification",
    "Math",
    "Worker",
    "localStorage",
    "sessionStorage",
    "Reflect",
    "FileReader",
    "navigator",
    "constructor",
    "setTimeout",
    "setInterval",
    "console",
    "Promise",
    "eval",
    "Proxy",
    "decodeURIComponent",
    "encodeURIComponent",
    "decodeURI",
    "encodeURI",
    "dataLayer",
    "escape",
    "unescape",
    "isFinite",
    "parseInt",
    "parseFloat",
    "MessageChannel",


    // Requests and WebSockets
    "Request",
    "XMLHttpRequest",
    "XDomainRequest", // for IE, similar to XMLHttpRequest
    "ActiveXObject",
    "fetch",
    "WebSocket",


    // Events, Signals and Observers
    "AbortSignal",
    "attachEvent",
    "MouseEvent",
    "Touch",
    "TouchEvent",
    "CustomEvent",
    "Event",
    "EventTarget",
    "EventEmitter",
    "EventSource",
    "ResizeObserver",
    "ReportingObserver",
    "IntersectionObserver",
    "PerformanceObserver",
    "MutationObserver",

    // DOM Nodes and Attributes
    "TextDecoder",
    "TextEncoder",
    "Node",
    "Element",
    "HTMLDocument",
    "HTMLElement",
    "HTMLTemplateElement",
    "HTMLIFrameElement",
    "HTMLInputElement",
    "HTMLAnchorElement",
    "HTMLButtonElement",
    "HTMLLinkElement",
    "HTMLImageElement",
    "HTMLEmbedElement",
    "HTMLFrameElement",
    "HTMLObjectElement",
    "HTMLScriptElement",
    "NamedNodeMap",
    "NodeList",
    "SVGRect",
    "MediaSource",

    // CSS
    "CSSRule",
    "CSSStyleDeclaration",
    "CSSStyleSheet",
    "CSSStyleRule",

    // Browsers
    "chrome",
    "safari",
    "firefoxAccessException",

    // Data Types
    "trustedTypes",
    "HTMLCollection",
    "WeakMap",
    "WeakSet",
    "JSON",
    "Symbol",
    "Boolean",
    "Object",
    "String",
    "Array",
    "Image",
    "Number",
    "Function",
    "Map",
    "Date",
    "undefined",
    "null",
    "Float64Array",
    "Float32Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "Int16Array",
    "Int32Array",
    "Int8Array",
    "Uint8Array",
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Blob",
    "FormData",
    "URLSearchParams",
    "ReferenceError",
    "RangeError",
    "SyntaxError",
    "Error",
    "TypeError",
    "URIError",
    "RegExp" ,
    "arguments",
    "globalThis",
    "Infinity",

    // Common Libs
    "importScripts",
    "module",
    "requirejs",
    "require",
    "jQuery",
    "jQuery",
    "_jQuery",
    "$",
    "self",
    "define"
]


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


const global_nonclobberable_props = nonclobberable_props.concat(other_nonclobberable_props);
const js_builtin_constructs = [].concat(other_nonclobberable_props);
const js_builtin = js_builtin_constructs.concat(js_builtin_methods,buildint_dom_api);

module.exports = {
  window_properties: window_properties,
  window_methods: window_methods,
  window_events: window_events,
  document_properties: document_properties,
  document_methods: document_methods,
  document_events: document_events,
  global_nonclobberable_props: global_nonclobberable_props,
  js_builtin_constructs: js_builtin_constructs,
  js_builtin: js_builtin,
  all_global_props: all_global_props,
};


















