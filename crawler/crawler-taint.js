/**
 * Taint Crawler (JAW + Foxhound)
 * ------------------------------
 * Running:
 * $ node crawler-taint.js --seedurl=https://google.com --maxurls=100 --headless=true --foxhoundpath=<foxhound-firefox-executable-path>
 */

/**
 * ------------------------------------------------
 *              third-party imports
 * ------------------------------------------------
**/
const { firefox, chromium } = require('playwright');  // Or 'firefox' or 'webkit'.
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");


/**
 * js_beautify
 * @link https://github.com/beautify-web/js-beautify
 */
// const js_beautify = require('js-beautify').js;

/**
 * js_beautify + sourcemap
 * @link https://www.npmjs.com/package/js-beautify-sourcemap
 */
var js_beautify = require('js-beautify-sourcemap');


const elapsed = require("elapsed-time-logger");
var psl = require('psl');
const { URL } = require('url');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

/**
 * ------------------------------------------------
 *              constants and globals
 * ------------------------------------------------
**/


var foxhound_executable_path = '';
var should_use_foxhound = true;

const number_of_reloads = 2;

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

const TAINT_LOG = false;

// additional data that the crawler should store 
const COLLECT_WEBPAGE = true;
const COLLECT_REQUESTS = true;
const COLLECT_RESPONSE_HEADERS = true; 
const COLLECT_WEB_STORAGE = true;
const COLLECT_COOKIES = true;
const COLLECT_DOM_SNAPSHOT = true;
const COLLECT_SCRIPTS = true;
const TAINT_FLOWS = true;

// TODO: collect service worker javascript files?
// const COLLECT_SERVICE_WORKERS = true;


// valid script types for javascript
const SCRIPT_MIME_TYPES_FOR_JS = [      
	"text/javascript",
	"application/javascript",
	"application/ecmascript",
	"application/x-ecmascript",
	"application/x-javascript",
	"text/ecmascript",
	"text/javascript1.0",
	"text/javascript1.1",
	"text/javascript1.2",
	"text/javascript1.3",
	"text/javascript1.4",
	"text/javascript1.5",
	"text/jscript",
	"text/livescript",
	"text/x-ecmascript",
	"text/x-javascript"]

const TYPE_SCRIPT_EXTERNAL = 'external';
const TYPE_SCRIPT_INTERNAL = 'inline';

/**
 * ------------------------------------------------
 *              utility functions
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
	if(link.startsWith('mailto:') || link.startsWith('javascript:')){
		return false
	}
	// if(checkIfEmailInString(link)){
	//  return false
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
	if(fs.existsSync(folderPath) && fs.existsSync(pathModule.join(folderPath, "urls.out"))){
		return true;
	}
	else{
		return false;
	}

}

/**
 * Given the html file, finds the line ranges of the script tags inside it
 * @param  {string} html 
 * @return {dict}   
 */
function getScriptLineRanges(html){
	let out = {};

	const lines = html.split(/\r?\n/);

	var script_id = 0;
	var start_range = 0;
	var end_range = 0;

	for(let line_i = 0; line_i < lines.length; line_i++){

		line = lines[line_i];
		if(line.includes('<script')){
			start_range = line_i + 1;
		}
		else if(line.includes('</script>')){
			end_range = line_i + 1;

			// save 
			out[''+ script_id] = [start_range, end_range];
			script_id = script_id + 1;
		}
	}


	return out;
}


function getMD5Hash(string){
	return crypto.createHash('md5').update(string).digest("hex");
}


function getValueFromDictOrNull(dictionary, key){
	if(key in dictionary){
		return dictionary[key]
	}
	return null;
}


/** 
 * @function savePageData 
 * @param url: string
 * @param html: string
 * @param scripts: list
 * @param dataDirectory: string of the base directory to store the data for the current website.
 * @return stores the input webpage data and returns the absolute folder name where the data is saved.
**/
function savePageData(url, html, scripts, cookies, webStorageData, httpRequests, httpResponses, taintFlows, dataDirectory){

	DEBUG && console.log("[IO] started saving webpage.");
	const webpageFolderName = hashURL(url);
	const webpageFolder = pathModule.join(dataDirectory, webpageFolderName);


	// append url in urls.out in the website-specific directory
	fs.appendFileSync(pathModule.join(dataDirectory, "urls.out"), url + '\n');


	if(COLLECT_WEBPAGE){

		if(!fs.existsSync(webpageFolder)){
			fs.mkdirSync(webpageFolder);
		}

		// store url in url.out in the webpage-specific directory
		fs.writeFileSync(pathModule.join(webpageFolder, "url.out"), url);


		try{
			COLLECT_DOM_SNAPSHOT && fs.writeFileSync(pathModule.join(webpageFolder, "index.html"), html, 'utf8');
		}catch(e){
		}

		if(COLLECT_SCRIPTS){

			let scriptMapping = {};

			let scriptLineRanges = getScriptLineRanges(html);


			var sid = 0;
			for(let i=0; i< scripts.length; i++){
				let s = scripts[i];

				let script_path_name = pathModule.join(webpageFolder, `${sid}.js`);
				let script_path_name_org = pathModule.join(webpageFolder, `${sid}.min.js`); // non-beautified code
				let script_path_name_source_map =  pathModule.join(webpageFolder, `${sid}.js.map`); // sourcemap

				let scriptKind = s[0];
				let scriptSourceMappingObject = s[1];
				let sourcemap = undefined;

				// include the real filenames in the sourcemap 
				// instead of having the __fakename included by the `js-beautify-sourcemap` library
				if (scriptSourceMappingObject.sourcemap) {
							sourcemap = JSON.parse(scriptSourceMappingObject.sourcemap);
							sourcemap.file = script_path_name_source_map; // sourcemap file name
							sourcemap.sources = [ `${sid}.js` ]; // original filename
				}

				if(scriptSourceMappingObject.original_code && scriptSourceMappingObject.original_code.length > 0){

					// calculate the script MD5 hash
					let scriptHash = getMD5Hash(scriptSourceMappingObject.original_code);

					// save the script 
					if(scriptKind === TYPE_SCRIPT_INTERNAL){

						scriptMapping[`${sid}.js`] = {
							'type': scriptKind,
							'src': '',
							'lines': getValueFromDictOrNull(scriptLineRanges, ''+ sid),
							'hash': scriptHash
						};

						 fs.writeFileSync(script_path_name, scriptSourceMappingObject.code, 'utf8');
						 fs.writeFileSync(script_path_name_org, scriptSourceMappingObject.original_code);
						 fs.writeFileSync(script_path_name_source_map, JSON.stringify(sourcemap));

						 sid = sid + 1;
					}else{
						if(s.length === 4){ // checks if `SCRIPT_SRC_REPLACED_WITH_CONTENT` is in `s` 

							let scriptSrc = s[2];
							scriptMapping[`${sid}.js`] = {
								'type': scriptKind,
								'src': scriptSrc,
								'lines': getValueFromDictOrNull(scriptLineRanges, ''+ sid),
								'hash': scriptHash
							};

							fs.writeFileSync(script_path_name, scriptSourceMappingObject.code ? scriptSourceMappingObject.code : "", 'utf8');
							fs.writeFileSync(script_path_name_org, scriptSourceMappingObject.original_code ? scriptSourceMappingObject.original_code : "");
						    fs.writeFileSync(script_path_name_source_map, sourcemap ? JSON.stringify(sourcemap) : ""); 
							sid = sid + 1;

						}
					}
				}else{

					// Sanity check only; this case should not happen. 
					// If it does, it indicates a problem either in a third-party library we are using, i.e., 
					// script collection via playwright/puppeteer, or the virtual dom processing
					if(s[1].trim().length> 0){
						DEBUG && console.log('[Warning] script content not found for:', s[0], s[1]);
					}
					
						
				}


			}; // end forloop

			try{
				// store the mapping between scripts
				fs.writeFileSync(pathModule.join(webpageFolder, "scripts_mapping.json"),  JSON.stringify(scriptMapping, null, '\t'), 'utf8');
			}catch(e){
				console.log('[ScriptMappingFileSaveError]', e);
			}
		}


		try{
			COLLECT_COOKIES     && fs.writeFileSync(pathModule.join(webpageFolder, "cookies.json"), JSON.stringify(cookies, null, '\t'), 'utf8');
		}catch(e){
			console.log('[CookieSaveError]', e);
		}

		try{
			COLLECT_WEB_STORAGE && fs.writeFileSync(pathModule.join(webpageFolder, "webstorage.json"), JSON.stringify(webStorageData, null, '\t'), 'utf8');
		}catch(e){
			console.log('[StorageSaveError]', e);
		}

		try{
			COLLECT_REQUESTS && fs.writeFileSync(pathModule.join(webpageFolder, "requests.json"), JSON.stringify(httpRequests, null, '\t'), 'utf8');
		}catch(e){
			console.log('[RequestsSaveError]', e);
		}
		
		
		try{
			COLLECT_RESPONSE_HEADERS  && fs.writeFileSync(pathModule.join(webpageFolder, "responses.json"), JSON.stringify(httpResponses, null, '\t'), 'utf8');
		}
		catch(e){
			console.log('[ResponsesSaveError]', e);
		}

		try{
			TAINT_FLOWS && fs.writeFileSync(pathModule.join(webpageFolder, "taintflows.json"),  JSON.stringify(taintFlows, null, '\t'), 'utf8');
		}catch (e){
			console.log('[TaintFlowSaveError]', e);
			TAINT_FLOWS && fs.writeFileSync(pathModule.join(webpageFolder, "taintflows.json"),  JSON.stringify(taintFlows));
		}
		
		

	}

	
	DEBUG && console.log("[IO] finished saving webpage.");

	return webpageFolder;
}


/** 
 * @function getScriptSourceMappingObject 
 * @param script_content: javascript code
 * @return returns the script sourcemapping object output by `js-beautify-sourcemap` library
**/
async function getScriptSourceMappingObject(script_content) {

	try{
		if(script_content && script_content.length){

			// define an offset for the sourcemap
			let mapping_offset =  {line: 1, column: 0};
			
			// get the transformed code + sourcemap
			let beautified_script_obj = await js_beautify(script_content, { indent_size: 2, space_in_empty_paren: true }, mapping_offset);

			// keep the original code
			beautified_script_obj.original_code = script_content;

			return beautified_script_obj;

		}
		return "";
	}catch{
		// Protocol error (Debugger.getScriptSource): No script for id: <ID>
		return ""
	}
}



/**
 * ------------------------------------------------
 *              Main Crawler Thread
 * ------------------------------------------------
**/


async function crawlWebsite(browser, pageURL, domain, frontier, dataDirectory, debug_run, wait_before_next_url){


	let url = pageURL;
	var LOOP = true;
	while(LOOP){

		var externalScripts = {};
		let taintFlows = [];
		let finished = false;
		var closePage= true;

		// Create a new incognito browser context with disabled CSP
		const context = await browser.newContext({ bypassCSP: true });

		const scriptPath = pathModule.join(BASE_DIR, "crawler/scripts/flowHandler.js");
		context.addInitScript({ path: scriptPath});
		context.exposeBinding("__playwright_taint_report", async function (source, value) {
			if (!finished){
				TAINT_LOG && console.log("[TaintFlow] " + value.sources[0] + " --> " + value.sink);
				taintFlows.push(value)
			};
		});

		// grant permissions for the HTTP Push API
		context.grantPermissions(['notifications']);

		let page = await context.newPage();
		
		await page.setViewportSize({ width: 1366, height: 768});
		 // Configure the navigation timeout to unlimited
		await page.setDefaultNavigationTimeout(0);



		let httpResponses = {};
		page.on('response', async response => {
			const url = response.url();

			httpResponses[''+url] = await response.allHeaders();

			if (response.request().resourceType() === 'script') {
				response.text().then(async (script_content) => {
					let scriptSourceMappingObject = await getScriptSourceMappingObject(script_content);
					externalScripts[url] = scriptSourceMappingObject;
				}).catch( e => {
					// Response body is unavailable for redirect responses  
					// PASS
				});
			}
		});

		// set the request interception to true and collect the HTTP requests
		let httpRequests = {};
		page.on('request', async (request) => {

			let requestUrl = request.url();
			// filter out data:image urls
			if (!requestUrl.startsWith('data:image')){
				let requestHeaders = await request.allHeaders();
				let requestBody = await request.postData();
				httpRequests[requestUrl] = {
					'headers': requestHeaders,
					'postData': requestBody,
				}           
			}
		});

		try{
			DEBUG && console.log('[pageLoad] loading new URL: ' + url);

			// redirect puppeteer console log in the browser to node js log
			BROWSER_LOG && page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));


			// @DOC
			// https://playwright.dev/docs/api/class-page#page-reload
			let load_options = {waitUntil: 'commit'}; // 'networkidle'
			
			// this sometimes throws `NS_ERROR_CONNECTION_REFUSED` in firefox?
			await page.goto(url, load_options);
			await page.waitForTimeout(1000);
			DEBUG && console.log('[pageLoad] new page loaded successfully');

			// @NOTE: we need to load the webpage multiple times to be able to collect the push api taint flows
			// However, we should NOT refresh the same page multiple times as it will hang the page, causing it
			// to not load properly (i.e., `NS_BINDING_ABORTED` error in firefox)
			// As a consequence of the page not being loaded properly, we won't be able to collect new URLs
			// and the crawler terminates pre-maturely.
			let page2 = await context.newPage();
			for (let i = 0; i < number_of_reloads; i++) {
				DEBUG && console.log('[pageLoad] reloading page ' + (i+1) + '/' + number_of_reloads);
				if(i == 0){
					await page2.goto(url, load_options);
				}else{
					await page2.reload({waitUntil: 'commit'});
				}
				await page2.waitForTimeout(2000);
			}
			await page2.close();

			// wait for 20 seconds to make sure the page is loaded 
			// and also to collect the taint flows
			DEBUG && console.log('[pageLoad] waiting for 20 seconds.');
			await page.waitForTimeout(20000);
			// wait until no further network requests are seen for at least 500ms
			// DEBUG && console.log('[pageLoad] waiting for networkidle.');
			// await page.waitForLoadState('networkidle');

			DEBUG && console.log('[pageLoadCompleted] new page loaded successfully');

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
			// console.log(html);
			
			/*
			let html = await page.evaluate( () => {
				return document.documentElement.outerHTML;
			});
			*/
		   
			finished = true; // lock scripts for saving
	   
			const virtualDOM = new JSDOM(html);
			let scriptTags = virtualDOM.window.document.getElementsByTagName('script');
			scriptTags = Array.prototype.slice.call(scriptTags); // cast HTMLCollection to Array

			var allScripts = [];

			var idx = 0;
			for(const [index, scriptTag] of scriptTags.entries()){


				// check if we have an internal script
				let scriptSrc = scriptTag.getAttribute('src');
				if(!scriptSrc){

					// check if the script contains JS code or json data?
					let scriptType = scriptTag.getAttribute('type');
					let scriptKind = TYPE_SCRIPT_INTERNAL;
					if(!scriptType){
						// CASE 1: `type` attribute does not exist
						allScripts[idx] = [scriptKind, scriptTag.textContent];
						idx = idx + 1;
					}
					else if(scriptType && SCRIPT_MIME_TYPES_FOR_JS.includes(scriptType)){
						// CASE 2: `type` attribute exists and is a valid JS mime type
						allScripts[idx] = [scriptKind, scriptTag.textContent];
						idx = idx + 1;
					}

				}
				else if(scriptSrc && scriptSrc.trim().length > 0){
					// the script is external
					let scriptKind = TYPE_SCRIPT_EXTERNAL;
					let scriptType = scriptTag.getAttribute('type');
					
					if(!scriptType){
						allScripts[idx] = [scriptKind, scriptSrc.trim()];
						idx = idx + 1;

					}else if(scriptType && SCRIPT_MIME_TYPES_FOR_JS.includes(scriptType)){
						allScripts[idx] = [scriptKind, scriptSrc.trim()];
						idx = idx + 1;
					}
	  
				}
				// console.log('hs', getMD5Hash(scriptTag.textContent))
			}

		   // console.log('allScripts', allScripts);
		   var iii = 0
		   for(const [index, scriptItem] of allScripts.entries()){

				let scriptKind = scriptItem[0];

				if(scriptKind === TYPE_SCRIPT_INTERNAL){
					let scriptContent = scriptItem[1];
					allScripts[index][1] = await getScriptSourceMappingObject(scriptContent);
				}else{

					let scriptSrc = scriptItem[1];

					// the script `src` obtained here must be present in the `externalScript` list intercepted via playwright / puppeteer
					// but there is no guarantee that the URL is present in a verbatim form there, 
					// i.e., this URL could be a substring of the URL present in the `externalScript`
					// thus we search for this URL, and replace the external script url with its content 
					let externalScriptUrls = Object.keys(externalScripts);
					for(const url of externalScriptUrls){
						if(url.includes(scriptSrc)){
							allScripts[index][1] = await externalScripts[url];
							allScripts[index].push(url);
							// note: if a script is external and does not have the `SCRIPT_SRC_REPLACED_WITH_CONTENT`
							// item, then the script url has not been replaced with its content.
							allScripts[index].push('SCRIPT_SRC_REPLACED_WITH_CONTENT');
							break;
						}
					}
					
				}

		   }

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

			// cookies and local storage
			// https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state
			let cookies = await context.storageState() // .cookies();

			try{
				// save the collected data 
				await savePageData(url, html, allScripts, cookies, webStorageData, httpRequests, httpResponses, taintFlows, dataDirectory);
			}catch(e){
				DEBUG && console.log('[PageSaveError] error while saving the webpage data');
				DEBUG && console.log('[PageSaveError]', e);
			}
			/** 
			* @warning
			* prevent auto navigation / auto page refresh 
			* To workaround this issue, we cancel the navigation / page refresh 
			* everytime the `beforeunload` event fires.
			* Thanks to: https://stackoverflow.com/questions/821011/prevent-a-webpage-from-navigating-away-using-javascript 
			*/
			await page.evaluate( () => {
				window.addEventListener('beforeunload', (event) => {
					// cancel the event as stated by the standard.
					event.preventDefault();
					// chrome requires returnValue to be set.
					event.returnValue = 'locking auto-page refresh.';
					return "";
				});
			})

			DEBUG && console.log('[Crawler] collecting webpage URLs.');
			

			//// fetch new urls 
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

			await page.waitForTimeout(wait_before_next_url);

		} catch (e){
			console.log('[exception] error while navigating/saving the page', e)
			try{
				// close the previous browser
				await context.close();
				await browser.close();
			} catch(e2){
				// PASS
				console.log('[exception] error while closing context', e2);
			}
			frontier.visited.push(url);
			frontier.unvisited = frontier.unvisited.filter(e => e !== url); // remove visited url from unvisited list
			browser = await launch_firefox(true);
			closePage = false

		}
		/*
		*  ------------------------------------
		*  Next URL and Termination Criteria 
		*  ------------------------------------
		*/

		DEBUG && console.log('[Crawler] moving to the next URL.');
		if(closePage){
			await page.close();
			await context.close();
		}
		

		// terminate if this was only a debug run to test a single URL
		if(debug_run) {
			console.log('[Crawler] this is a debug run, thus stopping!');
			LOOP = false;
			break;
			// return browser;
		}

		// termination criteria
		if(frontier.visited.length >= maxVisitedUrls){
			console.log('[Crawler] max urls visited, thus stopping!');
			LOOP = false;
			break;
			// return browser;
		}

		if(frontier.unvisited.length === 0){
			console.log('[Crawler] frontier is empty, thus stopping!');
			LOOP = false;
			break;
			// return browser;
		}

		// pick a new url randomly such that it is not visited before
		url = await frontier.unvisited[Math.floor(Math.random()*frontier.unvisited.length)];

		// recurse
		// return await crawlWebsite(browser, nextURL, domain, frontier, dataDirectory, false, wait_before_next_url);
	}

	return browser;

}

async function launch_firefox(headless_mode) {

	var ff;
	const ffopts = {}; // { "dom.push.serverURL": "wss://push.services.mozilla.com/" };

	if(should_use_foxhound){
		if(foxhound_executable_path === ''){
			ff = await firefox.launch({ headless: headless_mode, firefoxUserPrefs: ffopts });
		}else{
		// Copy modified config file
		fs.copyFileSync(pathModule.join(BASE_DIR, 'crawler', 'playwright.cfg'),
				pathModule.join(pathModule.dirname(foxhound_executable_path), 'playwright.cfg'));

			ff = await firefox.launch({
				// executablePath: "/mnt/workspace/playwright/project-foxhound/obj-build-playwright/dist/bin/firefox",
				executablePath: foxhound_executable_path,
				headless: headless_mode,
		firefoxUserPrefs: ffopts
			});

		}
	}else{
		ff = await firefox.launch({ headless: headless_mode });
	}
   
	return ff;
}

async function launch_chrome(headless_mode) {
   var chrome = await chromium.launch({
	headless: headless_mode
	});
	return chrome;
}

async function launch_browsers(headless_mode){
	var ff = await launch_firefox(headless_mode);
	var chrome = await launch_chrome(headless_mode);
	return { firefox: ff, chrome: chrome};
}


/*
* entry point of crawler
*/
(async function(){

	const processArgv = argv(process.argv.slice(2));
	const config = processArgv({}) || {};
	const url = config.seedurl;

	// default: false
	const overwrite_results = (config.overwrite && config.overwrite.toLowerCase() === 'true')? true: false; 

	// default: true
	const should_use_foxhound_config = (config.foxhound && config.foxhound.toLowerCase() === 'false')? false: true; 

	should_use_foxhound = should_use_foxhound_config;

	if(config.maxurls){
		maxVisitedUrls = config.maxurls;
	}

	
	if(config.foxhoundpath){
		foxhound_executable_path = config.foxhoundpath;
	}else{
		foxhound_executable_path = pathModule.join(BASE_DIR, 'crawler/foxhound/firefox/firefox');
	}



	const headless_mode = (config.headless && config.headless.toLowerCase() === 'false')? false: true;
	const debug_run = false;
	const wait_before_next_url = 1000; // wait for 1 second


	if(!overwrite_results && directoryExists(url)){
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

	var browser = await launch_firefox(headless_mode)

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
