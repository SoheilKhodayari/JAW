
/*
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
    Constants and Configuration
*/



const esprimaCFGLevelNodeTypes= [
	"EmptyStatement",
	"DebuggerStatement",
	"ExpressionStatement",
	"VariableDeclaration",
	"FunctionDeclaration",
	"ReturnStatement",
	"LabeledStatement",
    "BreakStatement",
    "ContinueStatement",
    "IfStatement",
    "SwitchStatement",
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
    "ForInStatemen",
    "ThrowStatement",
    "TryStatement",
    "WithStatement",
] 



const EVENT_FUNCTION_NAMES = [
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

const DOMEvents = {
	UIEvent: "abort DOMActivate error load resize scroll select unload",
	ProgressEvent: "abort error load loadend loadstart progress progress timeout",
	Event: "abort afterprint beforeprint cached canplay canplaythrough change chargingchange chargingtimechange checking close dischargingtimechange DOMContentLoaded downloading durationchange emptied ended ended error error error error fullscreenchange fullscreenerror input invalid languagechange levelchange loadeddata loadedmetadata noupdate obsolete offline online open open orientationchange pause pointerlockchange pointerlockerror play playing ratechange readystatechange reset seeked seeking stalled submit success suspend timeupdate updateready visibilitychange volumechange waiting",
	AnimationEvent: "animationend animationiteration animationstart",
	AudioProcessingEvent: "audioprocess",
	BeforeUnloadEvent: "beforeunload",
	TimeEvent: "beginEvent endEvent repeatEvent",
	OtherEvent: "blocked complete upgradeneeded versionchange",
	FocusEvent: "blur DOMFocusIn  Unimplemented DOMFocusOut  Unimplemented focus focusin focusout",
	MouseEvent: "click contextmenu dblclick mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup show",
	SensorEvent: "compassneedscalibration Unimplemented userproximity",
	OfflineAudioCompletionEvent: "complete",
	CompositionEvent: "compositionend compositionstart compositionupdate",
	ClipboardEvent: "copy cut paste",
	DeviceLightEvent: "devicelight",
	DeviceMotionEvent: "devicemotion",
	DeviceOrientationEvent: "deviceorientation",
	DeviceProximityEvent: "deviceproximity",
	MutationNameEvent: "DOMAttributeNameChanged DOMElementNameChanged",
	MutationEvent: "DOMAttrModified DOMCharacterDataModified DOMNodeInserted DOMNodeInsertedIntoDocument DOMNodeRemoved DOMNodeRemovedFromDocument DOMSubtreeModified",
	DragEvent: "drag dragend dragenter dragleave dragover dragstart drop",
	GamepadEvent: "gamepadconnected gamepaddisconnected",
	HashChangeEvent: "hashchange",
	KeyboardEvent: "keydown keypress keyup",
	MessageEvent: "message message message message",
	PageTransitionEvent: "pagehide pageshow",
	PopStateEvent: "popstate",
	StorageEvent: "storage",
	SVGEvent: "SVGAbort SVGError SVGLoad SVGResize SVGScroll SVGUnload",
	SVGZoomEvent: "SVGZoom",
	TouchEvent: "touchcancel touchend touchenter touchleave touchmove touchstart",
	TransitionEvent: "transitionend",
	WheelEvent: "wheel"
}

var eventExists = function(eventName){
	var eventCategories = Object.keys(DOMEvents);
	for(let i=0; i< eventCategories.length; i++){
		var events = DOMEvents[eventCategories[i]];
		if(events.indexOf(eventName) > -1){
			return true
		}
	}
	return false;
}



var constantsModule = {};

/* add constants to be exported to constant module */
constantsModule.EVENT_FUNCTION_NAMES = EVENT_FUNCTION_NAMES
constantsModule.DOMEvents = DOMEvents;
constantsModule.eventExists = eventExists;
constantsModule.esprimaCFGLevelNodeTypes = esprimaCFGLevelNodeTypes;


/* PDG generation timeout budget in mili-seconds (default: 10 mins) */
const timeoutPDGGeneration = 10 * 60 * 1000; 
constantsModule.timeoutPDGGeneration = timeoutPDGGeneration;


/**
 * Sets 'MemberExpression' request-sending function identifiers that gets a URL as parameter
 * @Note fetch is not MemberExpression, hence handled separately
 * @type {array}
 * @memberof constantsModule.prototype
 */
constantsModule.XHR_SUBMISSION_IDENTS_WITH_PARAMS = ['ajax', 'open'];

/**
 * Set CSV output data delimiter
 * @type {string}
 * @memberof constantsModule.prototype
 */
constantsModule.outputCSVDelimiter = '¿';

/**
 * analyzer out file names
 * @type {string}
 * @memberof constantsModule.prototype
 */
constantsModule.ASTnodesFile = "nodes.csv";
constantsModule.ASTrelationsFile = "rels.csv";
constantsModule.ASTrelationsFileDynamic = "rels_dynamic.csv";

/**
 * Set debug mode
 * @type {boolean}
 * @memberof constantsModule.prototype
 */
constantsModule.DEBUG = false;
constantsModule.devDEBUG = false


constantsModule.staticModelPrintPhases = true;

// tolerant mode: experimental
constantsModule.tolerantMode = false;

/**
 * Set verbose mode
 * When verbose mode is set, error logs will be shown in console explicitly and in detail.
 * @type {boolean}
 * @memberof constantsModule.prototype
 */
constantsModule.verboseMode = false;


/**
 * Supported languages
 */
const LANG = { 
	js: 'js', // client-side JS 
	python: 'python',
	php: 'php',
	nodejs: 'nodejs',
}

constantsModule.LANG = LANG;


module.exports = constantsModule;


