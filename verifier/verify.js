/*
	
	Copyright (C) 2023  Soheil Khodayari, CISPA
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.


	Description:
	------------
	Dynamic Data Flow Verification Module

	Usage:
	------------
	$ node --max-old-space-size=4096 verify.js --datadir=DATA_DIR --website=SITE_URL --webpage=PAGE_URL_HASH --webpagedir=PAGE_URL_DIR --type=DYNAMIC_OR_STATIC --browser=chrome --headless=true --service=http://127.0.0.1:3456

	
*/

const puppeteer = require('puppeteer');
const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto')
const argv = require("process.argv");
const js_beautify = require('js-beautify').js;
const { URL } = require('url');

var instrumentor = require('./instrumentation.js');

/**
 * ------------------------------------------------
 *      Constants & globals
 * ------------------------------------------------
**/


const TAINTFLOWS_FILE_NAME = 'taintflows.json';
// const TAINTFLOWS_FILE_NAME = 'taintflows_relevant.json';
const SAST_FLOWS_FILE_NAME = 'sinks.flows.out.json'

var LOG_INSTRUMENTED_APIS = true;
var BROWSER_LOG = false;
var DEBUG = true;

const FOXHOUND_SINKS = [
	"WebSocket",
	"WebSocket.send",
	"EventSource",
	"fetch.url",
	"fetch.body",
	"XMLHttpRequest.send",
	"XMLHttpRequest.open(url)",
	"XMLHttpRequest.setRequestHeader",
	"Window.open",
	"location.href",
	"location.assign",
	"location.replace",
	"script.src"
]

const FOXHOUND_SOURCES = [
	"PushMessageData",
	"PushSubscription.endpoint",
	"document.baseURI",
	"document.documentURI",
	"document.referrer",
	"location.hash",
	"location.href",
	"location.search",
	"MessageEvent",
	"window.MessageEvent",
	"window.name"
]

const URL_SOURCES  = [
	"document.baseURI",
	"document.documentURI",
	"location.hash",
	"location.href",
	"location.search"
]

// the taint string 
const TEST_PAYLOAD = "testpayload";

// default endpoint hosting the test/service pages
var VERIFICATION_SERVICE_ENDPOINT = "https://127.0.0.1:3456"


/**
 * ------------------------------------------------
 *  	utility functions
 * ------------------------------------------------
**/


// mili-seconds
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** 
 * @function readFile 
 * @param file_path_name: absolute path of a file.
 * @return the text content of the given file if it exists, otherwise -1.
**/
function readJsonFile(file_path_name){

	if(fs.existsSync(file_path_name)){
		try {
			const data = fs.readFileSync(file_path_name, 'utf8');
			return JSON.parse(data);
		} catch (err) {
			// console.error(err)
			return -1;
		}		
	}
	return -1;

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


async function is_api_data_tainted(taint, array){
	for(let e in array){
		let sinks = Object.keys(e);
		for(let sink of sinks){
			let maybeTaintedString = e[sink];
			if(maybeTaintedString.indexOf(taint)){
				return true;
			}	
		}
	}
	return false;
}

async function is_api_data_tainted_for_sink(sinklist, taint, array){
	for(let sink in sinklist){
		for(let e of array){
			if(sink in e){
				let maybeTaintedString = e[sink];
				if(maybeTaintedString.indexOf(taint)){
					return true;
				}
			}
		}
	}
	return false;
}




if(typeof String.prototype.replaceAll === "undefined") {
    String.prototype.replaceAll = function(value, replacement) {
       return this.replace(new RegExp(value, 'g'), replacement);
    }
}

/**
 * ------------------------------------------------
 *  	Main Thread: Static Flows
 * ------------------------------------------------
**/

var global_storage = [];

async function verify_static_dataflows(browser, conf){

	let WEBPAGE_HASH = conf["WEBPAGE_HASH"];
	let SITE_URL = conf["SITE_URL"];
	DEBUG && await console.log(`[[ verification-static ]] started for site: ${SITE_URL}; webpage ${WEBPAGE_HASH}`);

	const context = await browser.defaultBrowserContext();
	var pages = await browser.pages();
	if(pages.length > 0){
		var page = pages[0];
	}else{
		var page = await context.newPage();
	}
	
	/**
	* Disable Content-Security Policy (CSP) to avoid breaking when adding cross-domain scripts 
	* https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetbypasscspenabled
	*/
	await page.setBypassCSP(true); 
	await page.setViewport({ width: 1366, height: 768});

	// redirect puppeteer console log in the browser to node js log
	if(BROWSER_LOG || LOG_INSTRUMENTED_APIS){
		if(BROWSER_LOG){
			page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));
		}
		else if(!BROWSER_LOG && LOG_INSTRUMENTED_APIS){

			page.on('console', consoleObj => {
				let txt = consoleObj.text();
				if(txt.startsWith("[[ Hooks ]]")){
					console.log(consoleObj.text());
				}
			});
		}
	}	
	await page.waitForTimeout(500);


   // disallows page navigation for hooks on location object that triggers a prompt 
   await page.on('dialog', async dialog => {
      await dialog.accept();
   });

	// puppeteer: set the request interception to true and collect the HTTP requests
	await page.setRequestInterception(true);

	// requests
	var capturedHttpRequests = {}
	page.on('request', async (request) => {
		let requestUrl = request.url();
		if (!requestUrl.startsWith('data:image')){
			let requestHeaders = await request.headers();
			let requestBody = await request.postData();
			capturedHttpRequests[requestUrl] = {
				'headers': requestHeaders,
				'postData': requestBody,
			}           
		}
		request.continue();
	});


	let functionHooksString = await instrumentor.getInstrumentedFunctionHooks(LOG_INSTRUMENTED_APIS);
	// executed upon every page load
	// hook results are available on `window.requestApiCalls` array
	await page.evaluateOnNewDocument(functionHooksString); 

	// load the sast flow file
	var webpage_dir = conf['WEBPAGE_DIR'];
	var sast_file_path_name = pathModule.join(webpage_dir, SAST_FLOWS_FILE_NAME);
	var sast_json_content = await readJsonFile(sast_file_path_name)
	if(sast_json_content === -1){
		DEBUG && console.log(`[warning] no sast file found at: ${sast_file_path_name}`);
		return -1;
	}

	// pair of (index, source) of the confirmed data flows as in `sinks.flows.out.json`
	// index is the index of the flow in the main list
	// then for each verified flow/index, the source show which of the sources does the taint
	var confirmed_dataflows = []; 

	var pageURL = sast_json_content["url"];
	var flows = sast_json_content["flows"];
	if(typeof pageURL === 'string' && Array.isArray(flows)){

		for(var index=0; index<flows.length; index++){

			global_storage = [];

			var flow = flows[index];
			if(flow["semantic_types"].includes("RD_WIN_LOC")){

				var u = new URL(pageURL);
				u.hash = TEST_PAYLOAD;
				var testURL = u.toString();

				try{
					//// Navigate to target webpage
					DEBUG && await console.log('[[ win.loc ]] started testing URL: ' + testURL);
					await page.goto(testURL, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
					DEBUG && await console.log('[[ win.loc ]] page loaded successfully');
					DEBUG && await console.log('[[ win.loc ]] waiting 15 seconds');
					await page.waitForTimeout(15000);

					// instrumented api calls 
					let instrumentedRequestApiCalls = await page.evaluate( () => {
						return window.requestApiCalls || [];
					});
					// instrumentedRequestApiCalls = instrumentedRequestApiCalls.concat(global_storage);
					let isTainted = await is_api_data_tainted(TEST_PAYLOAD, instrumentedRequestApiCalls);
					if(isTainted){
						confirmed_dataflows.push([index, source]);
					}
					DEBUG && await console.log(`[[ win.loc ]] taint result: ${isTainted}`);
					await page.waitForTimeout(500);
					DEBUG && await console.log('[[ win.loc ]] finished testing URL: ' + testURL);

				} catch (error){
					await console.log(`[[ win.loc ]] ${error}`);
				}
			}
		}
	}

	///// clean up open pages
	try{ await page.close();}catch{ }
	await fs.writeFileSync(pathModule.join(webpage_dir, "sinkflows_verified.json"), JSON.stringify(confirmed_dataflows, null, '\t'), 'utf8');

	return 1;
}

/**
 * ------------------------------------------------
 *  	Main Thread: Dynamic Flows
 * ------------------------------------------------
**/

async function verify_dynamic_taintflows(browser, conf){

	let WEBPAGE_HASH = conf["WEBPAGE_HASH"];
	let SITE_URL = conf["SITE_URL"];
	DEBUG && await console.log(`[[ verification-dynamic ]] started for site: ${SITE_URL}; webpage ${WEBPAGE_HASH}`);

	const context = await browser.defaultBrowserContext();
	var pages = await browser.pages();
	if(pages.length > 0){
		var page = pages[0];
	}else{
		var page = await context.newPage();
	}

	/**
	* Disable Content-Security Policy (CSP) to avoid breaking when adding cross-domain scripts 
	* https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetbypasscspenabled
	*/
	await page.setBypassCSP(true); 
	await page.setViewport({ width: 1366, height: 768});

	// redirect puppeteer console log in the browser to node js log
	if(BROWSER_LOG || LOG_INSTRUMENTED_APIS){
		if(BROWSER_LOG){
			page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));
		}
		else if(!BROWSER_LOG && LOG_INSTRUMENTED_APIS){

			page.on('console', consoleObj => {
				let txt = consoleObj.text();
				if(txt.startsWith("[[ Hooks ]]")){
					console.log(consoleObj.text());
				}
			});
		}
	}	
	await page.waitForTimeout(500);

   // disallows page navigation for hooks on location object that triggers a prompt 
   await page.on('dialog', async dialog => {
   	DEBUG && console.log('dialog accepted');
   	await dialog.accept();
      // await dialog.dismiss(); // throws Error: net::ERR_ABORTED

   })

	// puppeteer: set the request interception to true and collect the HTTP requests
	await page.setRequestInterception(true);

	// requests
	var capturedHttpRequests = {}
	page.on('request', async (request) => {
		let requestUrl = request.url();
		if (!requestUrl.startsWith('data:image')){
			let requestHeaders = await request.headers();
			let requestBody = await request.postData();
			capturedHttpRequests[requestUrl] = {
				'headers': requestHeaders,
				'postData': requestBody,
			}           
		}
		request.continue();
	});


	let functionHooksString = await instrumentor.getInstrumentedFunctionHooks(LOG_INSTRUMENTED_APIS);
	// executed upon every page load
	// hook results are available on `window.requestApiCalls` array
	await page.evaluateOnNewDocument(functionHooksString); 

	// load the taintflows file
	var webpage_dir = conf['WEBPAGE_DIR'];
	var taintflows_file_path_name = pathModule.join(webpage_dir, TAINTFLOWS_FILE_NAME);
	var taintflows_json_content = await readJsonFile(taintflows_file_path_name)
	if(taintflows_json_content === -1){
		DEBUG && console.log(`[warning] no taintflows file found at: ${taintflows_file_path_name}`);
		return -1;
	}

	// pair of (index, source) of the confirmed data flows as in `taintflows.json`
	// index is the index of the flow in the main list
	// then for each verified flow/index, the source show which of the sources does the taint
	var confirmed_taintflows = []; 
	


	DEBUG && console.log(`[[ verification-dynamic ]] creating testcases.`);

	// map: payloadURL-source -> [[payloadURL1,taintflowindex1, sink1, source1], [payloadURL2, taintflowindex2, sink2, source1], ...]
	var payloads_unique = {};

	// generate the payload
	for(var taintflowindex=0; taintflowindex < taintflows_json_content.length; taintflowindex++){
		var taintflow = taintflows_json_content[taintflowindex];
		var taintflowurlobject = new URL(taintflow["loc"]);
		var sink = taintflow["sink"];
		var str = taintflow["str"];
		var sources = taintflow["sources"];
		var sources_payload = []; // payload to test for each source
		var taintparts = taintflow["taint"];
		var taintedindexes = []; // tainted indexes in the sink 
		var taintedstrings = []; // tainted string parts in the sink
		

		if(TAINTFLOWS_FILE_NAME === 'taintflows.json'){
			for(var taintpart of taintparts){
				var begin = taintpart["begin"];
				var end = taintpart["end"];
				taintedindexes.push([begin, end]);
				taintedstrings.push(str.substring(begin, end));
			}		
		}else{
			// taintflows_relevant.json
			for(var taintpart of taintparts){
				var begins = taintpart["begin"];
				var ends = taintpart["end"];
				for(var k=0; k<begins.length;k++){
					taintedindexes.push([begins[k], ends[k]]);
					taintedstrings.push(str.substring(begins[k], ends[k]));
				}
			}
		}

		for(var index=0; index < taintedstrings.length; index++){
			var value = taintedstrings[index];
			// we need to find the concrete value of the source in the snapshotted execution flow 
			// to determine which part of the source is controllable
			// for URL, we only set the relevant part
			// for doc.referrer, postMessage, and window.name, we set the whole value
			if(index < sources.length){
				var source = sources[index];

				if(source === "document.referrer"){
					sources_payload.push([TEST_PAYLOAD, index, sink]);
				}
				else if(source === "PushMessageData"){
					sources_payload.push([TEST_PAYLOAD, index, sink]);
				}
				else if(source === "window.name"){
					sources_payload.push([TEST_PAYLOAD, index, sink]);
				}
				else if(source === "document.baseURI"){	
					if(taintflowurlobject.origin.indexOf(value) > -1){
						var u = taintflowurlobject.toString().replace(value, TEST_PAYLOAD)
						sources_payload.push([u, index, sink]);
					}
				}
				else if(source === "document.documentURI" || source === "location.href"){
					var u = taintflowurlobject.toString();
					if(u.indexOf(value) > -1){
						u = u.replace(value, TEST_PAYLOAD);
						sources_payload.push([u, index, sink]);
					}

				}
				else if(source === "location.hash"){
					var u = taintflowurlobject.hash;
					if(u.indexOf(value) > -1){
						u = u.replace(value, TEST_PAYLOAD);
						taintflowurlobject.hash = u;
						sources_payload.push([taintflowurlobject.toString(), index, sink]);
					}
				}
				else if(source === "location.search"){
					var u = taintflowurlobject.searchParams.toString();
					if(u.indexOf(value) > -1){
						u = u.replace(value, TEST_PAYLOAD);
						taintflowurlobject.searchParams = new URLSearchParams(u);
						sources_payload.push([taintflowurlobject.toString(), index, sink]);
					}
				}else{
					// pass
				}

			}
		}
		//// process the data and create the `payloads_unique`` map
		for(let entry of sources_payload){
			let payload = entry[0];
			let index = entry[1];
			let sink = entry[2];
			let source = sources[index];

			let key = payload + '_' + source;

			if(key in payloads_unique){
				payloads_unique[key].push([payload, taintflowindex, sink, source]);

			}else{
				payloads_unique[key] = [[payload, taintflowindex, sink, source]];
			}
		}
	} //// End: loop over taintflows

	const total_test_cases = Object.keys(payloads_unique).length;
	DEBUG && console.log(`[[ verification-dynamic ]] total tests: ${total_test_cases}`);

	var gindex = 0;
	for(let key in payloads_unique){

		// flush out previous results
		global_storage = [];

		// payloads_with_same_source
		let testcases = payloads_unique[key];
		let payload = testcases[0][0]
		let source = testcases[0][3]
		var sinklist = {};
		for(let tc of testcases){
			let sink = tc[2];
			let idx = tc[1];
			if(sink in sinklist){
				sinklist[sink].push(idx)
			}else{
				sinklist[sink] = [idx];
			}
		}
		gindex += 1
		DEBUG && console.log(`[[ verification-dynamic ]] test ${gindex}/${total_test_cases}.`);

		if(source === "PushMessageData"){
			// CASE source: pushMessage
			let u = taintflowurlobject.toString();

			try{
				//// Navigate to target webpage
				DEBUG && await console.log('[[ postMessage ]] started testing URL: ' + u);
				await page.goto(u, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
				DEBUG && await console.log('[[ postMessage ]] target page loaded successfully');

				await page.evaluate((payload)=> {
					// self postMessage
					// i.e., page messages itself
					postMessage(payload, location.origin);
					postMessage(payload, '*');
				}, payload);

				DEBUG && await console.log('[[ postMessage ]] waiting 15 seconds');
				await page.waitForTimeout(15000);

				// instrumented api calls 
				let instrumentedRequestApiCalls = await page.evaluate( () => {
					return window.requestApiCalls || [];
				});
				// instrumentedRequestApiCalls = instrumentedRequestApiCalls.concat(global_storage);
				let isTainted = await is_api_data_tainted_for_sink(sinklist, TEST_PAYLOAD, instrumentedRequestApiCalls);
				if(isTainted){
					for(let sink in sinklist){
						let taintflowindex = sinklist[sink];
						confirmed_taintflows.push([taintflowindex, source, sink]);
					}
				}
				DEBUG && await console.log(`[[ postMessage ]] taint result: ${isTainted}`);
				await page.waitForTimeout(500);
				DEBUG && await console.log('[[ postMessage ]] finished testing URL: ' + u);

			} catch (error){
				await console.log(`[[ postMessage ]] ${error}`);
			}

		}
		else if(source === "document.referrer"){
			// CASE source: document.referrer
			let u = `${VERIFICATION_SERVICE_ENDPOINT}/docreferrer/${payload}?next=${taintflowurlobject.toString()}`;

			try{
				//// Navigate to target webpage
				DEBUG && await console.log('[[ doc.referrer ]] started testing URL: ' + u);
				await page.goto(u, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
				DEBUG && await console.log('[[[ doc.referrer ]] page loaded successfully');
				DEBUG && await console.log('[[ doc.referrer ]] waiting 15 seconds');
				await page.waitForTimeout(15000);

				// instrumented api calls 
				let instrumentedRequestApiCalls = await page.evaluate( () => {
					return window.requestApiCalls || [];
				});
				// instrumentedRequestApiCalls = instrumentedRequestApiCalls.concat(global_storage);
				let isTainted = await is_api_data_tainted_for_sink(sinklist, TEST_PAYLOAD, instrumentedRequestApiCalls);
				if(isTainted){
					for(let sink in sinklist){
						let taintflowindex = sinklist[sink];
						confirmed_taintflows.push([taintflowindex, source, sink]);
					}
				}
				DEBUG && await console.log(`[[ doc.referrer ]] taint result: ${isTainted}`);
				await page.waitForTimeout(500);
				DEBUG && await console.log('[[ doc.referrer ]] finished testing URL: ' + u);

			} catch (error){
				await console.log(`[[ doc.referrer ]] ${error}`);
			}

		}
		else if(source === "window.name"){
			// CASE source: window.name
			let u = `${VERIFICATION_SERVICE_ENDPOINT}/winname?payload=${payload}&next=${taintflowurlobject.toString()}`;
			let pageURL = taintflowurlobject.toString();

			try{
				//// Navigate to target webpage
				DEBUG && await console.log('[[ win.name ]] started testing URL: ' + u);
				await page.goto(u, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
				DEBUG && await console.log('[[ win.name ]] page loaded successfully');
				await page.waitForTimeout(500);
				await page.evaluate( (payload) => {
					window.name = payload;
				}, payload);

				DEBUG && await console.log('[[ win.name ]] navigating URL: ' + pageURL);
				await page.goto(pageURL, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
				DEBUG && await console.log('[[ win.name ]] page loaded successfully');
				DEBUG && await console.log('[[ win.name ]] waiting 15 seconds');
				await page.waitForTimeout(15000);

				// instrumented api calls 
				let instrumentedRequestApiCalls = await page.evaluate( () => {
					return window.requestApiCalls || [];
				});
				// instrumentedRequestApiCalls = instrumentedRequestApiCalls.concat(global_storage);
				let isTainted = await is_api_data_tainted_for_sink(sinklist, TEST_PAYLOAD, instrumentedRequestApiCalls);
				if(isTainted){
					for(let sink in sinklist){
						let taintflowindex = sinklist[sink];
						confirmed_taintflows.push([taintflowindex, source, sink]);
					}
				}
				DEBUG && await console.log(`[[ win.name ]] taint result: ${isTainted}`);
				await page.waitForTimeout(500);
				DEBUG && await console.log('[[ win.name ]] finished testing URL: ' + u);

			} catch (error){
				await console.log(`[[ win.name ]] ${error}`);
			}

		}else{
			// CASE source: URL
			let u = taintflowurlobject.toString();

			try{
				//// Navigate to target webpage
				DEBUG && await console.log('[[ win.loc ]] started testing URL: ' + u);
				await page.goto(u, { waitUntil: ["load", "networkidle0"], timeout: 30000 });
				DEBUG && await console.log('[[ win.loc ]] page loaded successfully');
				DEBUG && await console.log('[[ win.loc ]] waiting 15 seconds');
				await page.waitForTimeout(15000);

				// instrumented api calls 
				let instrumentedRequestApiCalls = await page.evaluate( () => {
					return window.requestApiCalls || [];
				});

				// instrumentedRequestApiCalls = instrumentedRequestApiCalls.concat(global_storage);
				let isTainted = await is_api_data_tainted_for_sink(sinklist, TEST_PAYLOAD, instrumentedRequestApiCalls);
				if(isTainted){
					for(let sink in sinklist){
						let taintflowindex = sinklist[sink];
						confirmed_taintflows.push([taintflowindex, source, sink]);
					}
				}
				DEBUG && await console.log(`[[ win.loc ]] taint result: ${isTainted}`);
				await page.waitForTimeout(500);
				DEBUG && await console.log('[[ win.loc ]] finished testing URL: ' + u);

			} catch (error){
				await console.log(`[[ win.loc ]] ${error}`);
			}
		}

	} //// End: loop over source payloads of each taintflow


	///// clean up open pages
	try{ await page.close(); }catch{ }

	await fs.writeFileSync(pathModule.join(webpage_dir, "taintflows_verified.json"), JSON.stringify(confirmed_taintflows, null, '\t'), 'utf8');
	return 1;
}

async function launch_chrome(headless_mode){

	var defaultArgs = puppeteer.defaultArgs();
	if(headless_mode){
		defaultArgs = puppeteer.defaultArgs().filter(arg => arg !== '--disable-dev-shm-usage');
	}else{
		defaultArgs = puppeteer.defaultArgs().filter(arg => arg !== '--disable-dev-shm-usage' && arg !== '--headless');
	}
	
	defaultArgs.push(
			"--disable-setuid-sandbox",
			'--no-sandbox',
			"--shm-size=8gb",
			"--disk-cache-size=0",
			"--media-cache-size=0"
	)
	var browser = await puppeteer.launch({
		ignoreDefaultArgs: true,
		args: defaultArgs,
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

	// CLI arguments
	const DATA_DIR = config.datadir;
	const SITE_URL = config.website;
	const WEBPAGE_HASH = config.webpage;
	const WEBPAGE_DIR = config.webpagedir;
	const DYNAMIC_OR_STATIC_TYPE = (config.type && config.type.toLowerCase() === 'static')? 'static': 'dynamic';
	const BROWSER_NAME = (config.browser && config.browser.toLowerCase() === 'firefox')? 'firefox': 'chrome';
	const HEADLESS  = (config.headless && config.headless.toLowerCase() === 'false')? false: true;
	VERIFICATION_SERVICE_ENDPOINT = (config.service && config.service.length)? config.service: VERIFICATION_SERVICE_ENDPOINT;


	if(BROWSER_NAME != 'chrome'){
		console.log('[warning] the dynamic verification module only supports chrome!')
		process.exit(0);
	}

	var conf = {
		'DATA_DIR': DATA_DIR,
		'SITE_URL': SITE_URL,
		'WEBPAGE_HASH': WEBPAGE_HASH,
		'WEBPAGE_DIR': WEBPAGE_DIR,
		'DYNAMIC_OR_STATIC_TYPE': DYNAMIC_OR_STATIC_TYPE,
		'HEADLESS': HEADLESS,
		'BROWSER_NAME': BROWSER_NAME
	}
	false && DEBUG && console.log(`config: ${JSON.stringify(conf)}`);

	var browser = await launch_chrome(HEADLESS);
	try{
		if(DYNAMIC_OR_STATIC_TYPE === 'dynamic'){
			await verify_dynamic_taintflows(browser, conf);
		}else{
			await verify_static_dataflows(browser, conf);
		}
		browser.close();
	}catch(err){
		DEBUG && console.log(err);
		// kill any hanging chrome instance
		await browser?.close() 
	}
	

})();
