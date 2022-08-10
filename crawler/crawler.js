
/**
 * ------------------------------------------------
 *   			third-party imports
 * ------------------------------------------------
**/
const puppeteer = require('puppeteer');
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");

// https://github.com/beautify-web/js-beautify
const js_beautify = require('js-beautify').js;
const elapsed = require("elapsed-time-logger");
var psl = require('psl');
const { URL } = require('url');

/**
 * ------------------------------------------------
 *  			constants and globals
 * ------------------------------------------------
**/

// directory where the data of the crawling will be saved

const BASE_DIR = pathModule.resolve(__dirname, '..')
const dataStorageDirectory = pathModule.join(BASE_DIR, 'data');

// maximum number of URLs to be tested per website by default
// this default number can be overridden in the input config.yaml file
var maxVisitedUrls = 100;

// when true, nodejs will log the current step for each webpage to the console 
const DEBUG = true; 		

// when true, nodejs will log the browser console logs to the console as they arrive
const BROWSER_LOG = false; 	


// additional data that the crawler should store 
const COLLECT_AND_CREATE_PAGE = true;
const COLLECT_REQUESTS = true;
const COLLECT_WEB_STORAGE = true;
const COLLECT_COOKIES = true;
const COLLECT_DOM_SNAPSHOT = true;
const COLLECT_SCRIPTS = true;


/**
 * ------------------------------------------------
 *  			utility functions
 * ------------------------------------------------
**/


/** 
 * @function readFile 
 * @param file_path_name: absolute path of a file.
 * @return the text content of the given file if it exists, otherwise -1.
**/
function readFile(file_path_name){
	try {
		const data = fs.readFileSync(file_path_name, 'utf8')
		return data;
	} catch (err) {
		// console.error(err)
		return -1;
	}
}




const stringIsAValidUrl = (s, protocols) => {
    try {
        url = new URL(s);
        return protocols
            ? url.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(url.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};


function checkIfEmailInString(text) { 
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
}

function isValid(link){
	if(link.startsWith('mailto:')){
		return false
	}
	// if(checkIfEmailInString(link)){
	// 	return false
	// }

	return stringIsAValidUrl(link);
}


/** 
 * @function getNameFromURL 
 * @param url: eTLD+1 domain name
 * @return converts the url to a string name suitable for a directory by removing the colon and slash symbols
**/
function getNameFromURL(url){
	return url.replace(/\:/g, '-').replace(/\//g, '');
}


/** 
 * @function hashURL 
 * @param url: string
 * @return returns the SHA256 hash of the given input in hexa-decimal format
**/
function hashURL(url){
	const hash = crypto.createHash('sha256').update(url, 'utf8').digest('hex');
	return hash;
}


/** 
 * @function getOrCreateDataDirectoryForWebsite 
 * @param url: string
 * @return creates a directory to store the data of the input url and returns the directory name.
**/
function getOrCreateDataDirectoryForWebsite(url){
	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
	return folderPath;
}


function directoryExists(url){

	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(fs.existsSync(folderPath)){
		return true;
	}
	else{
		return false;
	}

}

/** 
 * @function savePageData 
 * @param url: string
 * @param html: string
 * @param scripts: list
 * @param dataDirectory: string of the base directory to store the data for the current website.
 * @return stores the input webpage data and returns the absolute folder name where the data is saved.
**/
function savePageData(url, html, scripts, cookies, webStorageData, httpRequests, dataDirectory){


	DEBUG && console.log("[IO] started saving webpage.")

	const webpageFolderName = hashURL(url);
	const webpageFolder = pathModule.join(dataDirectory, webpageFolderName);


	// append url in urls.out in the website-specific directory
	fs.appendFileSync(pathModule.join(dataDirectory, "urls.out"), url + '\n');

	// collect the webpage data
	if(COLLECT_AND_CREATE_PAGE){


		if(!fs.existsSync(webpageFolder)){
			fs.mkdirSync(webpageFolder);
		}

		// store url in url.out in the webpage-specific directory
		fs.writeFileSync(pathModule.join(webpageFolder, "url.out"), url);


		COLLECT_DOM_SNAPSHOT && fs.writeFileSync(pathModule.join(webpageFolder, "index.html"), '' + html);

		if(COLLECT_SCRIPTS){
			scripts.forEach((s, i)=> {
				fs.writeFileSync(pathModule.join(webpageFolder, `${i}.js`), '' + s.source);
			});
		}

		COLLECT_COOKIES     && fs.writeFileSync(pathModule.join(webpageFolder, "cookies.json"), JSON.stringify(cookies, null, 4));
		COLLECT_WEB_STORAGE && fs.writeFileSync(pathModule.join(webpageFolder, "webstorage.json"), JSON.stringify(webStorageData, null, 4));
		COLLECT_REQUESTS && fs.writeFileSync(pathModule.join(webpageFolder, "requests.json"), JSON.stringify(httpRequests, null, 4));

		DEBUG && console.log("[IO] finished saving webpage.");

	}


	return webpageFolder;
}


/** 
 * @function getSourceFromScriptId 
 * @param session: chrome dev tools protocol (CDP) session.
 * @param scriptId: script id given by the CDP.
 * @return returns the script content of a given script id in a CDP session.
**/
async function getSourceFromScriptId(session, scriptId) {

	try{
		let res =  await session.send('Debugger.getScriptSource', {scriptId: scriptId});
		let script_content = res.scriptSource;
		let beautified_script_content = js_beautify(script_content, { indent_size: 2, space_in_empty_paren: true });
		return beautified_script_content;
	}catch{
		// Protocol error (Debugger.getScriptSource): No script for id: <ID>
		return ""
	}
}



/**
 * ------------------------------------------------
 *  			Main Crawler Thread
 * ------------------------------------------------
**/


async function crawlWebsite(browser, url, domain, frontier, dataDirectory, debug_run, wait_before_next_url){



	let scripts = [];
	let page = await browser.newPage();
	var closePage= true;
	
	/**
	* Disable Content-Security Policy (CSP) to avoid breaking when adding cross-domain scripts 
	* https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetbypasscspenabled
	*/
	await page.setBypassCSP(true);

	await page.setViewport({ width: 1366, height: 768});
	let CDPsession = await page.target().createCDPSession();
	let finished = false;
	await CDPsession.send('Debugger.enable');
	await CDPsession.send('Runtime.enable');

	await CDPsession.on('Debugger.scriptParsed', async (event) => {

		if(!finished && event.url !== '__puppeteer_evaluation_script__'){
			scripts.push({
				scriptId: event.scriptId,
				url: event.url,
				executionContextId: event.executionContextId,
				source: await getSourceFromScriptId(CDPsession, event.scriptId)
			});
		}

	});


	// set the request interception to true and collect the HTTP requests
	let httpRequests = [];
	await page.setRequestInterception(true);
	page.on('request', (request) => {

		let requestUrl = request.url();
		// filter out data:image urls
		if (!requestUrl.startsWith('data:image')){
			httpRequests.push(requestUrl);
		}
		request.continue();
	});

	try{
		DEBUG && console.log('[pageLoad] loading new URL: ' + url);
		await page.goto(url, {waitUntil: 'networkidle0'}); // or waitUntil: load
		// await page.waitForTimeout(10000); 
		DEBUG && console.log('[pageLoadCompleted] new page loaded successfully (networkidle0)');

		// redirect puppeteer console log in the browser to node js log
		BROWSER_LOG && page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));


		frontier.visited.push(url);
		frontier.unvisited = frontier.unvisited.filter(e => e !== url); // remove visited url from unvisited list

		/*
		*  ----------------------------------------------
		*  [START] Saving Web Page Data 
		*  ----------------------------------------------
		*  0: Store the HTML snapshot
		*  1: Store each script
		*
		*  @note: relevant resources for storing webpages
		*    - https://github.com/puppeteer/puppeteer/issues/2433
		*    - https://github.com/microsoft/playwright/issues/592
		*    - https://github.com/markusmobius/nodeSavePageWE
		*    - https://github.com/puppeteer/puppeteer/issues/1820
		*/


		let html = await page.content();
		finished = true; // lock scripts for saving


		// web storage data
		let webStorageData = await page.evaluate( () => {
			
			function getWebStorageData() {
			    let storage = {};
			    let keys = Object.keys(window.localStorage);
			    let i = keys.length;
			    while ( i-- ) {
			        storage[keys[i]] = window.localStorage.getItem(keys[i]);
			    }
			    return storage;
			}

			// let webStorageData = window.localStorage;
			let webStorageData = getWebStorageData();
			return webStorageData;
		});
		DEBUG && console.log("webStorageData", webStorageData);

		// cookies, list of JS objects
		let cookies = await page.cookies(); 


		// save the collected data 
		const webpageFolder = await savePageData(url, html, scripts, cookies, webStorageData, httpRequests, dataDirectory);




		/** 
		* @warning
		* We need to prevent auto navigation / auto page refresh 
		* during the vulnerability detection process. This is because we force execute
		* the Iroh's instrumentation engine and webpage's instrumented scripts, and store the  
		* internal processing results within page JS variable. If the page get's reloaded, 
		* these JS variables will become undefined for the next processing steps during the
		* vulnerability detection, which in turn can produce false negative results.
		* 
		* To workaround this issue, we cancel the navigation / page refresh 
		* everytime the `beforeunload` event fires.
		* Thanks to: https://stackoverflow.com/questions/821011/prevent-a-webpage-from-navigating-away-using-javascript 
		*/
		await page.evaluate( () => {
			window.addEventListener('beforeunload', (event) => {
				// cancel the event as stated by the standard.
				event.preventDefault();
				// chrome requires returnValue to be set.
				event.returnValue = 'puppeteer: locking auto-page refresh for DOMC testing.';
				return "";
			});
		})


		DEBUG && console.log('[Crawler] collecting webpage URLs.');
		// fetch new urls here and reinvoke this function
		let hrefs = await page.$$eval('a', as => as.map(a => a.href));
		for(let href of hrefs){

			// check if href belong to the same eTLD+1 / domain
			// see: https://www.npmjs.com/package/psl
			if(href.includes(domain) && isValid(href)){

				// add if href does not exist already
				if(frontier.all.indexOf(href) === -1){
					frontier.all.push(href);
				}
				if(frontier.unvisited.indexOf(href) === -1){
					frontier.unvisited.push(href);
				}

			}
		}
	} catch{
		try{
			// close the previous browser
			await browser.close()
		}catch{
			// PASS
		}
		browser = await launch_puppeteer(true);
		closePage = false
	}

	frontier.visited.push(url);
	frontier.unvisited = frontier.unvisited.filter(e => e !== url); // remove visited url from unvisited list

	/*
	*  ------------------------------------
	*  Next URL and Termination Criteria 
	*  ------------------------------------
	*/

	DEBUG && console.log('[Crawler] moving to the next URL.');
	await page.waitForTimeout(wait_before_next_url);
	if(closePage){
		await page.close();
	}
	


	// terminate if this was only a debug run to test a single URL
	if(debug_run) {
		console.log('[Crawler] this is a debug run, thus stopping!')
		return browser;
	}

	// termination criteria
	if(frontier.visited.length >= maxVisitedUrls){
		console.log('[Crawler] max urls visited, thus stopping!')
		return browser;
	}

	if(frontier.unvisited.length === 0){
		console.log('[Crawler] frontier is empty, thus stopping!')
		return browser;
	}

	// pick a new url randomly such that it is not visited before
	let nextURL = await frontier.unvisited[Math.floor(Math.random()*frontier.unvisited.length)];

	// recurse
	return await crawlWebsite(browser, nextURL, domain, frontier, dataDirectory, false, 0);

}


async function launch_puppeteer(headless_mode){

	var browser = await puppeteer.launch({
		headless: headless_mode,
		// defaultViewport: null,
		args: ["--disable-setuid-sandbox", '--no-sandbox'],
		'ignoreHTTPSErrors': true
	});
	return browser;	
}

/*
* entry point of crawler
*/
(async function(){

    const processArgv = argv(process.argv.slice(2));
    const config = processArgv({}) || {};
    const url = config.seedurl;

    if(config.maxurls){
    	maxVisitedUrls = config.maxurls;
    }
    const headless_mode = (config.headless && config.headless.toLowerCase() === 'false')? false: true;
	const debug_run = false;
	const wait_before_next_url = 0; // 5 * 60000; // wait 5 minutes


	if(directoryExists(url)){
		DEBUG && console.log('site already crawled: '+ url);
		return 1;
	}

	/** 
	* @note
	* To add support for other browsers via browser stack, change the 
	* below puppeteer initialization config. 
	* For documentation on browser stack, see here:
	* https://www.browserstack.com/docs/automate/puppeteer/local-testing
	*/

	var browser = await launch_puppeteer(headless_mode)

	var frontier = {
		'all': [url],
		'visited': [],
		'unvisited': [url],
	}
	const dataDirectory = getOrCreateDataDirectoryForWebsite(url);

	const globalTimer = elapsed.start('global_crawling_timer');

	// use public suffix list to restrict crawled urls to the same domain 
	var domain = psl.get(url.replace('https://', '').replace('http://', ''));
	browser = await crawlWebsite(browser, url, domain, frontier, dataDirectory, debug_run, wait_before_next_url);

	const globalTime = globalTimer.get();
	globalTimer.end();

	// store elapsed time to disk
	fs.writeFileSync(pathModule.join(dataDirectory, "time.crawling.out"), JSON.stringify({
		"crawling_time": globalTime,
	}));


	const urls = await readFile(pathModule.join(dataDirectory, "urls.out"))

	if(urls !== -1){
			let hashes = {};
			urls.split('\n').forEach(u=>{
				if(u.trim() !== ''){
					hashes[u]= hashURL(u);
				}
				
			});
			fs.writeFileSync(pathModule.join(dataDirectory, "urls.hashes.out"), JSON.stringify(hashes));
	}
	

	await browser.close();


})();
