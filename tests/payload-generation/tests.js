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
    Test File for HTML Payload Generation for Clobbering DOMC Sources

    Run:
    -----------
    $ node tests.js
*/


const DOMClobberingPayloadGenerator = require('./../../static/domc_payload_generator').DOMClobberingPayloadGenerator;
const payloadGenerator = new DOMClobberingPayloadGenerator(); 


statements = [
	{
		"id": 1,
		"code": "window.x",
		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
	}, 
	{
		"id": 2,
		"code": "window.x.y",
		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
	}, 
	{
		"id": 3,
		"code": "window.x.y.src",
		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
	}, 
	{
		"id": 4,
		"code": "window.x.y.value",
		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
	}, 
	{
		"id": 5,
		"code": "window.x.y.z",
		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
	}, 

]


for(st of statements){
	let payload = payloadGenerator.create_dom_clobbering_html_payload(st);
	console.log(st.code);
	console.log(payload);
	console.log('----\n')
}