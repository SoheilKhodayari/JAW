# -------------------------------------------------------------------- #
#				Input
# -------------------------------------------------------------------- #

# TODO: place your input sites here for testing

SITES_MAP = {
	'1': ('sugarcrm', 'https://s2.demo.opensourcecms.com/sugarcrm', 'https://s2.demo.opensourcecms.com/sugarcrm/', True),
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



























