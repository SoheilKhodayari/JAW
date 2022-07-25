
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


  Usage:
  ------------
  python3 -m hpg_analysis.cs_csrf.unit_test --js=test_7.js


  Output:
  ------------
  The following outputs will be located under the /hpg_construction/outputs/unit_tests/cs_csrf/ folder.
    - the hpg model (nodes.csv, rels.csv)
    - request templates (template.out)
  

  Description:
  ------------
  Unit Test file for the detection of client-side CSRF

  
  Source: window.location.hash
  Sink:  Fetch
  Type: Inter-Procedural, Events
  Checks: AST, CFG, PDG, IPCG, ERDDG Edges

*/


// sources
var s1 = window.location.hash; // Win Hash Fragment
var s2 = document.cookie; // Cookie
var s3 = document.referrer; // Referrer
var s4 = window.name;   // Win Name
var s5 = window.localStorage.getItem('key') // Storage
var s6 = document.getElementById('div-id').attr('class') // DOM Attr


var eventName = 'focus';
var button =document.getElementById('button-id');
function eventHandler(){

	fetch(s1+s2+s3+s4+s5+s6); // taint with all sources
}
button.addEventListener(eventName, eventHandler);
button.focus();









