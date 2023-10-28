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
		Sematic Types for request hijacking vulnerabilites
*/


/* Format: {WR_expression} = possible to write attacker-controllable data to expression */
var semanticTypes = {};


// write
semanticTypes.WR_WEBSOCKET_URL = "WR_WEBSOCKET_URL"; 
semanticTypes.WR_EVENTSOURCE_URL = "WR_EVENTSOURCE_URL";
semanticTypes.WR_REQ_URL = "WR_REQ_URL";
semanticTypes.WR_REQ_BODY = "WR_REQ_BODY";
semanticTypes.WR_REQ_HEADER = "WR_REQ_HEADER";
semanticTypes.WR_REQ_PARAMS = "WR_REQ_PARAMS"; // any parameter, including URL, body and header 
semanticTypes.WR_WIN_OPEN_URL = "WR_WIN_OPEN_URL";
semanticTypes.WR_WIN_LOC_URL = "WR_WIN_LOC_URL";

// requests
semanticTypes.REQ_NO_CSRF_TOKEN = "REQ_NO_CSRF_TOKEN";
semanticTypes.REQ_PUSH_SUB = "REQ_PUSH_SUB";
semanticTypes.REQ_PUSH_SUB_NO_CSRF_TOKEN = "REQ_PUSH_SUB_NO_CSRF_TOKEN"
semanticTypes.REQ_PUSH_SUB_WR_URL = "REQ_PUSH_SUB_WR_URL";


module.exports = semanticTypes;