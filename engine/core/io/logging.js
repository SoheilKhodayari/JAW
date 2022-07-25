
/*
    Copyright (C) 2022 Soheil Khodayari, CISPA
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
    Interface for logging esprima AST nodes and pretty-printing them to console

*/


/**
 * LoggingModule
 * @constructor
 */

function LoggingModule(hideLogs) {

    this.hideLogs = hideLogs;
}


LoggingModule.prototype.consoleLog = function (object) {

    if(!this.hideLogs){
        console.dir(object, {depth: 8, colors: true});
    }
}


LoggingModule.prototype.consoleLogNode = function (node) {


    if(!this.hideLogs){
        
        if(node.type == "VariableDeclaration"){
            node.declarations.forEach(decl=> {
                console.log(decl.type, decl.id.name, decl.loc.start);
            });
        }

        if(node.type == "FunctionDeclaration"){
            console.log(node.type, node.id.name, node.loc.start);
        }
    }

}



var hideLogs = false;
var logger = new LoggingModule(hideLogs);
module.exports = logger;