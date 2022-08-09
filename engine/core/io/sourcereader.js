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
    Interface to read input code for static analysis
*/


/*
 * Reading source files
 */
var fs = require('fs');

/**
 * SourceReader
 * @constructor
 */
function SourceReader() {
}

/**
 * Read file content of a page from source files
 * @param {Array} files
 * @returns {string} Merged file content
 */
SourceReader.prototype.getSourceFromFiles = function (files) {
    "use strict";
    var source = '';
    files.forEach(function (filename) {
        var content = fs.readFileSync(filename, 'utf-8');
        source += '' + content;
    });
    return source;
};


/**
 * Read file content of a page from source files
 * @param {string} filename
 * @returns {string} file content
 */
SourceReader.prototype.getSourceFromFile = function (filename) {
    "use strict";
    var content = fs.readFileSync(filename, 'utf-8');
    var source = '' + content;
    return source;
};



var reader = new SourceReader();
module.exports = reader;