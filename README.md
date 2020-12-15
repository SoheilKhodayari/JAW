# JAW

[![Build Status](https://travis-ci.org/boennemann/badges.svg?branch=master)](https://travis-ci.org/boennemann/badges) [![Node](https://img.shields.io/badge/node%40latest-%3E%3D%206.0.0-brightgreen.svg)](https://img.shields.io/badge/node%40latest-%3E%3D%206.0.0-brightgreen.svg) [![Dependency Status](https://david-dm.org/boennemann/badges.svg)](https://david-dm.org/boennemann/badges) [![Platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey.svg)](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey.svg) [![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)


An open-source, prototype implementation of property graphs for javascript based on the [esprima](https://github.com/jquery/esprima/tree/master/src) parser, and the [Mozilla SpiderMonkey Parser API](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API).
This project is licensed under `GNU AFFERO GENERAL PUBLIC LICENSE V3.0`. See [here](LICENSE) for more information.

# Setup

## Prerequisites
Please install the following dependencies before proceeding to the installation step:
- latest version of `npm package manager` (node js)
- any stable version of `python 3.x`
- python `pip` package manager


## Installation

Please follow the steps below in order for an smooth installation process.

### Step 1: Installing Python Dependencies
In the project root directory, run:
```sh
$ pip3 install -r requirements.txt
```

### Step 2: Installing Node Modules
In the project root directory, run:
```sh
$ cd hpg_construction
$ npm install
```
Then:
```sh
$ cd hpg_construction/lib/jaw/dom-points-to
$ npm install
```
Finally:
```sh
$ cd hpg_construction/lib/jaw/normalization
$ npm install
```

### Step 3: Installing Neo4j

**1- Install Java.**

Follow the tutorial [here](https://www.digitalocean.com/community/tutorials/how-to-manually-install-oracle-java-on-a-debian-or-ubuntu-vps) to install the latest version of Java.


**2- Install Neo4j.**

This prototype have been tested with `Neo4j 3.5.9`, community edition.
You can download the `3.5.x` version from the [neo4j download center](https://neo4j.com/download-center/#community).
You can also install it, among others, via `apt-get` or `homebrew`, as shown below.

2.1- Installing for Linux
```sh
$ cd installation
$ chmod +x neo4j_installation.sh
$ ./neo4j_installation.sh
```
For more information, see [here](https://www.alibabacloud.com/blog/installing-neo4j-on-ubuntu-16-04_594570), or [here](https://neo4j.com/developer/kb/using-apt-get-to-download-a-specific-neo4j-debian-package/).

2.2- Installing For MacOS
```sh
$ cd installation
$ brew install ./neo4j.rb
```

**Note:** the graph import commands and database activation may slightly differ across neo4j versions. 
If you want to use another version of neo4j, you need to change the graph import command (i.e., `NEO4J_IMPORT_COMMAND`), as well as the database activation logic (i.e., `dbms.active_database`) in `API_neo4j_prepare` function
of `hpg_neo4j/db_utility` package.


**3- Set the intitial Neo4j Password.**

By default, the password should be set as `root` for the user `neo4j`. If you set any other password, you also need to change it in `constants.py`.
```sh
$ neo4j-admin set-initial-password root
```

**Note**: the default username and password should be `neo4j` and `neo4j`, respectively. But this has to be changed so that neo4j allows `driver connections`. If the above command did not work, try using the `cypher-shell`:

connect to cypher shell via:
```sh
$ cypher-shell -u neo4j -p neo4j
```
then run:
```sh
CALL dbms.changePassword('root');
:exit
```

If you choose a different password, you must set it in `.env` with `NEO4J_PASS=your-password`.


**4- Make sure you can see the followings (uncommented) in your `neo4j.conf` file:**
```
dbms.connector.bolt.enabled=true
dbms.connector.bolt.listen_address=0.0.0.0:7687 
```

### Step 4: Setup Enviornment Variables

Copy the `example.env`  and rename it to `.env`.
- Set your operating system:
	- `PLATFORM=linux`
	- `PLATFORM=macos`
- If you choose a different password than that of step 3, you must set it in `.env` with `NEO4J_PASS=your-password`.

**Note**: you may use the tool in windows. This requires changing the `neo4j` configuration varibles (e.g., NEO4J_CONF) in `constants.py`. In addition, you should change the
`API_neo4j_prepare` function in `main.py` by replacing the `sed` bash command to that of windows (or simply provide a similar copying logic).

### Further Information about Neo4j

Neo4j example DB import synax:
```sh
$ neo4j-admin import --mode=csv --database=graph.db --nodes=nodes.csv --relationships=rels.csv --delimiter='¿'
```
See: [Neo4j import documentation](https://neo4j.com/docs/operations-manual/current/tools/import/) for more!


Environment configuration on OS X:
```sh
$ export NEO4J_HOME="/usr/local/Cellar/neo4j/3.5.9/libexec"
```


# Using JAW in 2 Steps
You can create hpgs, import them into a neo4j database, and query the database as follows:

## Step 1: Graph Construction
In order to create a property graph and import it to an active neo4j database, you can use the following command:

```sh
$ python3 -m hpg_construction.api <path> --js=<program.js> --import=<bool> --hybrid=<bool> --reqs=<requests.out> --evts=<events.out> --cookies=<cookies.pkl> --html=<html_snapshot.html>
```

For help regarding the meaning of each option in the above command, please use the help CLI provided with the graph construction API:
```sh
$ python3 -m hpg_construction.api -h
```

Alternatively, you can use the following two steps. This is especially suited for debugging purposes.

### Building the Graph CSV Files
The javascript analyzer modules creates the `nodes.csv` and `rels.csv` files for analysis (the web property graph).

In the project root directory, try:
```sh
$ node hpg_construction/main.js -js <RELATIVE_PATH_TO_TEST_FILE> -o <OUTPUT_FOLDER_NAME>
```
For example:
```sh
$ node hpg_construction/main.js -js hpg_construction/test-inputs/test.js -o myfolder
```

### Importing into Neo4j

In the project root directory, run:
```sh
$ python3 -m hpg_neo4j.hpg_import <path-to-the-folder-of-the-csv-files> --nodes=nodes.csv --edges=rels.csv
```
Help CLI:
```sh
$ python3 -m hpg_neo4j.hpg_import -h

```

### Step 2: Graph Traversals and Declarative Queries
You can use Cypher Queries or the NeoModel ORM to query the property graph. The NeoModel ORM Schema is defined in `hpg_neo4j/orm.py`.
You should place and run your queries in `hpg_analysis/<ANALYSIS_NAME>`. For further details, see the example query files provided: `example.orm.py` and `example.py` in the `hpg_analysis/example` folder.

```sh
$ python3 -m hpg_analysis.example.example
$ python3 -m hpg_analysis.example.exampleorm  
```


## Graph Traversals and Analysis of Client-side CSRF
This will build the property graph, creates a neo4j database and queries the database. By default, this process
is done for the unit tests specified under `hpg_construction/unit_tests/cs_csrf`. 

**Note**: Please change or set the appropriate run mode in `main.py` for debugging purposes!
```sh
$ python3 -m hpg_analysis.cs_csrf.main
```


# Web Crawling and Websites Under Test (Inputs)
The site inital address and its `state scripts` are **inputs** of the tool. The file `hpg_crawler/sites/sitemap.py` contains the list of sites for testing. 
- Each site is given a `site_id` which specifies the folder name used to store the site `state scripts` (e.g., login as admininstrator, login as user 1, login as user 2, logout, etc). 
- To create a new site entry, copy the `sites/template` and rename it to `sites/<SITE_ID>` where <SITE_ID> is the integer you set in `sitemap.py`.
- Change the template `state script` in `sites/<SITE_ID>/scripts/Auth.py` via your implementaion for your own site.

## How to Run URL Crawler Module?
In order to start the crawler and collect the sites data, run the driver program for data collection module in root directory:
```sh
$ cd hpg_crawler
$ python3 driver.py <site-id>
``` 
For more information about the web crawler of JAW, see [here](docs/crawler.md).


# Detailed Documentation.

For more information, visit our wiki page [here](docs/jaw.md). Below is a table of contents for quick access.

### The Web Crawler of JAW
- [Web Crawler](docs/crawler.md)

### Data Model of Hybrid Property Graphs (PG)
- [Property Graph Nodes](docs/hpg-nodes.md)
- [Grammar and Syntax Tree](docs/syntax-tree.md)
- [Property Graph Edges](docs/hpg-edges.md)

### Graph Construction

- [Building a Property Graph](docs/hpg-building.md)

### Graph Traversals

- [Running Queries Over Property Graphs](docs/hpg-querying.md)


# Contribution and Code Of Conduct
Pull requests are welcomed. Please see the contributor [code of conduct](CODE_OF_CONDUCT.md). 


