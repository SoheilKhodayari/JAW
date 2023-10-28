# ineo

[![Join the chat at https://gitter.im/cohesivestack/ineo](https://badges.gitter.im/cohesivestack/ineo.svg)](https://gitter.im/cohesivestack/ineo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![License](https://img.shields.io/github/license/cohesivestack/ineo.svg?style=flat)](https://img.shields.io/github/license/cohesivestack/ineo.svg?style=flat)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/cohesivestack/ineo.svg?style=flat)]((https://img.shields.io/github/languages/code-size/cohesivestack/ineo.svg?style=flat))

A simple but useful Neo4j instance manager.

Neo4j is a great graph database, however its architecture was designed to work with just one database for each Neo4j server instance. This issue could be a problem when we are developing an application with an environment for testing and developing, or just when we are creating or serving two or more applications.

Ineo figure out this issue allowing to manage different Neo4j instances on different ports.

## Requirements

* **Bash**. Installed by default on OS X and Ubuntu
* **Curl**. Installed by default on OS X and Ubuntu
* **Java**. In order to start the Neo4j server

## Installation

Please check [releases](https://github.com/cohesivestack/ineo/releases) for the [latest version](https://github.com/cohesivestack/ineo/releases/latest) available.

1. Execute the line below on your terminal:

   ```
   curl -sSL https://raw.githubusercontent.com/cohesivestack/ineo/v2.1.0/ineo | bash -s install
   ```

2. Restart your terminal or execute the line below to set proper environment:

    ```
    source ~/.bashrc
    ```

## How to use

### Create an instance

Imagine that you need a database for an application called *my_db*:

```
$ ineo create my_db

  The instance my_db was created successfully
```

### Show instance information

Show the information about the recently instance created:

```
$ ineo instances

  > instance 'my_db'
    VERSION: 3.5.16
    EDITION: community
    PATH:    /home_path/.ineo/instances/my_db
    PORT:    7474
    HTTPS:   7475
    BOLT:    7476
```

Ineo downloaded the last available version of Neo4j and created an instance database ready to use on port 7474 and 7475 for SSL or bolt port 7476.

### Start instance

Start the database instance for using

```
$ ineo start my_db

  start 'my_db'
  Active database: graph.db
Directories in use:
  home:         /home_path/.ineo/instances/my_db
  config:       /home_path/.ineo/instances/my_db/conf
  logs:         /home_path/.ineo/instances/my_db/logs
  plugins:      /home_path/.ineo/instances/my_db/plugins
  import:       /home_path/.ineo/instances/my_db/import
  data:         /home_path/.ineo/instances/my_db/data
  certificates: /home_path/.ineo/instances/my_db/certificates
  run:          /home_path/.ineo/instances/my_db/run
Starting Neo4j.
Started neo4j (pid 12345). It is available at http://0.0.0.0:7474/
There may be a short delay until the server is ready.
See /home_path/.ineo/instances/my_db/logs/neo4j.log for current status.
```

### Show instance status

Show the status of the database instance

```
$ ineo status my_db

  status 'my_db'
  Neo4j is running at pid 12345
```

### Stop instance

Stop the database instance

```
$ ineo stop my_db

  stop 'my_db'
  Stopping Neo4j.. stopped
```

### Restart instance

It's also possible to restart a database instance

```
$ ineo restart my_db
```

## Using with multiple instances

The main objetive of Ineo is managing different Neo4j instances.

### Create an instance with a specific port

Imagine that you want to create an instance for testing. This should be created with another http port, so both instances can be running simultaneously.

```
$ ineo create -p8486 my_db_test

  The instance my_db_test was successfully created.
```

Now, when you show the information about instances, you see:

```
$ ineo instances

  > instance 'my_db'
    VERSION: 3.5.16
    EDITION: community
    PATH:    /home_path/.ineo/instances/my_db
    PORT:    7474
    HTTPS:   7475
    BOLT:    7476

  > instance 'my_db_test'
    VERSION: 3.5.16
    EDITION: community
    PATH:    /home_path/.ineo/instances/my_db_test
    PORT:    8486
    HTTPS:   8487
    BOLT:    8488

```

### Start multiple instances

All instances can be started using the command `start` without an instance name.

```
$ ineo start

  Warning -> A Neo4j instance name is not specified.

  Are you sure you want to start all instances? (y/n) y


  start 'my_db'
  Active database: graph.db
Directories in use:
  home:         /home_path.ineo/instances/my_db
  config:       /home_path.ineo/instances/my_db/conf
  logs:         /home_path.ineo/instances/my_db/logs
  plugins:      /home_path.ineo/instances/my_db/plugins
  import:       /home_path.ineo/instances/my_db/import
  data:         /home_path.ineo/instances/my_db/data
  certificates: /home_path.ineo/instances/my_db/certificates
  run:          /home_path.ineo/instances/my_db/run
Starting Neo4j.
Started neo4j (pid 12345). It is available at http://0.0.0.0:7474/
There may be a short delay until the server is ready.
See /home_path.ineo/instances/my_db/logs/neo4j.log for current status.

  start 'my_db_test'
  Active database: graph.db
Directories in use:
  home:         /home_path.ineo/instances/my_db_test
  config:       /home_path.ineo/instances/my_db_test/conf
  logs:         /home_path.ineo/instances/my_db_test/logs
  plugins:      /home_path.ineo/instances/my_db_test/plugins
  import:       /home_path.ineo/instances/my_db_test/import
  data:         /home_path.ineo/instances/my_db_test/data
  certificates: /home_path.ineo/instances/my_db_test/certificates
  run:          /home_path.ineo/instances/my_db_test/run
Starting Neo4j.
Started neo4j (pid 23456). It is available at http://0.0.0.0:8486/
There may be a short delay until the server is ready.
See /home_path.ineo/instances/my_db_test/logs/neo4j.log for current status.
```

### Show status for multiple instances

It's possible to show the status of all instances using the command `stop` without instance name.

```
$ ineo status

  status 'my_db'
  Neo4j is running at pid 12345

  status 'my_db_test'
  Neo4j is running at pid 23456
```

### Stop multiple instances

All instances can be stopped using the command `stop` without instance name.

```
$ ineo stop

  Warning -> A Neo4j instance name is not specified.

  Are you sure you want to stop all instances? (y/n) y


  stop 'my_db'
  Stopping Neo4j.. stopped

  stop 'my_db_test'
  Stopping Neo4j.. stopped
```

### Restart multiple instance

It's also possible to restart multiple instances using the command `restart` without instance name.

```
$ ineo restart
```

### Changing the port

You can change the port to a specific instance.

```
$ ineo set-port my_db 9494
```

The SSL port as well.

```
$ ineo set-port -s my_db 9495
```

Or the bolt port if you like.

```
$ ineo set-port -b my_db 9496
```

## Installing a specific version

The command `create` always uses the latest Neo4j version your current Ineo version was tested with. However, it is possible to specify another version using the option `-v`

```
ineo create -v 3.2.0 my_db
```

### The command versions

The command `versions` shows all Neo4j versions available for installing.

```
$ ineo versions
```

## The command install

There is a command to install Ineo. Use this command only if you don't have already installed Ineo.

```
$ ineo install
```

If you happen to use an OS with systemd support, you can also add Ineo as a systemd service to automatically start up you instances on boot.

```
$ ineo install -S
```

### Installing in a specific directory

Ineo is installed in `$HOME/.ineo` by default, however, it is possible to specify another directory using the option `-d`.

```
$ ineo install -d ~/.ineo-custom-path
```

If you are installing from curl:

```
$ curl -sSL https://raw.githubusercontent.com/cohesivestack/ineo/v2.1.0/ineo | bash -s install -d ~/.ineo-custom-path
```

## Help and other commands

Just typing `ineo` shows you a brief description of every Ineo command.

```
$ ineo help

  USAGE:
    ineo <command> [options] [<arguments>]

  COMMANDS:

    create          Create a new instance with a specific <name>
    set-port        Change the port of a specific instance <name>
    versions        Show the Neo4j versions available for installation
    list            List information about installed instances

    start           Start Neo4j instances
    stop            Stop Neo4j instances
    restart         Restart Neo4j instances
    status          Show instances status
    shell           Start the shell for a Neo4j instance
    console         Start a Neo4j instance in mode console

    backup          Backup a specific database <name>
    restore         Restore a specific database <name>

    set-config      Change settings in configuration file
    get-config      Read settings from configuration file

    delete-db       Delete all data of a specific instance <name>
    destroy         Remove a specific instance <name>

    install         Install ineo
    update          Update ineo
    uninstall       Uninstall ineo

    help            Show this help or help for specific [command]
```

### Help for a specific command

Using `ineo help [command]` you can get the help for a specific command:

```
$ ineo help start

  USAGE:
    start [options] [instance_names ...]

  DESCRIPTION:
    Start one or more Neo4j instances

  ARGUMENTS:
    [instance_names ...]  Name of one or more instances to start (optional)

                          If this argument is not specified then ineo tries
                          to start all created instances

  OPTIONS:
    -q    Start the instances without confirmation
```
