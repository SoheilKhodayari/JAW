# Using JAW with Neo4j Docker Container

You can use JAW without installing and configuring neo4j in your host machine. 
In this case, JAW creates a neo4j docker container and imports the property graph inside the neo4j instance running in the container. 

For more information about using neo4j with docker, please see [here](https://neo4j.com/developer/docker/).

## Usage

To create a neo4j docker container, do:
```python
import time, sys
import docker.neo4j.manage_container as dockerModule
import hpg_neo4j.db_utility as DU

# IMPORTANT: do not change this name.
# currently, neo4j in docker only supports one active database.
# this database is empty and come with the default name `neo4j`.
# JAW imports the target property graph inside this empty database.
database_name = 'neo4j' 

# choose any name for the docker container
container_name = 'neo4j_container_name'

# input can be in CSV or graphML. 
input_mode = 'CSV'

# this is the path of the property graph, e.g., nodes and relationship CSV files
# this path must be relative to the $(pwd)/data/ directory
# because the docker instance can only see files in that directory
# e.g., /data/test_program/test.js
relative_import_path = "test_program"
 
# create the neo4j container
dockerModule.create_neo4j_container(container_name)
time.sleep(5)

# import data inside the container 
dockerModule.import_data_inside_container(container_name, database_name, relative_import_path, 'CSV')


# periodically poll the neo4j container HTTP interface (tcp port 7474) until it accepts driver connections
connection_success = DU.wait_for_neo4j_bolt_connection(timeout=120)
if not connection_success:
	sys.exit(1)

DU.exec_fn_within_transaction(run_queries)


def run_queries(tx):
	# run your cypher queries here
	# tx.run("YOUR QUERY GOES HERE")
	pass

```



## Complete Example

A complete example on how to use JAW with neo4j docker can be found in [analyses/example/example_analysis.py](https://github.com/SoheilKhodayari/JAW/blob/master/analyses/example/example_analysis.py).

You can run the example analysis from the root directory with:
```bash
$ python3 -m analyses.example.example_analysis --input=$(pwd)/data/test_program/test.js

```








