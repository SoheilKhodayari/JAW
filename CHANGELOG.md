# Change Log 

This document shows a summarized version of the changes. Detailed information can be fetched via the following command:

```bash
$ git log --pretty="- %s" > CHANGELOG.md
```


## Version 2.0.0

- `[[ crawler ]]` new Puppeteer-based crawler with Chrome CDP
- `[[ engine ]]` improved static analysis engine, code structure, and cli
- `[[ domclobbering ]]` support for DOM Clobbering vulnerabilities
- `[[ cs-csrf ]]` new JS-based interface
- `[[ dynamic ]]` support for dynamic forced execution of data flows
- `[[ cli ]]` new CLI for code analysis, hpg construction and importing
- `[[ docs ]]` updated documentation with the new structure


## Version 1.1.0

- `[[ docs ]]` updated documentation - using neo4j with docker and installation scripts
- `[[ neo4j ]]` issue # 1: added support for neo4j 4.x both with and without docker
- `[[ cs-csrf ]]` re-structure analysis and unit-tests
- `[[ hpg crawler ]]` dockerized chrome + selenium crawler.
- `[[ unit-tests ]]` updated unit test chain for client-side CSRF
- `[[ hpg construction ]]` added delay and timeout to flush async graph data or forcefully terminate node process
- `[[ esgraph library ]]` fix breakage on certain TryStatement nodes