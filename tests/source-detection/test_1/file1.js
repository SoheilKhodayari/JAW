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





var source = window.x.y.z;
var script = document.createElement("script");
script.src = source;
document.body.appendChild(script);


