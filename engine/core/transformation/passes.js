/*
    Copyright (C) 2022  Soheil Khodayari, CISPA
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
    Preprocess JavaScript Code and Transform


    Usage:
    ------------
      > var passes = require('./passes').createPipeline;
      > var esmangle = require('esmangle');
      > esmangle.optimize(ast, passes());

*/


var pass = require("esmangle").pass;
var estraverse = require("estraverse");
var escode = require("escodegen");


function createPipeline() {
  var pipeline;

 /**
  * esmangle pipeline
  * each pipe can be commented out if not needed.
  * see the list of passes here: https://github.com/estools/esmangle/tree/master/lib/pass
  * @type {Array}
  */
  pipeline = [

    /** 
     * a["b"] -> a.b
     */
    'pass/transform-dynamic-to-static-property-access',


    /** 
     * {"a":"b"} -> {a:"b"}
     */
    'pass/transform-dynamic-to-static-property-definition',


    /** function hoisting:
     *  f();               ->    function f(){...}
     *  function f(){...}        f(); 
     */
    'pass/reordering-function-declarations',


    /**
     *  removes EmptyStatement nodes
     */
    'pass/remove-empty-statement',


    /**
     *  removes useless BlockStatement and flatten + minimize the subtree
     *  if(a){ } -> if(a);
     */
    'pass/remove-wasted-blocks',


    /**
     * a = a + b -> a += b
     */
    // 'pass/transform-to-compound-assignment',
    

    /**
     * d = (4, 8); -> d = 8
     * Note that the result of the above line is 8. 
     * Expressions are evaluated from left to right. 
     * The result of the process is the result of the last one, i.e., the number 8.
     */
    'pass/reduce-sequence-expression',


    /**
     * if(x){ if(y) { ... }} -> if(x && y){ ... }
     */
    'pass/reduce-multiple-if-statements',



    /**
     * transforms dead code after premature ReturnStatment
     * https://github.com/estools/esmangle/blob/master/lib/pass/dead-code-elimination.js
     */
    'pass/dead-code-elimination',
    


    /**
     * if(false){} --> false;
     */
    'pass/remove-unreachable-branch',


    /**
     * removes empty statements and the ones with no effect
     * false; --> empty
     * 7; --> empty
     */
     'pass/remove-side-effect-free-expressions',



     /**
      * evalute simple expressions with constants to their value 
      * "a" + "b" -> "ab"
      * 0 + 1 -> 1
      * typeof function(){} -> "function"
      */
      'pass/tree-based-constant-folding',


      /**
       * transforms expressions to semantically simpler versions by removing the unneccessary code contexts 
       * a?0:1 => a;
       * a?0:b => a||b;
       * a?b:0 => a&&b;
       */
      'pass/remove-context-sensitive-expressions',



      /**
       * transforms branched ReturnStatement to expressions 
       * if(cond) return v;     -->       return cond? v: v2;
       * return v2;
       */
      'pass/reduce-branch-jump',



      /**
       * other passes
       */
      // 'pass/hoist-variable-to-arguments',
      // 'pass/transform-immediate-function-call',
      // 'pass/transform-logical-association',
      // 'pass/remove-unused-label',
      // 'pass/transform-to-sequence-expression',
      // 'pass/transform-branch-to-expression',
      // 'pass/transform-typeof-undefined',
      // 'pass/reduce-branch-jump',
      // 'pass/concatenate-variable-definition',
      // 'pass/drop-variable-definition',
      // 'pass/eliminate-duplicate-function-declarations',
      // 'pass/typeof-prefix-comparison',
      // 'pass/top-level-variable-declaration-to-assignment',
      
  ];

  pipeline = [pipeline.map(pass.require)];
  
  return pipeline;
}

exports.createPipeline = createPipeline