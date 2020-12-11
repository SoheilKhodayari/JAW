# Building a Web Property Graph


## Building with Command Line

In order to create a property graph and import it to an active neo4j database, you can use the following command:

```sh
$ python3 -m wpg_construction.api <path> --js=<program.js> --import=<bool> --hybrid=<bool> --reqs=<requests.out> --evts=<events.out> --cookies=<cookies.pkl> --html=<html_snapshot.html>
```

For help regarding the meaning of each option in the above command, please use the help CLI provided with the graph construction API:
```sh
$ python -m wpg_construction.api -h
```

To build a WPG for a given JavaScript file, you can run:
```bash
$ node wpg_construction/main.js -js <RELATIVE_PATH_TO_INPUT> -o <OUTPUT_FOLDER_NAME>
```
This would create a `nodes.csv` and `rels.csv` file which you have to import into `neo4j`.
```bash
$ neo4j-admin import --mode=csv --database=graph.db --nodes=nodes.csv --relationships=rels.csv --delimiter='¿'
```

Alternatively, you can import a WPG (in one step) using the provided API:
```bash
$ python -m wpg_neo4j.wpg_import <path-to-the-folder-of-the-csv-files> --nodes=nodes.csv --edges=rels.csv
```
Help CLI:
```bash
$ python -m wpg_neo4j.wpg_import -h
```


## Building with Python API

Alternatively, you can use the Python API provided by the `wpg_neo4j` module. The example below creates a WPG for a single URL of a site collected by the JAW crawler, where `site_id` specifies the `site`, and `url` specifies the program to analyze.
```python
import os
import constants as constantsModule
import utils.utility as utilityModule
import wpg_neo4j.db_utility as neo4jDatabaseUtilityModule
import wpg_neo4j.query_utility as neo4jQueryUtilityModule
import wpg_crawler.sites.sitesmap as sitesMapConfig 

def build_wpg(site_id, url):
	if site_id in sitesMapConfig.SITES_MAP:
		## setup the path to the input program
		siteConfig = sitesMapConfig.SITES_MAP[site_id] 
		folder_name_of_url = siteConfig[0] + "_" + utilityModule._hash(url)
		absolute_program_folder_name = os.path.join(os.path.join(constantsModule.OUTPUT_NODES_RELS_PATH, siteConfig[0]), folder_name_of_url)
	
		## build a web property graph
		[program_folder_name, absolute_program_folder_name] = neo4jDatabaseUtilityModule.API_build_property_graph(site_id, url)

		## import the graph into neo4j
		nodes_file = os.path.join(absolute_program_folder_name, constantsModule.NODE_INPUT_FILE_NAME)
		rels_file =  os.path.join(absolute_program_folder_name, constantsModule.RELS_INPUT_FILE_NAME)
		db_name = folder_name_of_url + '.db'
		neo4jDatabaseUtilityModule.API_neo4j_prepare(absolute_program_folder_name)
		time.sleep(10) # wait for neo4j a bit to prepare

		return db_name
	return -1
```

## Basic Queries
Once the WPG graph is built and imported into a neo4j database, 
You can run queries over the graph.
For this, you can use the `wpg_neo4j` module, as shown below.

```python
def query_active_wpg():
    try:
	## set a timeout for the query
	with utilityModule.Timeout(30*60): # 30 x 60 seconds = 30 min 
	    ### query the graph
	    query_results = neo4jDatabaseUtilityModule.exec_fn_within_transaction(my_query_function)
	    ### process the query results here
    except utilityModule.Timeout.Timeout:
	print("Timedout NEO4J_ANALYSIS")


def my_query_function(tx):
   query="""
	MATCH (n {Type: 'Literal'})
	WHERE (n.Value = 'exampleValue')
	RETURN n
	"""
   return tx.run(query)
```
