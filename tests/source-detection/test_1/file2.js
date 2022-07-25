/*

  Copyright (C) 2021  Soheil Khodayari, CISPA
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
  Unit Test file for the detection of DOM Clobbering
  Testing Multiple Files

  
  Run:
  -----------
  $ cd analyses/domclobbering
  $ node static_detector_tests.js


*/

timeout = window.setTimeout('f()', 2000);


var source = document.x.y.z;
sink_document_write(source);
sink_eval(source);
script_src(source);

function sink_document_write(c){

  var k = c.key;
  document.write(k);

}

function sink_eval(c){

  var k = c.key;
  document.write(k);

}

function script_src(c){

  var k = c.key;

  var script = document.createElement("script");
  script.src = k;
  document.body.appendChild(script);

}

