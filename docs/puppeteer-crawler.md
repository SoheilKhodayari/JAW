# Puppeteer Crawler

JAW features a JavaScript-enabled crawler leveraging [Puppeteer](https://github.com/puppeteer/puppeteer) and [Chrome DevTools Protocol (CDP)](https://chromedevtools.github.io/devtools-protocol/). 

The crawler visitsthe webpages following a depth-first strategy, and stops when it doesn’t find new URLs, or a maximum of URLs is reached.
During the visit, it collects, the URLs, the scripts as they are parsed by the browser via CDP, and the snapshot of the HTML webpage, among others.


## CLI Usage 

To start the crawler, do:

```bash
$ node crawler.js --seedurl=https://google.com --maxurls=100 --browser=chrome --headless=true
```


## Crawler Configuration

- `seedurl`:

  Specifies the seed URL for the crawler.

- `maxurls`*:

  Specifies the termination criteria, i.e., the maximum number of URLs to visit

- `browser`*:
 
  Specifies the browser to use. The only option is `chrome` at the moment.

- `headless`:

  Specifies whether the browser should be instantiated in `headless` mode.
