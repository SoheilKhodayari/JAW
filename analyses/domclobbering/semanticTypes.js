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
        semantic types
*/


/**
 * ------------------------------------------------
 *   		DOM Clobbering Semantic Types
 * ------------------------------------------------
**/

const DOM_CLOB_SOURCE = "DOM_CLOBBERING_SOURCE";
const CUSTOM_VAR = "CUSTOM_VAR";
const NATIVE_PROP = "NATIVE_PROP";
const WIN_NATIVE_PROP = "WIN.NATIVE_PROP";
const WIN_CUSTOM_VAR = "WIN.CUSTOM_VAR";
const DOC_NATIVE_PROP = "DOC.NATIVE_PROP";
const DOC_CUSTOM_VAR  = "DOC.CUSTOM_VAR";


const DOM_CLOB_SINK = "DOM_CLOBBERING_SINK";
const WIN_LOC = "WIN.LOC";
const WEBSOCK_URL = "WEBSOCK_URL";
const DOC_COOKIE = "DOC.COOKIE";
const DOC_STORAGE = "DOC.STORAGE";
const DOC_DOMAIN = "DOC.DOMAIN";
const JSON_PARSE = "JSON.PARSE";
const REGEX_BUILD = "REGEX_BUILD";
const REQ = "REQ";
const CODE_LOADING = "CODE_LOADING";
const CODE_EXEC = "CODE_EXEC";
const DOM_NODE_ADD = "DOM_NODE_ADD";

const type_open_redirect = "type_open_redirect";
const type_websocket_url_poisoning = "type_websocket_url_poisoning";
const type_cookie_manipulation = "type_cookie_manipulation";
const type_web_storage_manipulation = "type_web_storage_manipulation";
const type_document_domain_manipulation = "type_document_domain_manipulation";
const type_client_side_json_injection = "type_client_side_json_injection";
const type_regex_denial_of_service = "type_regex_denial_of_service";
const type_request_forgery = "type_request_forgery";
const type_cross_site_scripting = "type_cross_site_scripting";

