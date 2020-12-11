// var oldAddEventListener = EventTarget.prototype.addEventListener;
// EventTarget.prototype.addEventListener = function(eventName, eventHandler, capture=undefined)
// {
// 	console.log('here');
//   if(capture){
// 	   oldAddEventListener.call(this, eventName, function(event) {
// 	    console.log('captured click before passing to event handler')
// 	    eventHandler(event);
// 	  }, capture); 	
//   }else{
//   	  oldAddEventListener.call(this, eventName, function(event) {
// 	    console.log('captured click before passing to event handler')
// 	    eventHandler(event);
// 	  }, false); 	
//   }

// };


  // chrome.runtime.onMessage.addListener(function(message, callback) {
  // 	console.log(message.data);
  // });



  /*

function getAllEventTypes(){

  if(location.href !='https://developer.mozilla.org/en-US/docs/Web/Events') return;

  var types = {};
  $('.standard-table:eq(0) tr').find('td:eq(1)').map(function(){
    var type = $.trim(this.innerText) || 'OtherEvent';
    types[type] = types[type] || [];     
    var event = $.trim(this.previousElementSibling.innerText);
    if(event) types[type].push(event);
  });
  for(var t in types) types[t] = types[t].join(' ');
  return "var DOMEvents = "+JSON.stringify(types, null, 4).replace(/"(\w+)\":/ig, '$1:');
}

*/


/*
* Method 1: overwriting the 
* addEventListener, and its callback
* can also override createEvent and dispatch in similar fashion
*/
/*
var myEventManager = (function() {
    var old = EventTarget.prototype.addEventListener,
        listeners = [],
        events = [];

    EventTarget.prototype.addEventListener = function(type, listener) {

        function new_listener(listener) {
            return function(e) {
                events.push(e);                  // remember event
                return listener.call(this, e);   // call original listener
            };
        }

        listeners.push([type, listener]);        // remember call
        return old.call(this, type, new_listener(listener));  // call original
    };

    return {
        get_events: function() { return events; },
        get_listeners: function() {return listeners; }
    };

}());
*/


// Method 2
var DOMEvents = {
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

var RecentlyLoggedDOMEventTypes = {};

for(DOMEvent in DOMEvents){

  var DOMEventTypes = DOMEvents[DOMEvent].split(' ');

  DOMEventTypes.filter(function(DOMEventType){
    var DOMEventCategory = DOMEvent + ' '+DOMEventType;  
    document.addEventListener(DOMEventType, function(e){
      if(RecentlyLoggedDOMEventTypes[DOMEventCategory]) return;
      RecentlyLoggedDOMEventTypes[DOMEventCategory] = true;
      setTimeout(function(){ RecentlyLoggedDOMEventTypes[DOMEventCategory] = false }, 5000); /* minimum time before same event type can trigger agains */
      var isActive = e.target==document.activeElement;
	      if(isActive) {
	        console.info(DOMEventCategory, 
	          ' target=', e.target, 
	          ' active=', document.activeElement, 
	          ' isActive=', true );
	      } else {
	        console.log(DOMEventCategory, 
	          ' target=', e.target,
	          ' active=', document.activeElement, 
	          ' isActive=', false );
	      }  	
      
    }, true);
  });

}