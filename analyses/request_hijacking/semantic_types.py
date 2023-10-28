# -*- coding: utf-8 -*-

"""
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


	Description:
	------------
	Semantic Types for request hijacking vulnerabilities

	Usage:
	-----------
	> import analyses.request_hijacking.semantic_types as SemTypeDefinitions

"""


## --- semantic of instructions --- ## 

# write
WR_WEBSOCKET_URL = "WR_WEBSOCKET_URL"; 
WR_EVENTSOURCE_URL = "WR_EVENTSOURCE_URL";
WR_REQ_URL = "WR_REQ_URL";
WR_REQ_BODY = "WR_REQ_BODY";
WR_REQ_HEADER = "WR_REQ_HEADER";
WR_REQ_PARAMS = "WR_REQ_PARAMS"; 
WR_WIN_OPEN_URL = "WR_WIN_OPEN_URL";
WR_WIN_LOC_URL = "WR_WIN_LOC_URL";

# non reachable
NON_REACHABLE = "NON_REACH"

# requests
REQ_NO_CSRF_TOKEN = "REQ_NO_CSRF_TOKEN";
REQ_PUSH_SUB = "REQ_PUSH_SUB";
REQ_PUSH_SUB_NO_CSRF_TOKEN = "REQ_PUSH_SUB_NO_CSRF_TOKEN"
REQ_PUSH_SUB_WR_URL = "REQ_PUSH_SUB_WR_URL";

# read 
RD_WIN_LOC = "RD_WIN_LOC"
RD_WIN_NAME = "RD_WIN_NAME"
RD_DOC_REF = "RD_DOC_REF"
RD_PM = "RD_PM"
RD_WEB_STORAGE = "RD_WEB_STORAGE"
RD_DOM_TREE = "RD_DOM"
RD_COOKIE = "RD_COOKIE"

