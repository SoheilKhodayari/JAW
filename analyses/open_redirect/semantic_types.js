/*
		Copyright (C) 2024  Soheil Khodayari, CISPA
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
		Sematic Types for open redirect vulnerabilites
*/



var semanticTypes = {};

// write
semanticTypes.WR_WIN_OPEN_URL = "WR_WIN_OPEN_URL";
semanticTypes.WR_WIN_LOC_URL = "WR_WIN_LOC_URL";
semanticTypes.WR_FRAME_URL = "WR_FRAME_URL";

module.exports = semanticTypes;