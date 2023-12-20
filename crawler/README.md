# Web Crawlers

This folder contains the web crawlers of JAW. Currently, the tool supports the following crawlers:

- [x] a playwright-based crawler based on [Foxhound](https://github.com/SAP/project-foxhound/) (taint-aware)
- [x] a puppetter-based crawler enhanced with ChromeDevTools Protocol (CDP) 
- [x] a selenium based crawler enhanced with custom Chrome extensions 

## CLI Usage (Playwright)

To start the crawler, do:

```bash
$ node crawler-taint.js --seedurl=https://google.com --maxurls=100 --headless=true --foxhoundpath=<foxhound-firefox-executable-path>
```


## CLI Usage (Puppeteer)

To start the crawler, do:

```bash
$ node crawler.js --seedurl=https://google.com --maxurls=100 --browser=chrome --headless=true
```

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

For more information, please refer to the documentation of the `hpg_crawler` [here](https://github.com/SoheilKhodayari/JAW/tree/master/docs/hpg-crawler.md).
