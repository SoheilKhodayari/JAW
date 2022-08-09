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
*/


const esmangle = require('esmangle');
const escodegen = require('escodegen');
const fs = require("fs");

var passes = require('./passes').createPipeline;


/**
 * CodeProcessor
 * @constructor
 */
function CodeProcessor() {
}


/**
 * process argv input
 * @returns {Array} options array, i.e., {lang: '', input: '', output: ''}
 */
CodeProcessor.prototype.startPasses = function (inputScript, ast, outputScript) {
    "use strict";

    try{
        ast = esmangle.optimize(ast, passes(), {
            destructive: false
      });
    }
    catch(e){
        console.error("[Error] problem in mangling", e);
        return {
            success: false,
            ast: null
        };
            
    }

    var processed_code = escodegen.generate(ast, {
      comment: true
    });

    fs.writeFileSync(outputScript, processed_code);
    return {
        success: true,
        ast: ast
    };

};

var instance = new CodeProcessor();
module.exports = instance;





