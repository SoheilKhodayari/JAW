# Setup

## Prerequisites
Please install the following dependencies before proceeding to the installation step:
- latest version of `npm package manager` (node js)
- any stable version of `python 3.x`
- python `pip` package manager


## Installation

Below is the quick installation guide. Please see [here](installation.md) for `detailed` installation instructions. 

### Step 1: Installing Python/NodeJS Dependencies
In the project root directory, run:
```sh
$ cd installation
$ ./install_dependencies.sh
```

### Step 2: Setup Neo4j 

This prototype has been tested with `Neo4j 3.5.9`, and `Neo4j 4.2.3` community edition.

**Option 1: Using JAW with Neo4j in Docker**
Please see [here](docs/neo4j-docker.md) for information on how to use JAW with neo4j running inside docker.

**Option 2: Installing in Host Machine.**

You can download `Neo4j 3.5.9`, or `Neo4j 4.2.3`  from the [neo4j download center](https://neo4j.com/download-center/#community).
You can also install it, among others, via `apt-get` or `homebrew`. For example:

```sh
$ cd installation
$ # for linux, neo4j 3.5.x
$ ./linux_neo4j_installation.sh
$ # for macos, neo4j 3.5.x
$ ./macos_neo4j_installation.sh
```

Then, copy the `example.env`  and rename it to `.env`.
- Set your operating system:
	- `PLATFORM=linux`
	- `PLATFORM=macos`

**Note** By default, the neo4j password should be set as `root` for the user `neo4j`. If you set any other password, you also need to change it in `constants.py`.
```sh
$ neo4j-admin set-initial-password root
```

