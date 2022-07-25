# HPG Crawler

## Inputs

The crawler takes as inputs the list of sites to test, and a state script for each web site. 

**Testbed.** The list of input sites are specified in `hpg_crawler/sites/sitemap.py`. Each site is assigned a id and a name.

**Login State.** The state script loads different user states inside the browser (e.g., login as user1, login as user2, etc). The state script of each file must be placed inside `hpg_crawler/sites/<site-id>` where `<site-id>` is the id specified in `hpg_crawler/sites/sitemap.py`.

**Template.**
A template/example state script is provided in `hpg_crawler/sites/template/Auth.py`.
If you do not want to load any user states before the crawling session, disable this option (set the `USE_STATE_SCRIPTS` in the crawler configuration to false).


### Inputs Configuration

JAW can crawl and collect the web resources for a given set of web applications.
The inputs to the tool are thus a list of sites' `seed URLs`, and an optional `test case` or `state` script for each site under test.

**Action 1:** Specify the set of sites for testing by adding new entries in the `SITES_MAP` dictionary in `hpg_crawler/sites/sitemap.py`.
As shown below, you should assign each site an **integer** id, a name, and a seed URL.


```
SITES_MAP = {
  '1': ('example-name-1', 'https://example1.com', ),
  '2': ('example-name-2', 'https://example2.com', ),
}
```

**Action 2 (Optional):** For each site specified, you can input a custom `test case` or `state` script that gives instructions to the crawler to reach a certain state of the application (e.g., logged in) before the crawling session starts.

- To create a new `state` script for a site, copy the `sites/template` folder and rename it to `sites/<site-id>` where `<site-id>` is the id you set in `sitemap.py` for that site, e.g., `sites/1`.
- Add your `selenium-based` state functions in `sites/<SITE_ID>/scripts/Auth.py` for the target site. See the example `Auth.py` file for more information.



## Running Without Docker

If you want to crawl a particular site:
```bash
$ python3 crawler/hpg_crawler/driver.py <site-id>
```

Alternatively, you can run the crawler for a list of sites, i.e., from an integer `<start-site-id>` to the integer `<end-site-id>` (inclusive), according to the integer id values specified in `hpg_crawler/sites/sitemap.py`. Thus, you can run:
```sh
$ python3 crawler/hpg_crawler/driver.py <start-site-id> <end-site-id>
``` 
For example, `python3 crawler/hpg_crawler/driver.py 1 5` crawls websites with id one to five from `hpg_crawler/sites/sitemap.py`.




## Running With Docker

Specify which website you want to crawl in `docker-compose.yml` under the `command` field:
```bash
version: "3.3"
   
services:
  crawler:
    tty: true
    restart: always
    container_name: hpg_crawler
    build: 
      context: ./../ 
      dockerfile: ./hpg_crawler/crawling.Dockerfile
    command: python hpg_crawler/driver.py 1
    volumes:
      - ./../:/hpg_base

```

Then, you can spawn an instance of the crawler by:
```bash
$ ./run.docker.sh
```



## Crawler Configuration

- `OUTPUT_DATA_DIRECTORY`:

  Specifies the output directory of the crawler. By default, the data is stored in the `data` folder.

- `PLATFORM`*:

  Specifies the run-time enviornment. Options are `linux` or `macos`.

- `CHROME_DRIVER`*:
 
  Specifies the path for the chrome selenium driver.

- `USE_STATE_SCRIPTS`:

  Specifies whether the crawler should load a specific session state (e.g., login) inside the web browser using an input script.

- `STATES_SCRIPT_FILE_NAME`:

  Specifies the name of the input state script file.

- `DRIVER_WAIT_TIME_AFTER_STATE_LOAD`:

  Specifies the amount of time (in mili-seconds) for the crawler to wait after the input state script is executed (e.g., logged in).

- `PAGE_LOAD_WAIT_TIME_DEFAULT`:
  
  Specifies the amount of time that the crawler waits in each web page that it finds (so that the JS is executed) before visiting another web page

- `SAVE_NAVIGATION_GRAPH`:

  Specifies whether the crawler should save a navigation graph.

- `NAVIGATION_GRAPH_SAVE_FILE_NAME`:

  Specifies the name of the crawler navigation graph.


- `MAX_CRAWLING_URLS_DEFAULT`:

  This option allows the crawler to terminate when it had found a specified number of URLs set in this option.

- `TIMEOUT_BUCKET_DEFAULT`:

  Specifies the allocated time budget for the crawler (in minutes) after which it must terminate.

- `MAX_CRAWLING_DEPTH_DEFAULT`:

  maximum crawling depth in breath-first traversal of IDDFS.

- `MAX_FOLLOWED_URLS_PER_DEPTH_DEFAULT`:

  maximum number of urls to be followed per depth (randomly chosen).


(*) specifies that the item needs to be correctly configured based on the run-time enviornment.


## Output

By default, the crawled data is stored in the `data/outputs` folder. The data of each site is in a folder named `<site-id>` where <site-id> is specified in the input file `hpg_crawler/sites/sitemap.py`. For each URL found, there is a folder corresponding to the SHA256 hash of the URL. Inside each folder, the following files exists:

- `js_program.js`: a single JavaScript file containing the entire custom JavaScript of the web page.
- `navigation_url.out`: contains the URL of the page.
- `events.out`: contains the fired events
- `events_pickle.out`: fired events in the python pickle format (binary).
- `request_logs.out`: the HTTP requests sent 
- `document_props,out`: DOM properties accessible to the JavaScript via the old `document.elementName` API.
- `html_initial.html`: unrendered HTML page (DOM snapshot at t=0)
- `html_rendered.html`: rendered HTML page (DOM snapshot at t=10)
- `scripts` folder contains the list of scripts, and the mapping of the name of the script file to the actual URL of the script
- `libraries` folder contains the code of third-party libraries used detected by `LibraryDetector` module.



