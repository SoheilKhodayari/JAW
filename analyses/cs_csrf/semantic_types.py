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
	Client-Side CSRF Semantic Types

	Usage:
	-----------
	> import analyses.cs_csrf.semantic_types as CSRFSemanticTypes

"""



# source semantic types 
SEM_TYPE_NON_REACHABLE = 'NON-REACH' 		 # not reading from any specific semantic type
SEM_TYPE_DOM_READ = 'DOM-READ' 			     # read from DOM attributes
SEM_TYPE_LOCAL_STORAGE_READ = 'STORAGE-READ' # read from localStorage or sessionStorage
SEM_TYPE_COOKIE_READ = 'COOKIE-READ' 		 # read from document.cookie
SEM_TYPE_WIN_LOC_READ = 'WIN.LOC-READ' 		 # read from window.location properties
SEM_TYPE_WIN_NAME_READ = 'WIN.NAME-READ'	 # read from window.name
SEM_TYPE_DOC_REF_READ = 'DOC.REF-READ'		 # read from document.referrer
SEM_TYPE_PM_READ = 'PM-READ'				 # read from postMessages



