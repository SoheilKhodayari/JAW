# Installation


## Quick Start

Install the dependencies via:
```bash
$ ./install.sh
```


## Step-by-Step Guide (Debugging Purpose)

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


**2- Setup Neo4j.**

This prototype has been tested with `Neo4j 3.5.9`, and `Neo4j 4.2.3` community edition.

**Option 1: Using JAW with Neo4j in Docker**
In this case, you only need docker. No further installation is required. 
Please see [here](docs/neo4j-docker.md) for information on how to use JAW with neo4j running inside docker.

**Option 2: Installing in Host Machine.**

You can download neo4j from the [neo4j download center](https://neo4j.com/download-center/#community).
You can also install it, among others, via `apt-get` or `homebrew`. For example:

```sh
$ cd installation
$ # for linux, neo4j 3.5.x
$ ./linux_neo4j_installation.sh
$ # for macos, neo4j 3.5.x
$ ./macos_neo4j_installation.sh
```

If you encountered any errors, please checkout the [Neo4j Debian Packages](https://debian.neo4j.com/) repository for potential changes.  

For more information, see [here](https://www.alibabacloud.com/blog/installing-neo4j-on-ubuntu-16-04_594570), or [here](https://neo4j.com/developer/kb/using-apt-get-to-download-a-specific-neo4j-debian-package/).


**Note:** the graph import commands and database activation may slightly differ across neo4j versions. 
If you want to use another version of neo4j, you may need to change the graph import command (i.e., `NEO4J_IMPORT_COMMAND`), as well as the database activation logic (i.e., `dbms.active_database`) in `API_neo4j_prepare` function of `hpg_neo4j/db_utility` package.


**3- Set the intitial Neo4j Password.**

By default, the password should be set as `root` for the user `neo4j`.
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



