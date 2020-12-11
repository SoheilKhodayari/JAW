

"""
	HTML Parser Module
	:process HTML of a web page
"""


from bs4 import BeautifulSoup



# ------------------------------------------------------------------- #
#		Utils 
# ------------------------------------------------------------------- #

"""
	@Instructions: put utility functions here
"""

def get_global_variable_of_html_for_js(soup_content):

	all_forms = soup_content.find_all('form')
	named_forms = [f for f in all_forms if f.get('name')]

	form_variables = { } # key: form_name, value: [input_name_1, input_name_2, text_area_1, button_name_1, ...]

	for form in named_forms:
		form_name = form.get('name')



		all_inputs = form.find_all('input', type="hidden")
		named_inputs = [i.get('name') for i in all_inputs if i.get('name')]
		form_variables[form_name] = named_inputs

		all_textareas = form.find_all('textarea')
		named_textareas = [t.get('name') for t in all_textareas if t.get('name')]
		if len(named_textareas):
			form_variables[form_name].extend(named_textareas)

		all_buttons = form.find_all('button')
		named_buttons = [b.get('name') for b in all_buttons if b.get('name')]
		if len(named_buttons):
			form_variables[form_name].extend(named_buttons)

	return form_variables



def get_absolute_variable_names(form_dictionary):
	"""
	@param {dict} form_dictionary: output of get_global_variable_of_html_for_js() function
	@return {list} variable names accessible as 'document' properties
	"""
	_DOCUMENT = 'document'
	_DOT = '.'
	
	out = []
	keys = form_dictionary.keys()
	
	for form_name in keys:
		
		form_statement = _DOCUMENT+ _DOT + str(form_name)
		out.append(form_statement)

		form_fields = form_dictionary[form_name]
		for each_field in form_fields:
			input_var = form_statement + _DOT + str(each_field)
			out.append(input_var)

	return out

# ------------------------------------------------------------------- #
#		Interface 
# ------------------------------------------------------------------- #

"""
	@Instructions: put interface functions here
"""

def get_document_properties_from_html(soup_content):

	"""
	@param {bs4 content} soup_content
	@return {list} variable names accessible as 'document' properties
	"""
	form_dictionary = get_global_variable_of_html_for_js(soup_content)
	out = get_absolute_variable_names(form_dictionary)

	return out


def unit_test_file():
	
	import os
	base = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
	# path to the test html file
	path = base + '/analyzer/test-inputs/sugarcrm/sugarcrm_94f2c37f284b336769d776a4457694829f9aa203093a34d2d0f1be69bd1f23af.html'
	with open(path, 'r') as fp:
		soup_content = BeautifulSoup(fp.read().strip(),'html.parser')
		out = get_document_properties_from_html(soup_content)
		print(out)



