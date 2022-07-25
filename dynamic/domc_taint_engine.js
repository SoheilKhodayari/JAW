/**
 * @license AGPL 3.0
 * @desc DOMTaintTracker 
 * This script is injected at runtime to the webpage
 * by puppeteer to do taint tracking of DOM clobbering
 * source-sink flows.
 */

// -------------------------------------------------------------------------------------- //
//   START Constants & Variables
// -------------------------------------------------------------------------------------- //


/**
 * flag that sets the visibility of console debug messages
 */ 
const DEBUG = false;

/**
 * flag to start the force execution sepeartely for a webpage in the browser for debugging purposes
 */ 
const FORCE_EXEC_DEBUG_RUN= false;

/**
 * re-define references to global window and document 
 */ 
const theWindow = window;
const theDocument = theWindow.document;


/**
 * container to hold the clobberable source sink data flows 
 */ 
theWindow.clobberable = [];


/**
 * Clobal mapping from already instrumented functions to their instrumented counterparts
 */ 

var fun_mapping = new Map();


/**
 * Count of the total branches visited in the current execution
 */ 
var branchCounter = 0;

/**
 * maximum number of the `branchCounter` across all executions
 */ 
var maxNumberOfBranchesInPaths = 0;

/**
 * number of the visited branches in the default execution
 */ 
var defaultExecutionBranches = 0;


/**
 * Threshold `t` of the max number of execution paths for each source-sink pair
 * to avoid potential state space explosion
 */ 
var pathExecutionThreshold = 10;



/**
 * A list containing the control flow paths executed so far.
 * The paths are updated as the forced execution continues.
 * Each element is a list (i.e., a control flow path), 
 * and each element in this list is a pair of <branch_id, branch_forced_value>
 */ 
var pathsExecuted = [];
var pathsExecutedHashStrings = [];


/**
 * The current control flow path executed. 
 * Each element in the list is a pair of <branch_id, branch_forced_value> 
 */ 
var currentBranchPath = [];
var currentBranchPathHashString= [];

/**
 * an associative array from branch id to the number of times 
 * (re-)visited by the force executor
 */ 
var branchesMap = new Map();


/**
 * function to reset the container(s) holding the current
 * control flow path visited for the next one
 */ 
var resetBranchesForNextExecution = function(){
  currentBranchPath= [];
  currentBranchPathHashString='';
  branchCounter = 0;
}

/**
 * function to reset the container(s) holding all the visited
 * control flow paths to prepare testing of the next source-sink pair
 */ 
var resetBranchesForNextSourceSinkFlow = function(){
  pathsExecuted=[];
  currentBranchPath= [];
  branchesMap = new Map();
  branchCounter = 0;
  maxNumberOfBranchesInPaths=0;
  currentBranchPathHashString= '';
  pathsExecutedHashStrings= [];
}



/**
 * flag that determines whether the current execution flow should run the 
 * default branch values or explore other executions of the program
 */
var shouldDoDefaultExecution= true;


/**
 * container that holds the current source-sink details under test
 */
var currentSourceSinkFlowObject = null;


/**
 * @note `scriptsCode` is injected by puppeteer
 */ 
var stage = new Iroh.Stage(localStorage.getItem('scriptsCode'));
var domcPayloads = localStorage.getItem('domcPayloads');


/**
 * @note add support for `removeElementsByClass` if not supported by the runtime browser
 */ 
var removeElementsByClass = function(className){
    const elements = document.getElementsByClassName(className);
    while(elements.length > 0){
        elements[0].parentNode.removeChild(elements[0]);
    }
}
theWindow.removeElementsByClass = removeElementsByClass;

// -------------------------------------------------------------------------------------- //
//   END Constants & Variables
// -------------------------------------------------------------------------------------- //


// -------------------------------------------------------------------------------------- //
//   START String Taint Information
// -------------------------------------------------------------------------------------- //

String.prototype.__taint = false;
// String.prototype.__taintObject = {};

String.prototype.untaint = function(){
  this.__taint = false;
}

String.prototype.taint = function(){
  this.__taint = true;
}

String.prototype.isTainted = function(){
  if(this.__taint)
    return true;
  else
    return false;
}


var __String = String;

function TaintString(s){

  this.__taint = true;
  this.length = ("" + s).length;
  var self = this;


  this.untaint = function(){
    self.__taint = false;
  }


  this.taint = function(){
   self.__taint = true;
  }


  this.isTainted = function(){
    if(self.__taint)
      return true;
    else
      return false;
  }

  this.concat = function(){
    console.log("here")
    var str = new String(__String.prototype.concat.apply(s, arguments));
    str.__taint = self.__taint || arguments[0].__taint;
    if(!str.__taint && arguments.length > 1){
      for(var i = 0, l = arguments.length; i < l; i++){
              str.__taint = arguments[i].__taint;
        if(str.__taint)
          break;
      }
    }
    return str;
  }


  this.toLowerCase = function(){
    var str = new String(__String.prototype.toLowerCase.apply(s));
    str.__taint = self.__taint;
    return str;
  }


  this.toUpperCase = function(){
    // var str = new String(__String.prototype.toUpperCase.apply(s));
    // str.__taint = self.__taint;
    // return str;
    var str = new TaintString(__String.prototype.toUpperCase.apply(s));
    str.__taint = self.__taint;
    return str;
  }


  this.charCodeAt = function(f){
    return __String.prototype.charCodeAt.apply(s,arguments);
  }


  this.fromCharCode = function(){
    return __String.prototype.fromCharCode.apply(s,arguments);
  }

  this.toString = this.valueOf = function(){
    return s;
  }

  this.charAt = function(f){
    return __String.prototype.charAt.apply(s,arguments);
  }

  this.indexOf = function(searchstring, start){
    return __String.prototype.indexOf.apply(s,arguments);
  }

  this.lastIndexOf = function(searchstring, start){
    return __String.prototype.lastIndexOf.apply(s,arguments);
  }

  this.match = function(regexp){
    var a = new String(__String.prototype.match.apply(s,arguments));
    if(self.__taint){
      for(var i = 0, l = a.length; i < l; i++){
              a[i].__taint = true;
      }
    }
    return a;
  }
  this.replace = function(regexp, newstr){
    var str = new String(__String.prototype.replace.apply(s,arguments));
    str.__taint = self.__taint || newstr.__taint;
    return str;
  }

  this.search = function(regexp){
    return __String.prototype.search.apply(s,arguments);
  }

  this.slice = function(begin,end){
    var str = new String(__String.prototype.slice.apply(s,arguments));
    if(str != -1){
      str.__taint = self.__taint;
    }
    return str;
  }


  this.split = function(separator, limit){
    var a = new String(__String.prototype.split.apply(s,arguments));
    if(this.__taint){
      for(var i = 0, l = a.length; i < l; i++){
              a[i].__taint = true;
      }
    }
    return a;
  }


  this.substr = function(start,length){
    var str = new String(__String.prototype.substr.apply(s,arguments));
    str.__taint = self.__taint;
    return str;
  }

  this.substring = function(from, to){
    var str = new String(__String.prototype.substring.apply(s,arguments));
    str.__taint == self.__taint;
    return str;
  }

}

// -------------------------------------------------------------------------------------- //
//   END String Taint Information
// -------------------------------------------------------------------------------------- //

// ---------------------------------------------------------------------------------------//
//   START Utility
// ---------------------------------------------------------------------------------------//

function parseCookies() {
  let c_st = document.cookie;
  let parsed = {};
  for (let splitted of c_st.split(';')) {
    if (splitted.indexOf('=') === -1) {
      continue
    }
    let [key, val] = splitted.split('=');
    parsed[key.trim()] = val.trim()
  }
  return parsed;
}


function isNativeFunc(fun) {
  return getFunctionString(fun).indexOf('native code') > -1;
}


function makeProxy(obj, identifier, appliedOperations = [], isRealValue = false) {
  // Wrap a primitive type to be proxy compatible
  if (typeof obj !== 'object' || obj === null) {
    obj = {"__is_primitive_value": true, "__real_primitive_value": obj}
  }
  obj.__identifier = identifier;
  if (obj.__applied_ops) {
    obj.__applied_ops = obj.__applied_ops.concat(appliedOperations);
  } else {
    obj.__applied_ops = appliedOperations;
  }

  let handler = {
    get: function (target, key, receiver) {
      if (typeof obj === 'object' && Object.keys(target).length === 2 && '__identifier' in target && '__applied_ops' in target) {
        // This means we are uncertain whether this thing here is really a object or if it is supposed to be e.g. a string
        if (key === Symbol.iterator) {
          window.__addTypeInfo(identifier, 'array');
          // this should work for array usage as well as dict usage
          obj.__is_primitive_value = true;
          obj.__real_primitive_value = [];
          obj[Symbol.iterator] = function* () {
            let i = 0;
            while (i < 5) {
              let ops = deepClone(appliedOperations);
              ops.push({'type': 'iterator', 'accessed_elem': i++});
              yield makeProxy({}, identifier, ops);
            }
            yield undefined
          };
        } else if (key in String.prototype) {
          // guess that this should in fact not be a object but rather a string. thus adapt it to be a primitive object.
          obj.__is_primitive_value = true;
          obj.__real_primitive_value = '';
        } else if (key in Number.prototype) {
          // guess that this should in fact not be a object but rather a string. thus adapt it to be a primitive object.
          obj.__is_primitive_value = true;
          obj.__real_primitive_value = '';
        }

      }
      if (key === '__is_real_value') {
        return isRealValue;
      }
      if (key === '__get_identifier') {
        return identifier;
      }
      if (key === '__get_ops') {
        return appliedOperations;
      }
      if (key === '__get_real_obj') {
        if (target.__is_primitive_value) {
          return target.__real_primitive_value;
        }
        return target;
      }
      if (key === '__is_proxy') {
        return true;
      }
      if (typeof key === 'symbol') {
        return target[key];
      }
      let accessed;

      if (key === 'valueOf' || key === 'toString' && this.__is_primitive_value) {
        return () => {
          return this.__real_primitive_value;
        }
      }

      if (target["__is_primitive_value"]) {
        target = target["__real_primitive_value"];
        accessed = target[key];

      } else {
        accessed = Reflect.get(target, key, receiver);
      }

      // We need this for implicit conversion, e.g. when == is used and types missmatch since our values will always be proxies and does provoke implicit conversions.
      // However we do not want to loose precision, when toString is called by the developer which is why we retaint it after a function call to toString or valueOf
      if (key === 'valueOf' || key === 'toString') {
        return function () {
          /*ignore_this_func*/
          return accessed.apply(target, arguments);
        }
      }
      if (typeof accessed === 'function') {
        return function () {
          return accessed.apply(target, arguments);
        }
      } else {
        // this is the case when we retrieve a property, we want to note that we are now accessing a sub property and
        if (accessed === undefined) {
          target[key] = {};
          accessed = target[key];
        }
        if (isProxy(accessed)) {
          return accessed;
        }
        return makeProxy(accessed, identifier + '.' + key.toString(), [{
          type: 'ops_on_parent_element',
          old_identifier: identifier,
          old_ops: deepClone(appliedOperations)
        }]);
      }
    },

    set: function (target, key, value, receiver) {
      return Reflect.set(target, key, value, receiver);
    }
  };
  return new Proxy(obj, handler);
}

function extractConstraintFromProxy(p) {
  let constraint;
  if (p.__is_real_value) {
    constraint = {ops: deepClone(p.__get_ops), value: p.__get_identifier, isRealValue: true, val: p.__get_real_obj};
  } else {
    constraint = {ops: deepClone(p.__get_ops), identifier: p.__get_identifier};
  }
  return constraint;
}


function deepCloneMap(map) {
  let m = new Map();

  for (const [key, value] of map.entries()) {
    m.set(key, deepClone(value));
  }
  return m;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepCloneProxy(proxy) {
  let identifier = proxy.__get_identifier;
  let last_ops = proxy.__get_ops;
  let real_value = proxy.__get_real_obj;

  return {identifier: identifier, ops: last_ops, value: real_value}
}

function randomString(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < length; i++)
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

function delay(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

function deProxifyArguments(args) {
  let res;
  if (Array.isArray(args)) {
    res = [];
    for (let arg of args) {
      arg = deProxifyArguments(arg);
      res.push(arg);
    }
  } else if (args === undefined) {

  } else if (isProxy(args)) {
    res = {ops: args.__get_ops, identifier: args.__get_identifier};
  } else if (args.__proto__ === RegExp.prototype) {
    let regex = args.toString();
    res = regex.slice(1).slice(0, regex.lastIndexOf('/') - 1)
  } else {
    res = args;
  }

  return res
}

function negateConstraint(constraint) {
  return {'type': 'Unary', 'op': '!', val: constraint};
}


function isDestructiveCall(e) {
  if (getFunctionString(e.call) === "function removeChild() { [native code] }") {
    return true
  }
  return false;
}


function isProxy(obj) {
  if (obj === window || obj === parent || obj === window.opener) {
    return false
  }
  return obj !== null && typeof obj === 'object' && obj.__is_proxy;
}

function getFunctionString(fun) {
  return (function () {
  }).toString.apply(fun);
}


/*
  BinaryJumpTable Helper
*/
const BinaryJumpTable = {
  "==": function(left, right) { return left == right; },
  "===": function(left, right) { return left === right; },

  "!=": function(left, right) { return left != right; },
  "!==": function(left, right) { return left !== right; },

  "<": function(left, right) { return left < right; },
  ">": function(left, right) { return left > right; },

  "<=": function(left, right) { return left <= right; },
  ">=": function(left, right) { return left >= right; },

  "+": function(left, right) { return left + right; },
  "-": function(left, right) { return left - right; },

  "*": function(left, right) { return left * right; },
  "/": function(left, right) { return left / right; },

  "%": function(left, right) { return left % right; },

  ">>": function(left, right) { return left >> right; },
  "<<": function(left, right) { return left << right; },
  ">>>": function(left, right) { return left >>> right; },

  "&": function(left, right) { return left & right; },
  "&&": function(left, right) { return left && right; },

  "|": function(l, r) { return l | r; },
  "||": function(l, r) { return l || r; },

  "^": function(l, r) { return l ^ r; },
  "instanceof": function(l, r) { return l instanceof r; },
  "in": function(l, r) { return l in r; }
};

const UnaryJumpTable = {
  "!": function(v) { return !v; },
  "~": function(v) { return ~v; },
  "-": function(v) { return -v; },
  "+": function(v) { return +v; },
  "typeof": function(v) { return typeof v; },
  "void": function(){return void 0}
};


function evalBinary(op, left, right) {
    return BinaryJumpTable[op](left, right);
}

function evalUnary(op, left) {
    return UnaryJumpTable[op](left);
}
/*
  End BinaryJumpTable Helper
*/

// ---------------------------------------------------------------------------------------//
//   END Utility
// ---------------------------------------------------------------------------------------//

// ---------------------------------------------------------------------------------------//
//  START Instrumentation 
// ---------------------------------------------------------------------------------------//

function instrumentStageWithProxies(stage) {
  let funlistener = stage.addListener(Iroh.FUNCTION);
  funlistener.on('return', (e) => {
    let saved_state = e.instance.ForceExecution.savedFunState;
    if (e.instance.ForceExecution.pathConstraints.length > 0 && saved_state.length > 0) {
      for (let constraint of e.instance.ForceExecution.pathConstraints) {
        saved_state[saved_state.length - 1].push(constraint);
      }
    }
  });

  let listener = stage.addListener(Iroh.CALL);
  listener.on("before", (e) => {
    checkForFlowToSink(e);
    if (isDestructiveCall(e)) {
      DEBUG && console.warn('replacing destructive call with no-op', e.call);
      e.call = noOperationFunction;
      return;
    }

    DEBUG && console.warn('this is before call', e);
    if (e.external) {
      if (!isNativeFunc(e.call) && e.object === null) {
        // If it is not a native function we can hook it on the fly
        let hooked;
        if (fun_mapping.has(getFunctionString(e.call))) {
          hooked = fun_mapping.get(getFunctionString(e.call));
        } else {
          window.__reportExternalFun(getFunctionString(e.call), e.instance.ForceExecution.handler_id);
          hooked = new Iroh.Stage('(' + getFunctionString(e.call) + ')');
          instrumentStage(hooked);
          fun_mapping.set(getFunctionString(e.call), hooked);
        }
        let __begin_tests = () => {
          e.instance.ForceExecution.inTest = true;
          e.instance.ForceExecution.constraintBuffer = [];

        };
        hooked.ForceExecution = e.instance.ForceExecution;
        let deepClone = window.deepClone;
        e.call = eval(hooked.script);

        e.instance.ForceExecution.savedFunState.push(e.instance.ForceExecution.pathConstraints);
        e.instance.ForceExecution.pathConstraints = [];

      } else {
        if (e.object && e.object === JSON && e.callee === 'parse') {
          e.arguments = ['{}']
        }
        for (let i = 0; i < e.arguments.length; i++) {
          let arg = e.arguments[i];
          if (isProxy(arg)) {
            e.arguments[i] = e.arguments[i].__get_real_obj
          }
        }
      }
    }
  });

  listener.on("after", (e) => {
    DEBUG &&  console.log('calling', e);
    if (e.external) {
      if (!isNativeFunc(e.call) && e.object === null) {
        // this is the case when we hooked the function on the fly and need to restore this functions setting
        e.instance.ForceExecution.pathConstraints = e.instance.ForceExecution.savedFunState.pop();
      }
    }
    if (e.object !== null) {
      if (isProxy(e.object)) {
        // if we call a function on the object it needs to be a real thing thus we need to put this into the SMT solver
        // otherwise we might not consider this object if it does not partake in a conditional but this call would throw an exception
        e.instance.ForceExecution.emitConstraint(extractConstraintFromProxy(e.object));
        let identifier = e.object.__get_identifier;
        let last_ops = e.object.__get_ops;
        let new_ops = deepClone(last_ops);
        let isRealValue = e.object.__is_real_value;

        new_ops.push({
          type: 'member_function',
          function_name: e.callee,
          args: deProxifyArguments([].slice.call(e.real_arguments))
        });
        e.return = makeProxy(e.return, identifier, new_ops, isRealValue);
      } else if (e.object.__proto__ === RegExp.prototype && e.call === /a/.test && isProxy(e.real_arguments[0])) {
        let p = e.real_arguments[0];
        let identifier = p.__get_identifier;
        let last_ops = p.__get_ops;
        let new_ops = deepClone(last_ops);
        let isRealValue = p.__is_real_value;


        let regex = e.object.toString();

        new_ops.push({
          type: 'member_function',
          function_name: 'match',
          args: [regex.slice(1).slice(0, regex.lastIndexOf('/') - 1)]
        });
        e.return = makeProxy(e.return, identifier, new_ops, isRealValue);
      } else if (e.arguments.length) {
        if (e.object === JSON && isProxy(e.real_arguments[0])) {
          // the case for e.g. JSON.parse
          let p = e.real_arguments[0];
          let identifier = p.__get_identifier;
          let last_ops = p.__get_ops;
          let new_ops = deepClone(last_ops);
          let isRealValue = p.__is_real_value;

          new_ops.push({
            type: 'external_function',
            function_name: 'JSON.parse',
            args: deProxifyArguments([].slice.call(e.real_arguments))
          });
          e.return = makeProxy(e.return, identifier, new_ops, isRealValue);
        } else if (e.object === localStorage && e.callee === 'getItem') {
          if (shouldPrivacyThings) {
            let ops = [];
            let id;
            if (isProxy(e.real_arguments[0])) {
              ops.push({
                type: 'member_function',
                function_name: e.callee,
                args: [extractConstraintFromProxy(e.real_arguments[0])]
              });
              id = '';
            } else {
              id = e.real_arguments[0]
            }
            e.return = makeProxy(id, 'storage', ops, true)
          }
        } else {
          let hasProxyAsArgument = false;
          let args = [];
          for (let arg of e.real_arguments) {
            if (isProxy(arg)) {
              hasProxyAsArgument = true;
              args.push(extractConstraintFromProxy(arg))
            } else {
              args.push(arg)
            }
          }
          if (hasProxyAsArgument) {
            e.return = makeProxy(e.object, e.object, [{
              type: 'member_function',
              function_name: e.callee,
              args: args
            }], true)
          }
        }
      }
    } else if (e.real_arguments.length === 1 && isProxy(e.real_arguments[0]) && !e.name.startsWith("$$ANON") && isNativeFunc(e.call)) {
      let p = e.real_arguments[0];
      let identifier = p.__get_identifier;
      let last_ops = p.__get_ops;
      let new_ops = deepClone(last_ops);
      let isRealValue = p.__is_real_value;

      new_ops.push({
        type: 'external_function',
        function_name: e.name,
        args: deProxifyArguments([].slice.call(e.real_arguments))
      });

      e.return = makeProxy(e.return, identifier, new_ops, isRealValue)
    }

  });

  let memberListener = stage.addListener(Iroh.MEMBER);
  memberListener.on("fire", (e) => {
    DEBUG && console.log('Member', e);
    if (e.object === document && e.property === 'cookie' && shouldPrivacyThings) {
      e.object = {};
      e.object[e.property] = makeProxy(document.cookie, 'cookie', [], true)
    }
    if (e.object === localStorage && typeof e.object[e.property] !== 'function' && shouldPrivacyThings) {
      let ops = [];
      let id;
      if (isProxy(e.property)) {
        ops.push({
          type: 'member_function',
          function_name: 'getItem',
          args: [extractConstraintFromProxy(e.property)]
        });
        id = '';
      } else {
        id = e.property
      }
      e.object = {};

      e.object[e.property] = makeProxy(id, 'storage', ops, true)
    }
    //}
  });

  let assignListener = stage.addListener(Iroh.ASSIGN);
  assignListener.on("fire", (e) => {
    DEBUG && console.log('Assign', e);
    if ((e.property === 'innerHTML' || e.property === 'outerHTML') && e.value && isProxy(e.value)) {
      e.instance.ForceExecution.emitSinkAccess(e.value, 'innerHTML', -1, e.hash);
    }
    if ((e.property === 'textContent' || e.property === 'innerText' || e.property === 'text') && e.object instanceof HTMLScriptElement && e.value && isProxy(e.value)) {
      e.instance.ForceExecution.emitSinkAccess(e.value, 'scriptTextContent', -1, e.hash);
    }
    if (e.object === localStorage && e.property && isProxy(e.property) && e.value && isProxy(e.value)) {
      e.instance.ForceExecution.emitStorageAccess(e.property, e.value, e.hash);
    }
    if (e.object === document && e.property && e.property === 'cookie' && e.value && isProxy(e.value)) {
      e.instance.ForceExecution.emitSinkAccess(e.value, 'cookie', -1, e.hash);
    }
  });

  let SWITCHListener = stage.addListener(Iroh.SWITCH);

  SWITCHListener.on("test", (e) => {
    DEBUG && console.log("SWITCH-TEST", e);
    e.instance.ForceExecution.switchValue = e.value;
    e.value = e.instance.ForceExecution.randomValue;
    branchCounter = branchCounter + 1;
  });

  let CASEListener = stage.addListener(Iroh.CASE);

  CASEListener.on("test", (e) => {
    DEBUG && console.log("CASE-TEST", e);
    if (e.instance.ForceExecution.stale.has(e.hash)) {
      e.value = 'nope';
    } else {
      if (isProxy(e.instance.ForceExecution.switchValue)) {
        let constraint = extractConstraintFromProxy(e.instance.ForceExecution.switchValue);
        constraint['ops'].push({
          "type": "Binary",
          "op": '==',
          "val": e.value,
          "side": 'right',
        })
        ;
        e.instance.ForceExecution.emitConstraint(constraint);
      }
      e.value = e.instance.ForceExecution.randomValue;
    }
    DEBUG && console.log("Forcing branch to", e.value);
    branchCounter = branchCounter + 1;
  });


  let LogicalListener = stage.addListener(Iroh.LOGICAL);
  LogicalListener.on("before_second", (e) => {
    DEBUG && console.warn('before second');
    if (e.left !== null && typeof e.left == "object" && e.left.__is_proxy !== undefined) {
      e.instance.ForceExecution.emitLogicalConstraint(e.left.__get_ops, e.op, e.left.__get_identifier);
    }
    e.result = e.op !== '||';
  });

  LogicalListener.on("fire", (e) => {
    DEBUG && console.warn("Logical Comparator", e);
    let res = generateBinaryResult(e.real_left, e.real_right, e.op, 'Logical', e.instance.ForceExecution);
    if (res !== undefined) {
      e.result = res;
    }
  });

  let BinaryListener = stage.addListener(Iroh.BINARY);
  BinaryListener.on("fire", (e) => {
    DEBUG && console.warn("BINARY Comparator", e);
    let res = generateBinaryResult(e.left, e.right, e.op, 'Binary', e.instance.ForceExecution);
    if (res !== undefined) {
      e.result = res;
    }
  });

  let UnaryListener = stage.addListener(Iroh.UNARY);
  UnaryListener.on("fire", (e) => {
    DEBUG && console.warn("Unary Comparator", e);
    let isProxyValue = isProxy(e.value);

    if (isProxyValue) {
      let identifier = e.value.__get_identifier;
      let last_ops = e.value.__get_ops;
      let real_value = e.value.__get_real_obj;
      let isRealValue = e.value.__is_real_value;

      let res_value = evHelper.evalUnary(e.op, real_value);
      let new_ops = deepClone(last_ops);
      new_ops.push({"type": "Unary", "op": e.op});
      e.result = makeProxy(res_value, identifier, new_ops, isRealValue);
    }
  });

  let LoopListener = stage.addListener(Iroh.LOOP);
  LoopListener.on("test", (e) => {
    let constraint;
    if (constraint === undefined && e.value !== undefined && isProxy(e.value)) {
      constraint = extractConstraintFromProxy(e.value);
    }
    if (constraint && !e.instance.ForceExecution.forcedLoop.has(e.hash)) {
      e.instance.ForceExecution.emitConstraint(constraint);
    }
    if (isProxy(e.value)) {
      e.value = !e.instance.ForceExecution.forcedLoop.has(e.hash);
      e.instance.ForceExecution.forcedLoop.add(e.hash);
      console.log("Forcing For Loop to", e.value)
    }
  });

  let TernaryListener = stage.addListener(Iroh.TERNARY);
  TernaryListener.on("before", (e) => {
    DEBUG && console.log("Ternary before", e);
    let constraint;
    if (e.test !== undefined && isProxy(e.test)) {
      constraint = extractConstraintFromProxy(e.test);
    }
    if (constraint && e.instance.ForceExecution.stale.has(e.hash)) {
      constraint = negateConstraint(constraint);
    }
    if (constraint)
      e.instance.ForceExecution.emitConstraint(constraint);

    e.test = !e.instance.ForceExecution.stale.has(e.hash);

    if (e.instance.ForceExecution.shouldLabelAsStale && !e.instance.ForceExecution.stale.has(e.hash)) {
      e.instance.ForceExecution.shouldLabelAsStale = false;
      e.instance.ForceExecution.stale.add(e.hash);
    }
  });
}


// ---------------------------------------------------------------------------------------//


/**
 * no-op function to use for destructive instructions when their parameters are clobbered at runtime
 */ 
function noOperationFunction() {};


/**
 * checks if the `element` is an HTML DOM element
 */ 
function isDOMElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;  
}

/**
 * checks if the `element` is a Window Location object
 */ 
function isLocationObject(element) {
    return element instanceof Location || 
        (element.hasOwnProperty('origin') && 
         element.hasOwnProperty('protocol') && 
         element.hasOwnProperty('host') &&
         element.hasOwnProperty('hostname') &&
         element.hasOwnProperty('port') &&
         element.hasOwnProperty('pathname') &&
         element.hasOwnProperty('port') &&
         element.hasOwnProperty('search') && 
         element.hasOwnProperty('hash') && 
         element.hasOwnProperty('href')) 
}


function isDocumentObject(element){
  return element == theWindow.document || element instanceof Document
}



/**
 * check whether a value evalutes to true or false in javascript
 */ 
function evaluateExpressionValue(expr){
  if(expr){
    return true;
  }
  return false;
}


/**
 * @param e: conditional test expression (e.g., Iroh.IF)
 * @desc stores the branch values for the default execution path of the program
 */ 
function useBranchDefaultValue(e){

  let value = evaluateExpressionValue(e.value);

  // update the path 
  currentBranchPath.push([e.hash, e.value]);

  // store the path hash
  let h= e.hash+'-' + value;
  currentBranchPathHashString = currentBranchPathHashString + h;
}


/**
 * @param e: conditional test expression (e.g., Iroh.IF)
 * @return true if this basic block should be forcefully executed in this program run
 */ 
function shouldForceExecute(e){

  function doBinarySearch(){

    // bineary search;
    // explore the possible execution paths in O(log(n))
    let n = branchesMap.get(e.hash);
    n = n + 1;
    if(n%2 == 0){ 
      return false
    }
    branchesMap.set(e.hash, n);
    return true;
  }

  function pickRandomly(){
    return Math.random() < 0.5;
  }


  let forcedVal = true;
  if(!branchesMap.has(e.hash)){
    branchesMap.set(e.hash, 1);

  }else{

    let n = branchesMap.get(e.hash);
    n = n + 1;
    branchesMap.set(e.hash, n);

    // check if the current path has already been explored and how
    let pathHashSoFar = currentBranchPathHashString;
    let thisBranchTrueHash = '' + e.hash + '-true';
    let thisBranchFalseHash = '' + e.hash + '-false';

    let pathFoundTrueBranch = false;
    let pathFoundFalseBranch = false;
    let pathSoFarFound = false;

    for(let i=0; i<pathsExecutedHashStrings.length; i++){

      if(pathFoundTrueBranch && pathFoundFalseBranch) break;

      if(pathsExecutedHashStrings[i].startsWith(pathHashSoFar)){
        pathSoFarFound = true;
      }

      if(pathsExecutedHashStrings[i].startsWith(pathHashSoFar + thisBranchTrueHash)){
        pathFoundTrueBranch = true;
        continue
      }

      if(pathsExecutedHashStrings[i].startsWith(pathHashSoFar + thisBranchFalseHash)){
        pathFoundFalseBranch = true;
        continue
      }
      
    }

    if(pathFoundTrueBranch && !pathFoundFalseBranch){
        forcedVal= false;
    }
    else if(!pathFoundTrueBranch && pathFoundFalseBranch){
        forcedVal= true;
    }
    else if(pathSoFarFound){

      // if the path up to here was visited before, 
      // but not from here onwards, then follow a binary search approach 
      forcedVal = doBinarySearch(); 

    }else{
      // if the path is not explored yet, 
      // then start the path exploration with a random branch value
      forcedVal = pickRandomly();
    }
  }

  // store the path 
  currentBranchPath.push([e.hash, forcedVal]);
  let h = e.hash+'-' + forcedVal;
  currentBranchPathHashString = currentBranchPathHashString + h;

  return forcedVal;
}


/**
 * checks if the target value was tainted
 */ 
function checkTaint(testString, e){

  if(domcPayloads){
    for(let p of domcPayloads){
      if(testString.includes(p.taint_value)){

        let clobberable_item = {
          'sink': e.getASTNode(),
          'sink_location': e.getPosition(),
          'source': p.code,
          'source_location': [p.location.start.line, p.location.end.line],
          'payload': p.payload,
          'taint_value': p.taint_value,
          'source_string': testString,
        }
        theWindow.clobberable.push(clobberable_item);
        return true;
      }
    }
  }

  if(testString.includes("TAINT")){

    let clobberable_item = {
      'sink': e.getASTNode(),
      'sink_location': e.getPosition(),
      'source_string': testString,
    }
    theWindow.clobberable.push(clobberable_item)
    return true;
  }

  return false;  
}


/**
 * checks if the target sink statement is tainted or not
 * @param e: current sink expression
 * @param node_type: AST node type of the current expression
 * @desc checks if the current sink expression is tainted
 */ 
function checkForFlowToSink(e, node_type){

  if(node_type === "AssignmentExpression"){

    /*
    AssignmentExpression
    --------------------
    Iroh.ASSIGN: {e.object}.{e.property} = {e.value}
    
    Parameters:
      - (e.object) is an `script` element
      - (e.property) is the `src` attribute
      - (e.value) is the clobbered element or contains the 

    CHECKS
      ID.1.1: clobbering the src attribute of an script tag
        * script.src = TAINT

      NOTE: ID.1.1. is similar to the case of ID.2.2
        * srcipt.setAttribute('src', TAINT);

      ID.1.2: clobbering the innerHTML/outerHTML property of some DOM element,
        * someDOMElement.innerHTML = TAINT
        * someDOMElement.outerHTML = TAINT

      ID.1.3: clobbering window location value -> client-side open redirection
        * window.location = TAINT;
        * location = TAINT;
        * window.location.href = TAINT;
        * location.href = TAINT;

      ID.1.4: clobbering cookies:
        * document.cookie = TAINT;

      ID.1.5: clobbering document domain
        * document.domain = TAINT;

    */
    
    let objectElement = e.object;
    if(objectElement && objectElement.tagName && objectElement.tagName.toUpperCase() === 'SCRIPT' && e.property === 'src'){
      let testString = '' + e.value;
      checkTaint(testString, e);
    }
    else if(e.property === 'innerHTML' && isDOMElement(objectElement)){
      let testString = '' + e.value;
      checkTaint(testString, e); 
    }
    else if(e.property === 'outerHTML' && isDOMElement(objectElement)){
      let testString = '' + e.value;
      checkTaint(testString, e); 
    }
    else if(e.object == theWindow && e.property === 'location'){

      let testString = '' + e.value;
      checkTaint(testString, e); 
      // replace with no-op
      e.object = {};
      e.property = 'no_op';
    }

    else if(e.property === 'href' && e.object == theWindow.location){
      let testString = '' + e.value;
      checkTaint(testString, e); 
      // replace with no-op
      e.object = {};
      e.property = 'no_op';
    }

    else if(isDocumentObject(e.object) && e.property === 'cookie'){
      let testString = '' + e.value;
      checkTaint(testString, e); 
    }

    else if(isDocumentObject(e.object) && e.property === 'domain'){
      let testString = '' + e.value;
      checkTaint(testString, e);
      // replace with no-op
      e.object = {};
      e.property = 'no_op';
    }


  }
  else if (node_type === "CallExpression"){
    /*
    CallExpression
    --------------------
    Iroh.CALL:  {e.name}({e.arguments})
          {e.object}.{e.callee}({e.arguments})

    Parameters:
      - (e.name) is the string of the CallExpression function name
      - (e.object) is the object on which the method is called, e.g., document
      - (e.callee) is the method name called on the e.object
      - (e.arguments) is the list of call arguments


    CHECKS

      ID.2.1: clobbering the argument of a security sensitive function
        * document.write(TAINT)
        * document.writeln(TAINT)
        * eval(TAINT)
        * someDOMElement.insertAdjacentHTML(position, TAINT);
        * setTimeout(TAINT, time)
        * setInterval(TAINT, time)

      ID.2.2: clobbering the src attribute of an script tag
        * srcipt.setAttribute('src', TAINT);
        * Similar to the case of ID.1.1, i.e., srcipt.src = TAINT

      ID.2.3: clobbering client-side request parameters
        * xmlhttprequest.open(TAINT, ...)
        * fetch(TAINT, ...)

      ID.2.4: clobbering window location -> client-side open redirect (similar to ID.1.3)
        * window.location.assign(TAINT);
        * location.assign(TAINT);
        * window.location.href.assign(TAINT);
        * location.href.assign(TAINT);
        * window.location.replace(TAINT);
        * location.replace(TAINT);

      ID.2.5: clobbering webstorage items
        * localStorage.setItem(X, TAINT);
        * sessionStorage.setItem(X, TAINT);

      ID.2.6: clobbering json parsing params
        * JSON.parse(TAINT);

    */
    if(e.name === 'eval'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction; // change the call to no-op to avoid side effects (e.g., page breakage)
        }
      }
    }

    else if(e.name === 'setTimeout'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      }
    }

    else if(e.name === 'setInterval'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      }
    }

    else if(e.object === theDocument && e.callee == "write"){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction; // change the call to no-op to avoid side effects (e.g., DOM tree being overwritten with tainted data)
        }
      }
    }

    else if(e.object === theDocument && e.callee == "writeln"){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      }
    }

    else if(e.callee === "insertAdjacentHTML" && isDOMElement(e.object)){
      if(e.arguments && e.arguments.length >= 2){
        let testString = '' + e.arguments[1];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      } 
    }

    else if(e.callee === "setAttribute" && e.object && e.object.tagName && e.object.tagName.toUpperCase() === 'SCRIPT'){
      if(e.arguments && e.arguments.length >= 2){
        let testString = '' + e.arguments[1];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      } 
    }

    else if(e.name === 'fetch'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      }
    }

    else if(e.object.toString() === '[object XMLHttpRequest]' && e.callee === "open"){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[1];
        let flag = checkTaint(testString, e);
        if(flag){
          e.call = noOperationFunction;
        }
      }
    }
    else if(isLocationObject(e.object) && (e.callee === "replace" || e.callee === "assign")){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        checkTaint(testString, e);
        e.call = noOperationFunction;

      }
    }

    else if(e.object == JSON && e.callee === 'parse'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[0];
        let flag = checkTaint(testString, e);
        if(flag) {
          e.call = noOperationFunction;
        }
      }
    }

    else if((e.object == theWindow.localStorage || e.object == theWindow.sessionStorage) && e.callee === 'setItem'){
      if(e.arguments && e.arguments.length){
        let testString = '' + e.arguments[1];
        let flag = checkTaint(testString, e);
        if(flag) {
          e.call = noOperationFunction;
        }
      }
    }



  }
  else if (node_type === "NewExpression"){
    /*
    NewExpression
    --------------------
    Iroh.OP_NEW:  {e.name}({e.arguments})
          {e.object}.{e.callee}({e.arguments})

    Parameters:
      - (e.name) is the string of the CallExpression function name
      - (e.object) is the object on which the method is called, e.g., document
      - (e.callee) is the method name called on the e.object
      - (e.arguments) is the list of call arguments


    CHECKS
      ID.3.1: clobbering the argument of a security sensitive new constructor, say string `s`
        * new Function(s)

      ID.3.2: clobbering websocket connections
        * new WebSocket(url)
    */

    if(e.name === "Function" && e.arguments && e.arguments.length){
      let testString = '' + e.arguments[0];
      let flag = checkTaint(testString, e);
      if(flag){
        // replace new Function with no-op
        e.ctor = noOperationFunction;   
      }
    }

    else if(e.name === "WebSocket" && e.arguments && e.arguments.length){
      let testString = '' + e.arguments[0];
      let flag = checkTaint(testString, e);
      if(flag){
        // replace WebSocket with no-op
        e.ctor = noOperationFunction;   
      }
    }


  }

  // TODO:
  // else if (node_type === ...){}

}


/**
 * dynamic code instrumentation with Iroh
 */ 
function instrumentStage(stage){

  let AssignExpressionListener = stage.addListener(Iroh.ASSIGN);
  AssignExpressionListener.on("fire", (e) => {
    checkForFlowToSink(e, "AssignmentExpression");
  });


  // note: use the `before` event instead of `after` to mitigate the side effects
  // of `document.write` emptying the DOM tree before reading
  let CallExpressionListener = stage.addListener(Iroh.CALL);
  CallExpressionListener.on("before", (e) => { 
    checkForFlowToSink(e, "CallExpression");

    if (isDestructiveCall(e)) {
      // replace destructive operations with no-op to 
      // prevent the unwanted side effects of forced execution
      DEBUG && console.warn('replacing destructive call with no-op', e.call);
      e.call = noOperationFunction;
      return;
    }
  });

  let NewExpressionListener = stage.addListener(Iroh.OP_NEW);
  NewExpressionListener.on("before", (e) => {
    checkForFlowToSink(e, "NewExpression");
  });


  let IFListener = stage.addListener(Iroh.IF);
  IFListener.on("test", (e) => {

    DEBUG && console.log("IF-TEST", e, e.value);
    branchCounter = branchCounter + 1;

    if(!shouldDoDefaultExecution){
      e.value = shouldForceExecute(e);
      FORCE_EXEC_DEBUG_RUN && console.log("Forcing branch to", e.value);
    }else{
      useBranchDefaultValue(e);
      FORCE_EXEC_DEBUG_RUN && console.log("Using default branch", evaluateExpressionValue(e.value));
    }
  });

  IFListener.on("enter", (e) => {
   DEBUG && console.log("IF-ENTER", e, e.value);

  });
  IFListener.on("leave", (e) => {
    DEBUG && console.log("IF-LEAVE", e, e.value);
  });


  let ELSEListener = stage.addListener(Iroh.ELSE);
  ELSEListener.on("enter", (e) => {
    DEBUG && console.log("ELSE-ENTER");
  });
  ELSEListener.on("leave", (e) => {
    DEBUG && console.log("ELSE-LEAVE");
  });


  let SWITCHListener = stage.addListener(Iroh.SWITCH);
  SWITCHListener.on("test", (e) => {
    DEBUG && console.log("SWITCH-TEST", e);
    branchCounter = branchCounter + 1;
    if(!shouldDoDefaultExecution){
      e.value = randomString();
      DEBUG && console.log("Forcing branch to", e.value);
    }else{
      useBranchDefaultValue(e);
      DEBUG && console.log("Using default branch", evaluateExpressionValue(e.value));
    }
  });


  let CASEListener = stage.addListener(Iroh.CASE);
  CASEListener.on("test", (e) => {
    branchCounter = branchCounter + 1;
    DEBUG && console.log("CASE-TEST", e);
    DEBUG && console.log("Forcing branch to", e.value);
  });


  let LoopListener = stage.addListener(Iroh.LOOP);
  LoopListener.on("test", (e) => {
    DEBUG && console.log("LOOP-TEST", e);
    DEBUG && console.log("Forcing loop to", e.value);
  });

}

// ---------------------------------------------------------------------------------------//
//  END Instrumentation
// ---------------------------------------------------------------------------------------//

// ---------------------------------------------------------------------------------------//
//  START Main Entry
// ---------------------------------------------------------------------------------------//

/**
 * return true for as long as we can find new code while forcefully executing the program
 */
function isNotStale(nPathsExecuted){

  let nBranches = Math.max(defaultExecutionBranches, maxNumberOfBranchesInPaths);
  // max num of possible executions of the program
  // +1 is to account for the default execution path
  let maxPossiblePaths = Math.pow(2, nBranches) + 1;
  FORCE_EXEC_DEBUG_RUN && console.log(`# Executed Paths: ${nPathsExecuted}/${maxPossiblePaths}.`);

  if(nPathsExecuted < maxPossiblePaths){
    return true;
  }
  return false;

}

/**
 * maximum number of forcefully executed paths 
 * that the tester wants to allow per source-sink pair
 */
function getPathThresholdCount(){
  return pathExecutionThreshold;
}

/**
 * callback to forcefully run the different execution paths of the program
 */
function forceExecuteOtherPaths(){

  // store the last visited path
  if(currentBranchPath && currentBranchPath.length){
    pathsExecuted.push(currentBranchPath);
    pathsExecutedHashStrings.push(currentBranchPathHashString);
  }
  
  let nPathsExecuted = 1
  while(nPathsExecuted <= getPathThresholdCount() && isNotStale(nPathsExecuted)){
    nPathsExecuted = nPathsExecuted + 1;

    if(branchCounter > maxNumberOfBranchesInPaths){
      maxNumberOfBranchesInPaths= branchCounter;
    }

    // reset the containers holding the last visited path
    resetBranchesForNextExecution();

    // force-execute
    eval(window.stage.script);

    // store the last visited path
    if(currentBranchPath && currentBranchPath.length){
      pathsExecuted.push(currentBranchPath);
      pathsExecutedHashStrings.push(currentBranchPathHashString);
    }

  }
}


/**
 * callback to forcefully run the default execution path of the program
 */
function forceExecuteDefaultPath(){
  eval(window.stage.script);
  defaultExecutionBranches = branchCounter;
}


/**
 * main callback to start the forced execution
 * invoked by `force_executin.js` program
 */
function startForceExecution(sourceSinkFlowObject){ 

  currentSourceSinkFlowObject = sourceSinkFlowObject; 

  // 0. initialize containers for holding the control flow paths
  resetBranchesForNextSourceSinkFlow();

  // 1. forcefully execute the default program control flow w/ no change in conditionals
  shouldDoDefaultExecution= true;
  forceExecuteDefaultPath();
  
  // 2. force execute other execution paths in the control flow
  shouldDoDefaultExecution= false;
  forceExecuteOtherPaths();

}


/**
 * Do the instrumentation
 */
instrumentStage(stage);
theWindow.stage = stage;


/**
 * start: done by the `force_executin.js` program
 * only for debug here;
 */
FORCE_EXEC_DEBUG_RUN && startForceExecution();
FORCE_EXEC_DEBUG_RUN && console.log('clobberable', theWindow.clobberable); 




