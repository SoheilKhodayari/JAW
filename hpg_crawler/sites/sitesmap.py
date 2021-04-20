
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
	
"""

# -------------------------------------------------------------------- #
#				Input
# -------------------------------------------------------------------- #

# TODO: place your input sites here for testing

SITES_MAP = {
	'1': ('google', 'https://google.com', ),
}


# -------------------------------------------------------------------- #
#				Interface
# -------------------------------------------------------------------- #
def get_site_data(site_id):

	"""
	@param {int/str} site_id
	@return respective entry of SITES_MAP or None
	"""

	key = str(site_id)
	if key in SITES_MAP:
		return SITES_MAP[key]
	else:
		return None



























