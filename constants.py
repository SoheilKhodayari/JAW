
"""
	Copyright (C) 2020  Soheil Khodayari, CISPA
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.


	Description:
	------------
	Constants and Global Configuration


	Usage:
	------------
	> import constants as constantsModule

"""
import os, sys

BASE_DIR= os.path.dirname(os.path.realpath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
INPUT_DIR = os.path.join(BASE_DIR, "input")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PATTERN_DIR = os.path.join(OUTPUTS_DIR, "patterns")
DATA_DIR_UNREPONSIVE_DOMAINS = os.path.join(DATA_DIR, "unresponsive") 

INEO_HOME= os.path.join(BASE_DIR, "ineo")


# ------------------------------------------------------------------------------------------ #
# 		Neo4j Config
# ------------------------------------------------------------------------------------------ #

# neo4j credentials
NEO4J_USER = "neo4j"
if os.getenv('NEO4J_PASS') is not None:
	NEO4J_PASS = os.getenv('NEO4J_PASS')
else:
	NEO4J_PASS = 'root' # default pass is 'neo4j'

# neo4j version config
NEOJ_VERSION_4X = '4.'
NEOJ_VERSION_3X = '3.'
if os.getenv('NEO4J_VERSION') is not None:
	NEO4J_VERSION = os.getenv('NEO4J_VERSION')
else:
	NEO4J_VERSION = NEOJ_VERSION_4X

# ports
NEO4J_HTTP_PORT = '7474'
NEO4J_BOLT_PORT = '7476'

# http connection string
NEO4J_CONN_HTTP_STRING = "http://127.0.0.1:%s"%str(NEO4J_HTTP_PORT)
# bolt connection string
NEO4J_CONN_STRING = "bolt://127.0.0.1:%s"%str(NEO4J_BOLT_PORT)
# NeoModel connection string
NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(NEO4J_USER, NEO4J_PASS, NEO4J_BOLT_PORT)

# use docker for neo4j 
NEO4J_USE_DOCKER = True

# neo4j graph csv file names
NODE_INPUT_FILE_NAME = 'nodes.csv'
RELS_INPUT_FILE_NAME = 'rels.csv'
RELS_DYNAMIC_INPUT_FILE_NAME = 'rels_dynamic.csv'

# ineo neo4j manager bin
INEO_BIN = os.path.join(os.path.join(os.path.join(BASE_DIR, "ineo"), "bin"), "ineo")


# PLATFORMS = {
# 	"MAC_OS_X": 1,
# 	"Linux": 2
# }

# CURRENT_PLATFORM = PLATFORMS["MAC_OS_X"]
# # CURRENT_PLATFORM = PLATFORMS['Linux']

# # neo4j config
# if CURRENT_PLATFORM == PLATFORMS["MAC_OS_X"]:
# 	NEO4J_HOME = "/usr/local/Cellar/neo4j/3.5.9/libexec"
# 	NEO4J_CONF = "/usr/local/Cellar/neo4j/3.5.9/libexec/conf/neo4j.conf"
# 	NEO4J_DB_PATH = "/usr/local/Cellar/neo4j/3.5.9/libexec/data/databases"
# else:
# 	NEO4J_HOME = "/var/lib/neo4j"
# 	NEO4J_CONF = "/etc/neo4j/neo4j.conf"
# 	NEO4J_DB_PATH = "/var/lib/neo4j/data/databases"


# ------------------------------------------------------------------------------------------ #
# 		CRAWLER
# ------------------------------------------------------------------------------------------ #

# settings for state scripts
STATES_SCRIPT_FILE_NAME = "Auth"


# ------------------------------------------------------------------------------------------ #
# 		CLI
# ------------------------------------------------------------------------------------------ #

STATIC_ANALYZER_CLI_DRIVER_PATH = os.path.join(os.path.join(BASE_DIR, "engine"), "cli.js")


# ------------------------------------------------------------------------------------------ #
# 		Tool-output Config
# ------------------------------------------------------------------------------------------ #

# local arguments tag for functions
LOCAL_ARGUMENT_TAG_FOR_FUNC = 'FUNCTION_ARGUMENT'
FUNCTION_CALL_DEFINITION_BODY = '<< FUNCTION_CALL_DEFINITION >>'
# esprima program node
PROGRAM_NODE_INDEX = '1'
WINDOW_GLOBAL_OBJECT = 'window [GlobalWindowObject]'
MAX_RECURSE = 100
outputCSVDelimiter = '¿'



# ------------------------------------------------------------------------------------------ #
# 	JavaScript Constants
# ------------------------------------------------------------------------------------------ #

# inline event names
JS_EVENT_NAMES = [
	"abort",
	"afterprint",
	"animationend",
	"animationiteration",
	"animationstart",
	"beforeprint",
	"beforeunload",
	"blur",
	"canplay",
	"canplaythrough",
	"change",
	"click",
	"contextmenu",
	"copy",
	"cut",
	"dblclick",
	"drag",
	"dragend",
	"dragenter",
	"dragleave",
	"dragover",
	"dragstart",
	"drop",
	"durationchange",
	"ended",
	"error",
	"focus",
	"focusin",
	"focusout",
	"fullscreenchange",
	"fullscreenerror",
	"hashchange",
	"input",
	"invalid",
	"keydown",
	"keypress",
	"keyup",
	"load",
	"loadeddata",
	"loadedmetadata",
	"loadstart",
	"message",
	"mousedown",
	"mouseenter",
	"mouseleave",
	"mousemove",
	"mouseover",
	"mouseout",
	"mouseup",
	"mousewheel",
	"offline",
	"online",
	"open",
	"pagehide",
	"pageshow",
	"paste",
	"pause",
	"play",
	"playing",
	"popstate",
	"progress",
	"ratechange",
	"resize",
	"reset",
	"scroll",
	"search",
	"seeked",
	"seeking",
	"select",
	"show",
	"stalled",
	"storage",
	"submit",
	"suspend",
	"timeupdate",
	"toggle",
	"touchcancel",
	"touchend",
	"touchmove",
	"touchstart",
	"transitionend",
	"unload",
	"volumechange",
	"waiting",
	"wheel"
]


# @see: 
# 1. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
# 2. https://www.tutorialspoint.com/javascript/javascript_builtin_functions.htm
# 3. https://doc.qt.io/qt-5/qtqml-javascript-functionlist.html
JS_DEFINED_VARS = list(set([
	'window',
	'document',
	'location',
	'localStorage',
	'sessionStorage',
	'indexOf',
	'toUpperCase',
	'toLowerCase',
	'substr',
	'jQuery',
	'hasOwnProperty',
	'push',
	'then',
	
	# Value Properties
	"Infinity",
	"NaN",
	"undefined",
	"globalThis",

	# Function Properties
	"eval",
	"uneval ",
	"isFinite",
	"isNaN",
	"parseFloat",
	"parseInt",
	"decodeURI",
	"decodeURIComponent",
	"encodeURI",
	"encodeURIComponent",
	"escape",
	"unescape",
	"Object",
	"Function",
	"Boolean",
	"Symbol",
	"Error",
	"AggregateError ",
	"EvalError",
	"InternalError ",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError",
	"Number",
	"BigInt",
	"Math",
	"Date",
	"Array",
	"Int8Array",
	"Uint8Array",
	"Uint8ClampedArray",
	"Int16Array",
	"Uint16Array",
	"Int32Array",
	"Uint32Array",
	"Float32Array",
	"Float64Array",
	"BigInt64Array",
	"BigUint64Array",
	"Map",
	"Set",
	"WeakMap",
	"WeakSet",
	"ArrayBuffer",
	"SharedArrayBuffer ",
	"Atomics ",
	"DataView",
	"JSON",
	"Promise",
	"Generator",
	"GeneratorFunction",
	"AsyncFunction",
	"Iterator ",
	"AsyncIterator ",
	"Reflect",
	"Proxy",
	"Intl",
	"Collator",
	"DateTimeFormat",
	"ListFormat",
	"NumberFormat",
	"PluralRules",
	"RelativeTimeFormat",
	"Locale",
	"WebAssembly",
	"WebAssembly.Module",
	"WebAssembly.Instance",
	"WebAssembly.Memory",
	"WebAssembly.Table",
	"WebAssembly.CompileError",
	"WebAssembly.LinkError",
	"WebAssembly.RuntimeError",
	"Module",
	"Instance",
	"Memory",
	"Table",
	"CompileError",
	"LinkError",
	"RuntimeError",
	"arguments",
	"constructor",
	"toExponential",
	"toFixed",
	"toLocaleString",

	# Constructor Properties
	"Object",
	"Function",
	"Array",
	"ArrayBuffer",
	"String",
	"Boolean",
	"Number",
	"DataView",
	"Date",
	"Promise",
	"RegExp",
	"Map",
	"WeakMap",
	"Set",
	"WeakSet",
	"SharedArrayBuffer",
	"Symbol",
	"Error",
	"EvalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError"

	# Other Properties
	"Atomics",
	"Math",
	"JSON",
	"Reflect",
	"Proxy",

	# Object Constructor Function Properties
	"getPrototypeOf",
	"setPrototypeOf",
	"getOwnPropertyDescriptor",
	"getOwnPropertyDescriptors",
	"getOwnPropertyNames",
	"getOwnPropertySymbols",
	"assign",
	"create",
	"defineProperty",
	"defineProperties",
	"entries",
	"is",
	"seal",
	"isSealed",
	"freeze",
	"isFrozen",
	"preventExtensions",
	"isExtensible",
	"toString",
	"toLocaleString",
	"valueOf",
	"hasOwnProperty",
	"isPrototypeOf",
	"propertyIsEnumerable",

	# Regex
	"RegExp",
	"exec",
	
	# Math
	"abs",
	"acos",
	"acosh",
	"asin",
	"asinh",
	"atan",
	"atanh",
	"atan2",
	"cbrt",
	"ceil",
	"clz32",
	"cos",
	"cosh",
	"exp",
	"expm1",
	"floor",
	"fround",
	"hypot",
	"imul",
	"log",
	"log10",
	"log1p",
	"log2",
	"max",
	"min",
	"pow",
	"random",
	"round",
	"sign",
	"sin",
	"sinh",
	"sqrt",
	"tan",
	"tanh",
	"trunc",

    # APIs
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


    # Requests and WebSockets
    "Request",
    "XMLHttpRequest",
    "ActiveXObject",
    "fetch",
    "WebSocket",


    # Events, Signals and Observers
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

    # DOM Nodes and Attributes
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

    # CSS
    "CSSRule",
    "CSSStyleDeclaration",
    "CSSStyleSheet",
    "CSSStyleRule",

    # Browsers
    "chrome",
    "safari",
    "firefoxAccessException",

    # Data Types
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
    "RegExp" ,
    "arguments",
    "globalThis",
    "Infinity",

    # Common Libs
    "importScripts",
    "module",
    "requirejs",
    "require",
    "jQuery",
    "jQuery",
    "_jQuery",
    "$",
    "self",
    "define",

    # Functions
    "apply",
    "call",
    "bind",

    # Arrays         
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

    # Boolean
    "toString",  
    "valueOf", 

    # Classes
    "extends",
    "super",
    "static",

    # Date
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

    # JSON
    "parse",
    "stringify",

    # MATH
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

    # Number
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

    # RegExp
    "compile",

    # String
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
    "valueOf",
]))
