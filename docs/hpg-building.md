# Building a Hybrid Property Graph


## CLI

**HPG Construction CLI.** 
To generate an HPG for a given (set of) JavaScript file(s), do:
```
$ node engine/cli.js  --lang=js --graphid=graph1 --input=/in/file1.js --input=/in/file2.js --output=$(pwd)/data/out/ --mode=csv

optional arguments:
  --lang: 	language of the input program
  --graphid:  an identifier for the generated HPG
  --input: 	path of the input program(s)
  --output: 	path of the output HPG, must be i
  --mode: 	determines the output format (csv or graphML)

```

**HPG Import CLI.** To import an HPG inside a neo4j graph database (docker instance), do:

```
$ python3 -m hpg_neo4j.hpg_import --rpath=<path-to-the-folder-of-the-csv-files> --id=<xyz> --nodes=<nodes.csv> --edges=<rels.csv>
$ python3 -m hpg_neo4j.hpg_import -h

usage: hpg_import.py [-h] [--rpath P] [--id I] [--nodes N] [--edges E]

This script imports a CSV of a property graph into a neo4j docker database.

optional arguments:
  -h, --help  show this help message and exit
  --rpath P   relative path to the folder containing the graph CSV files inside the `data` directory
  --id I      an identifier for the graph or docker container
  --nodes N   the name of the nodes csv file (default: nodes.csv)
  --edges E   the name of the relations csv file (default: rels.csv)

```

**HPG Construction and Import CLI (v1).** In order to create a property graph and import it to an active neo4j database, you can use the following command:

```sh
$ python3 -m hpg_construction.api <path> --js=<program.js> --import=<bool> --hybrid=<bool> --reqs=<requests.out> --evts=<events.out> --cookies=<cookies.pkl> --html=<html_snapshot.html>
```

For help regarding the meaning of each option in the above command, please use the help CLI provided with the graph construction API:
```sh
$ python3 -m hpg_construction.api -h
```


## Basic Queries
Once the HPG graph is built and imported into a neo4j database, you can run queries over it.
For this purpose, you can use the `hpg_neo4j` module:

```python
def query_active_hpg():
    try:
	# set a timeout for the query
	with utilityModule.Timeout(30*60): # 30 x 60 seconds = 30 min 
	    # query the graph
	    query_results = neo4jDatabaseUtilityModule.exec_fn_within_transaction(my_query_function)
	    # process the query results here
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
