# Bash CLI commands

This documentation contains some useful CLI commands.

### importing a WPG into Neo4j
```sh
$ python3 -m wpg_neo4j.wpg_import.py <path-to-the-folder-of-the-csv-files> --nodes=<nodes.csv> --edges=<rels.csv>
```