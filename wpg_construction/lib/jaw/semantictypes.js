 /*
 * Map of semantic types to assign to AST nodes
 */

// @TODO: add/import your semantic types here. 

 var sTypeMap= {
 	'REQ': [
 		'XMLHttpRequest',
 		'fetch',
 		'ajax'
 	],
 	'E-REGISTER': [
 		'addEventListener'
 	],
 	'E-DISPATCH': [
 		'dispatch'
 	]
 }

 exports.sTypeMap = sTypeMap;