# Web Crawlers of JAW

JAW includes two JavaScript-enabled, chrome-based web crawlers. This Wiki describes the input of the crawler, configuration options, and its outputs.

The [crawler folder](https://github.com/SoheilKhodayari/JAW/tree/master/crawler) in the root directory contains the source code for the web crawlers of JAW. As of now, JAW supports the following:

- [x] a puppetter-based crawler enhanced with ChromeDevTools Protocol (CDP) 
- [x] a selenium based crawler enhanced with custom Chrome extensions 


## CLI Usage (Puppeteer)

To start the crawler, do:

```bash
$ node crawler.js --seedurl=https://google.com --maxurls=100 --browser=chrome --headless=true
```

Please see [here](https://github.com/SoheilKhodayari/JAW/tree/master/docs/puppeteer-crawler.md) for more information.


## CLI Usage (Selenium)

If you want to crawl a particular site:
```bash
$ python3 hpg_crawler/driver.py <site-id>
```

If you want to crawl a range of websites:
```bash
$ python3 hpg_crawler/driver.py <from-site-id> <to-site-id>
```

**Running with Docker:** Specify which website you want to crawl in `docker-compose.yml` under the `command` field. Then, you can spawn an instance of the crawler by:
```bash
$ ./run.docker.sh
```

For more information, please refer to the documentation of the `hpg_crawler` [here]([https://github.com/SoheilKhodayari/JAW/tree/master/docs/hpg-crawler.md).

