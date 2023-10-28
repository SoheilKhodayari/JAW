
/*
    Copyright (C) 2023  Soheil Khodayari, CISPA
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
    JS API Instrumentation Logic
*/


const fs = require('fs');
const pathModule = require('path');

/**
 * Instrumentor
 * @constructor
 */
function Instrumentor() {
    "use strict";
    /* start-test-block */
    this._testonly_ = {
    };
    /* end-test-block */
}


Instrumentor.prototype.getInstrumentedFunctionHooks = async function(logCallsToBrowserConsole){
    
    let functionHooks= '';
    let instrumentation_hooks_file = pathModule.join(__dirname, 'hooks.js');
    if(fs.existsSync(instrumentation_hooks_file)){
        try {
            functionHooks = fs.readFileSync(instrumentation_hooks_file, 'utf8');
            return functionHooks; 
        } catch (err) {
            // pass
            return functionHooks; 
        }          
    }
    return functionHooks;

}

var instrumentorInstance = new Instrumentor();
module.exports = instrumentorInstance;