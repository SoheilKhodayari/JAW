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


const argv = require("process.argv");


/**
 * CLI
 * @constructor
 */
function CLI() {
}


/**
 * process argv input
 * @returns {Array} options array, i.e., {lang: '', input: '', output: ''}
 */
CLI.prototype.readArgvInput = function () {
    "use strict";

    const defaultOptions = {
        lang: 'js', 
        input: '', 
        output: '',
        mode: 'csv',    
        graphid: ''    
    };

    var processArgv = argv(process.argv.slice(2));
    var config = processArgv({}) || {};

    if(!config.lang) {
        config.lang = defaultOptions.lang;
    }
    if(!config.input) {
        config.input = defaultOptions.input;
    }
    if(!config.output) {
        config.output = defaultOptions.output;
    }
    if(!config.mode){
        config.mode = defaultOptions.mode;
    }
    if(!config.graphid){
        config.graphid = defaultOptions.graphid;
    }

    return config;
};

var instance = new CLI();
module.exports = instance;