
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


# Supported Platform List
PLATFORMS = {
	"MAC_OS_X": 1,
	"Linux": 2
	# "Windows": 3
}

# import .env file
from dotenv import load_dotenv
load_dotenv()

# Current Platform
if os.getenv("PLATFORM") == 'macos':
	CURRENT_PLATFORM = PLATFORMS["MAC_OS_X"]
else:
	CURRENT_PLATFORM = PLATFORMS['Linux']

# neo4j config
if CURRENT_PLATFORM == PLATFORMS["MAC_OS_X"]:
	NEO4J_HOME = "/usr/local/Cellar/neo4j/3.5.9/libexec"
	NEO4J_CONF = "/usr/local/Cellar/neo4j/3.5.9/libexec/conf/neo4j.conf"
	NEO4J_DB_PATH = "/usr/local/Cellar/neo4j/3.5.9/libexec/data/databases"
else:
	NEO4J_HOME = "/var/lib/neo4j"
	NEO4J_CONF = "/etc/neo4j/neo4j.conf"
	NEO4J_DB_PATH = "/var/lib/neo4j/data/databases"


# neo4j credential
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

# browser view on port 7474 with HTTP!
NEO4J_CONN_HTTP_STRING = "http://127.0.0.1:7474"

# bolt connections
NEO4J_CONN_STRING = "bolt://127.0.0.1:7687"

# NeoModel connection string
NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:7687"%(NEO4J_USER, NEO4J_PASS)


# settings for state scripts
STATES_SCRIPT_FILE_NAME = "Auth"

# neo4j graph csv file names
NODE_INPUT_FILE_NAME = 'nodes.csv'
RELS_INPUT_FILE_NAME = 'rels.csv'

# cache pickle directory
CACHE_PATH = os.path.join(BASE_DIR, "cache")

# analyzer driver program
ANALYZER_DRIVER_PATH = os.path.join(os.path.join(BASE_DIR, "hpg_construction"), "main.js")

# analyzer driver program v2
ANALYZER_DRIVER_PATH_V2 = os.path.join(os.path.join(BASE_DIR, "hpg_construction"), "cli.js")


# path to store the node and csv files 
OUTPUT_NODES_RELS_PATH = os.path.join(os.path.join(BASE_DIR, "hpg_construction"), "outputs")

# path to store the webpage JS for static analysis
OUTPUT_ANALYSIS_PATH = OUTPUT_NODES_RELS_PATH

# path to store the crawler collected data
OUTPUT_CRAWLER_DATA = OUTPUT_NODES_RELS_PATH

# the unit-test inputs folder
UNIT_TESTS_FOLDER_NAME = "unit_tests"
# path to the unit-test inputs
UNIT_TEST_BASE_PATH =  os.path.join(os.path.join(BASE_DIR, "hpg_construction"), UNIT_TESTS_FOLDER_NAME)
# path to the unit tests output
UNIT_TEST_OUTPUT_PATH = os.path.join(OUTPUT_NODES_RELS_PATH, UNIT_TESTS_FOLDER_NAME)

# sites directory
SITES_DIRECTORY = os.path.join(os.path.join(BASE_DIR, "hpg_crawler"), "sites")

# file name for static analyzer important template outputs: window.loc dependecies 
STATIC_ANALYZER_WIN_LOC_TEMPLATE_FILE_NAME = 'static.out'

# relative path to save detected libraries of each app
LIBRARY_SAVE_DIR = 'libraries'

# general library repository
GENERAL_LIBRARY_REPOSITORY_DIR = os.path.join(OUTPUT_NODES_RELS_PATH, 'libraries')
GENERAL_LIBRARY_TEMPLATE_FILE_PATH_NAME = os.path.join(GENERAL_LIBRARY_REPOSITORY_DIR, "libraries.out")


# name for the static analyzer output files
TEMPLATE_OUTPUT_SLUG = "template.out"
DOCUMENT_OUTPUT_VAR_NAMES = 'document_props.out'
DOCUMENT_OUTPUT_VAR_NAMES_MACHINE = 'document_props_short.out'

# crawler output file names
NAME_HTML_UNRENDERED = "html_initial.html"
NAME_HTML_RENDERED = "html_rendered.html"
NAME_JS_PROGRAM = "js_program.js"
NAME_JS_PROGRAM_INSTRUMENTED = "instrumented_program.js"
NAME_URL_FILE = "navigation_url.out"
NAME_DOCUMENT_PROPS = DOCUMENT_OUTPUT_VAR_NAMES
NAME_DOCUMENT_PROPS_MACHINE = DOCUMENT_OUTPUT_VAR_NAMES_MACHINE
NAME_LIBRARIES_FOLDER = "libraries"
NAME_XHR_LOGS = "request_logs.out"
NAME_XHR_LOGS_MACHINE = "request_logs_short.out"
NAME_COOKIE_FILE = "cookies.pkl"
NAME_COOKIE_FILE_STR = "cookies_str.out"
NAME_FIRED_EVENTS = "events.out"
NAME_FIRED_EVENTS_PICKLE = "events_pickle.pkl"



# location where output reports (of dynamic analysis) are stored
REPORT_DIR = os.path.join(BASE_DIR, "reports")

# variables for debugging and verbose mode
DEBUG_PRINTS = True
DEV_DEBUG = True

# settings for javascript library detector 
JS_LIB_DETECTION_WAIT_TIME= 10
JS_LIB_DETECTION_FILE_PATH_NAME = os.path.join(os.path.join(BASE_DIR, "utils"), "dynamic_lib_detector.js")
JS_LIB_DETECTION_SLUG_CLASS_OUTPUT = "lib_detection_id"

# by default, at least check for popular libs if lib detector failed!
JS_LIB_DETECTION_DEFAULT_LIST_WHEN_FAILED = ['jquery', 'jqueryui', 'bootstrap'] 
JS_LIB_DETECTION_ALWAYS_CHECK_FOR = ['jquery', 'google-analytics', "googleanalytics", "jit", "charts"]

# wait time for xhr to be sent
XHR_READ_WAIT_TIME = 10

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

# local arguments tag for functions
LOCAL_ARGUMENT_TAG_FOR_FUNC = 'LOCAL_FUNCTION_ARGUMENT'

FUNCTION_CALL_DEFINITION_BODY = '<< FUNCTION_CALL_DEFINITION >>'

# analyzer output semantic types
TAG_NON_REACHABLE = 'NON-REACH' 		# not reading from any specific semantic type
TAG_DOM_READ = 'DOM-READ' 			    # read from DOM attributes
TAG_LOCAL_STORAGE_READ = 'STORAGE-READ' # read from localStorage or sessionStorage
TAG_COOKIE_READ = 'COOKIE-READ' 		# read from document.cookie
TAG_WINDOW_LOC = 'WIN.LOC' 			    # read from window.location properties
TAG_WINDOW_NAME= 'WIN.NAME'				# read from window.name
TAG_HTML_FORM_FIELD = 'HTML-FORM-FIELD' # read from a form or one of its fields in HTML
TAG_REFERRER= 'DOCUMENT.REFERRER'		# read from document.referrer
TAG_POST_MESSAGE = 'POST.MESSAGE'		# read from postMessages



# @see: 
# 1. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
# 2. https://www.tutorialspoint.com/javascript/javascript_builtin_functions.htm
# 3. https://doc.qt.io/qt-5/qtqml-javascript-functionlist.html
JS_DEFINED_VARS = [
	'window',
	'document',
	'localStorage',
	'sessionStorage',
	'indexOf',
	'toUpperCase',
	'toLowerCase',
	'substr',
	'jQuery',
	'hasOwnProperty',
	'push',
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
	"trunc"
]

# esprima program node
PROGRAM_NODE_INDEX = '1'

WINDOW_GLOBAL_OBJECT = 'window [GlobalWindowObject]'

MAX_RECURSE = 100

outputCSVDelimiter = '¿'