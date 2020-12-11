import os, sys

# variables for debugging and verbose mode
DEBUG_PRINTS = False
DEV_DEBUG = False

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

# settings for javascript library detector 
JS_LIB_DETECTION_WAIT_TIME= 10
JS_LIB_DETECTION_FILE_PATH_NAME = os.path.join(BASE_DIR, "dynamic_lib_detector.js")
JS_LIB_DETECTION_SLUG_CLASS_OUTPUT = "lib_detection_id"

# by default, at least check for popular libs if lib detector failed!
JS_LIB_DETECTION_DEFAULT_LIST_WHEN_FAILED = ['jquery', 'jqueryui', 'bootstrap', 'google-analytics', "googleanalytics"] 
JS_LIB_DETECTION_ALWAYS_CHECK_FOR = ['jquery', 'google-analytics', "googleanalytics"]

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
