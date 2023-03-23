
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
const js_beautify = require('js-beautify').js;
const elapsed = require("elapsed-time-logger");

// timestamp console messages
// require('console-stamp')(console, '[HH:MM:ss.l]');

/**
 * ------------------------------------------------
 *   				module imports
 * ------------------------------------------------
**/
const DOMClobberingSourceAnalyzerModule = require('./../analyses/domclobbering/domc_traversals.js');
const DOMClobberingSourceAnalyzer = DOMClobberingSourceAnalyzerModule.DOMClobberingSourceAnalyzer;

const DOMClobberingPayloadGeneratorModule = require('./../analyses/domclobbering/domc_payload_generator.js');
const DOMClobberingPayloadGenerator = DOMClobberingPayloadGeneratorModule.DOMClobberingPayloadGenerator;


/**
 * ------------------------------------------------
 *  			constants and globals
 * ------------------------------------------------
**/

// directory where the data of the crawling will be saved
const dataStorageDirectory = pathModule.join('' + __dirname, '../data');

// maximum number of URLs to be tested per website by default
// this default number can be overridden in the input config.yaml file
var maxVisitedUrls = 30;

// when true, nodejs will log the current step for each webpage to the console 
const DEBUG = true; 		

// when true, nodejs will log the browser console logs to the console as they arrive
const BROWSER_LOG = false; 


const libraryHeuristics = [
	// "Copyright The Closure Library"
]

function isLibraryScript(scriptContent){
	let flag = false;
	for(let h of libraryHeuristics){
		if(scriptContent.includes(h)){
			flag = true;
			break;
		}
	}
	return flag;
}

const withTimeout = (millis, promise) => {
    const timeout = new Promise((resolve, reject) =>
        setTimeout(
            () => reject(`Timed out after ${millis} ms.`),
            millis));
    return Promise.race([
        promise,
        timeout
    ]);
};

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
		console.error(err)
		return -1;
	}
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
 * @return gets or creates a directory to store the data of the input url and returns the directory name.
**/
function getOrCreateDataDirectoryForWebsite(url){
	const folderName = getNameFromURL(url);
	const folderPath = pathModule.join(dataStorageDirectory, folderName);
	if(!fs.existsSync(folderPath)){
		fs.mkdirSync(folderPath);
	}
	return folderPath;
}


/** 
 * @function savePageData 
 * @param url: string
 * @param html: string
 * @param scripts: list
 * @param dataDirectory: string of the base directory to store the data for the current website.
 * @return stores the input webpage data and returns the absolute folder name where the data is saved.
**/
function savePageData(url, html, scripts, dataDirectory){


	DEBUG && console.log("[IO] started saving webpage.")
	const webpageFolderName = hashURL(url);
	const webpageFolder = pathModule.join(dataDirectory, webpageFolderName);
	if(!fs.existsSync(webpageFolder)){
		fs.mkdirSync(webpageFolder);
	}

	// append url in urls.out in the website-specific directory
	fs.appendFileSync(pathModule.join(dataDirectory, "urls.out"), url + '\n');

	// store url in url.out in the webpage-specific directory
	fs.writeFileSync(pathModule.join(webpageFolder, "url.out"), url);

	fs.writeFileSync(pathModule.join(webpageFolder, "index.html"), '' + html);
	scripts.forEach((s, i)=> {
		fs.writeFileSync(pathModule.join(webpageFolder, `${i}.js`), '' + s.source);
	});

	DEBUG && console.log("[IO] finished saving webpage.")
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
		
		// note: we do not need the beautified version of scripts for force execution, only useful for debugging, thus comment out
		// let beautified_script_content = js_beautify(script_content, { indent_size: 2, space_in_empty_paren: true });
		// return beautified_script_content;
		
		return script_content;
	}catch(e){
		//// --- CDP ISSUE ---- //// 
		//// capture the case where a script id returned by Debugger.scriptParsed method
		//// of the CDP is NOT found by the Debugger.getScriptSource method
		false && console.log('[CDP] requested unexpected script id from Debugger.getScriptSource!');
	}

}


/**
 * ------------------------------------------------
 *  			Main Crawler Thread
 * ------------------------------------------------
**/


/** 
 * @function verifyClobberedDataFlowsOfWebsite 
 * @param browser: puppeteer browser instance
 * @param website_url: url of the webpage under test
 * @param webpage_path: absolute path of the target webpage for testing in the file system
 * @param website_data_directory: absolute path of the data generated by crawler and static analyzer for the target site
 * @description dynamically verify dom clobbering data flows
**/

async function verify_clobbered_data_flows_of_website(browser, webpage_url, webpage_path, website_data_directory){
	
	let scripts = [];
	let page = await browser.newPage();
	
	/**
	* Disable Content-Security Policy (CSP) to avoid breaking when adding cross-domain scripts 
	* https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetbypasscspenabled
	*/
	await page.setBypassCSP(true)

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

	DEBUG && console.log('[pageLoad] loading new URL: ' + webpage_url);
	await page.goto(webpage_url, {waitUntil: 'networkidle0'}); // or waitUntil: load
	DEBUG && console.log('[pageLoadCompleted] new page loaded successfully (networkidle0)');

	// redirect puppeteer console log in the browser to node js log
	BROWSER_LOG && page.on('console', consoleObj => console.log('[BrowserConsole] ' + consoleObj.text()));


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
	page.evaluate( () => {
		window.addEventListener('beforeunload', (event) => {
			// cancel the event as stated by the standard.
			event.preventDefault();
			// chrome requires returnValue to be set.
			event.returnValue = 'puppeteer: locking auto-page refresh for DOMC testing.';
			return "";
		});
	});


	/*
	* Prepare the webpage script code for dynamic instrumentation
	*/
	let scriptsCode = '';
	for(let [idx, script] of scripts.entries()){
		scriptsCode = scriptsCode + script.source + '\n\n';
	}


	/*
	* We need to check the clobberability of DOM Clobbering sources identified
	* via static analysis by inserting a suitable HTML markup.
	* To do that, we follow the steps below:
	*	1. read the clobbering sources
	*	2. generate and insert DOM Clobbering HTML markups
	*/

 	// 1
	let domc_sources_file =  pathModule.join(webpage_path, "sources.out.json");
	let domc_sources_raw_data = readFile(domc_sources_file);
	if(domc_sources_raw_data == -1 ){
		console.log(`[Warning] DOM Clobbering sources do not exist for ${webpage_path}. Please run the static analsis component first.`)
		return 0;
	}

	let domc_sources_json = JSON.parse(domc_sources_raw_data);
	let domcSources = domc_sources_json["sources"];


	// 2
	DEBUG && console.log('[PayloadGen] starting DOMC payload generation.');
	let domcPayloadGenerator = new DOMClobberingPayloadGenerator();

	/*
	* @note store domcPayloads[i] like below {
	*    "id": integer
	*    "code": "window.x.y",
	*    "location": {start:{line:1, column:0}, end:{line:10, column:0}},
	*    "taint_value": "TAINT_window_x_y_z_1_10"
	*    "payload": `<iframe name="x" srcdoc="<iframe name='y' srcdoc='<a id=z href=clobbered:TAINT_window_x_y_z_1_10 ></a>'></iframe>"></iframe>`
	*    "clobbering_delay": true
	*  }
	*/

	var domcPayloads = [];
	Object.keys(domcSources).forEach(clobberingSource => {
		var occurences = domcSources[clobberingSource];
		occurences.forEach(obj =>{
			obj["code"] = clobberingSource;
			domcPayloads.push(obj);
		});
	});

	for(let i=0; i<domcPayloads.length; i++){

		let domcSource = domcPayloads[i];
		let pg = domcPayloadGenerator.create_dom_clobbering_html_payload(domcSource);

		// add the payloadGeneator info to a copy of the dictionary of sources
		domcPayloads[i].taint_value = pg.taint_value;
		domcPayloads[i].payload = pg.payload;
		domcPayloads[i].clobbering_delay= pg.clobbering_delay;
	}
	DEBUG && console.log('[PayloadGen] finished DOMC payload generation.');


	/*
	*	DOM Clobbering Dynamic Test  
	*  ------------------------------------
	*  0: inject the iroh library for dynamic instrumention;
	*  1: inject the web page code string for Iroh instrumentation in a variable called `scriptsCode`;
	*  2: inject the dictionary of candidate sources and taints in a variable called `domcPayloads`;
	*  3: inject the dynamic instrumentation engine developed on the top of iroh
	*  4: inject the HTML markup / DOM Clobbering payload
	*  5: force execute and collect the results
	*/

	DEBUG && console.log('[DynamicAnalysis] started dynamic analysis.');

	DEBUG && console.log('[DynamicAnalysis] preparing Iroh.');

	// 0
	const iroh_browser_file_path = pathModule.join('' + __dirname, "/../dynamic/iroh-browser.js"); 
	await page.addScriptTag({path: require.resolve(iroh_browser_file_path)});

	// 1
	/** 
	 * @WARNING: 
	 * 	When storing and processing strings during instrumentation, only use regular strings in puppetter 
	 *  instead of interpolation with template strings. Otherwise, it is likely that the following error occurs:
	 *	- SyntaxError: Octal escape sequences are not allowed in template strings.
	 */

	DEBUG && console.log('[DynamicAnalysis] preparing input scripts.');
	await page.evaluate( (scriptsCode) => {
		localStorage.setItem('scriptsCode', scriptsCode);
	}, scriptsCode);


	// 2
	DEBUG && console.log('[DynamicAnalysis] preparing clobbering sources.');
	await page.evaluate( (domcPayloads) => {
		// window.domcPayloads = domcPayloads;
		localStorage.setItem('domcPayloads', domcPayloads);
	}, domcPayloads);


	// 4
	DEBUG && console.log('[DynamicAnalysis] injecting the DOMC taint engine.');
	const dynamic_taint_engine_file_path = pathModule.join('' + __dirname, "/../dynamic/domc_taint_engine.js"); 
	const dynamic_taint_engine_content = readFile(dynamic_taint_engine_file_path);
	// await page.addScriptTag({path: require.resolve(dynamic_taint_engine_file_path)}); 

	var taintEngineInstrumentationSuccess = true;
	try{
		await page.evaluate( (dynamic_taint_engine_content) => {


			/** 
			* @warning
			* avoid adding script tags to the page for the instrumented code
			* because if the webpage uses CSP with `unsafe-inline` directive, 
			* our script will be blocked! 
			*/

			// var sc_taint_engine= document.createElement('script');
			// sc_taint_engine.type = "text/javascript";
			// sc_taint_engine.textContent = dynamic_taint_engine_content;
			// document.body.appendChild(sc_taint_engine);

			eval(dynamic_taint_engine_content);
		}, dynamic_taint_engine_content);
	}
	catch(err){
		console.log('[DynamicAnalysis] taint engine preparaion / instrumentation failed due to a syntax error in webapp scripts. See details below.');
		console.log(err);
		taintEngineInstrumentationSuccess = false;
	}

	if(taintEngineInstrumentationSuccess){ // continue only if instrumentation succeeded

		// 3
		DEBUG && console.log('[DynamicAnalysis] testing payloads.');
		const domcPayloadClassName="DOMC-PAYLOAD-CLASS-NAME";
		for(let [idx, oo] of domcPayloads.entries()){
			// DEBUG && console.log('[DynamicAnalysis] testing payload: ' + idx + '/' + domcPayloads.length);
			try{

				await page.evaluate( (oo,domcPayloadClassName, DEBUG) => {


					var removeElementsByClass = window.removeElementsByClass || function removeElementsByClass(className){
					    const elements = document.getElementsByClassName(className);
					    while(elements.length > 0){
					        elements[0].parentNode.removeChild(elements[0]);
					    }
					}
					removeElementsByClass(domcPayloadClassName);
					var div = document.createElement('div');
					div.setAttribute('class', domcPayloadClassName);
					div.innerHTML = oo.payload;
					document.body.appendChild(div);
					DEBUG && console.log('[puppeteer] injected:', div);

				}, oo, domcPayloadClassName, DEBUG);

				if(oo.payload.includes('iframe')){
					// add delay before processing if some clobbering delay is needed (i.e., for iframes)
					await page.waitForTimeout(100); 
				} 

				await page.evaluate( (oo, DEBUG)=> {
					try {
							DEBUG && console.log('[puppeteer] running instrumented script.')
							// force execute the instrumented script
							// invoke the force execution callback for the current source-sink pairs
							startForceExecution(oo);
					}catch{
							DEBUG && console.log('[puppeteer] error while executing the iroh stage.');
					}
				}, oo, DEBUG);

			}
			catch (err){
				console.log('[puppeteer] ERR: '+ err);
			}
		}

		// 5: collect the results and store
		DEBUG && console.log('[DynamicAnalysis] started saving analysis results.');
		const pageClobberable = await page.evaluate(()=> {
			return window.clobberable;
		});
		const pageClobberableWithUrl = {
			"url": webpage_url,
			"results": pageClobberable
		}
		const pageClobberableJson = JSON.stringify(pageClobberableWithUrl, null, 2);
		const outputFileName =  pathModule.join(webpage_path, "clobbering.out.json");
		await fs.writeFileSync(outputFileName, pageClobberableJson); 
		DEBUG && console.log('[DynamicAnalysis] finished saving analysis results.');

	}

}



/** 
 * @function start_dynamic_analysis 
 * @param browser: puppeteer browser instance
 * @param webpage_path: absolute path of the target webpage for testing in the file system
 * @param website_url: used to test all webpages of this site if the specific `webpage_path` is undefined
 * @param website_data_directory: base directory where the crawler stored the data for the target site
 * @description starts the dynamic analysis component for verifying DOM Clobbering data flows
**/
async function start_dynamic_analysis(browser, webpage_path, website_url, website_data_directory){


	if(webpage_path && webpage_path.length > 10){

		if(fs.existsSync(webpage_path)){
				var urlContent = readFile(pathModule.join(webpage_path, "url.out"));
				if(urlContent != -1){
					var webpage_url = urlContent.trim();
					await verify_clobbered_data_flows_of_website(browser, webpage_url, webpage_path, website_data_directory);				
				}
		}else{
			console.log('[Warning] the following directory does not exists, but was marked for dynamic analysis: '+ webpage_path +'\n url is: '+ webpage_url);
		}	

	}else{

		const urlsFile = pathModule.join(website_data_directory, "urls.out");
		const urlsFileContent = readFile(urlsFile);

		if(urlsFileContent != -1){
			
			const globalTimer = elapsed.start('global_dynamic_timer');
			
			const urls = new Set(urlsFileContent.split("\n")); // do not consider duplicate urls

			for(let webpage_url of urls.values()){
				
				if(webpage_url.trim().length > 1 ){ // eliminate empty strings
					let _hash = hashURL(webpage_url);
					let webpage_folder = pathModule.join(website_data_directory, _hash);
					if(fs.existsSync(webpage_folder)){
						await verify_clobbered_data_flows_of_website(browser, webpage_url, webpage_folder, website_data_directory);		

					}else{
						console.log('[Warning] the following directory does not exists, but was marked for dynamic analysis: '+ webpage_folder +'\n url is: '+ webpage_url);
					}			
				}	
			}

			const globalTime = globalTimer.get();
			globalTimer.end();
			fs.writeFileSync(pathModule.join(website_data_directory, "time.dynamic_analysis.out"), JSON.stringify({
				"total_dynamic_analysis_timer": globalTime,
			}));

		}
		else{
			console.log('[Warning] urls.out is empty for website: '+ website_url +', thus exiting dynamic-analysis pass.')
		}
	}


}



/*
* entry point of exec
*/
(async function(){


    var processArgv = argv(process.argv.slice(2));
    var config = processArgv({}) || {};
    

    /*
    * read inputs: website for test and browser config for puppeteer
    */

   	const webpage_path = config.webpage; // when this parameter is present, the tool tests only the given webpage 
    const website_url = config.website;  // when this parameter is present and `webpage_path` is not present, the tool tests ALL webpages of the website

    const browser_name = config.browser; 
    const use_browserstack = (config.use_browserstack && config.use_browserstack.toLowerCase() === 'true')? true: false;
    const browserstack_username = config.browserstack_username;
    const browserstack_password = config.browserstack_password;
    const browserstack_access_key = config.browserstack_access_key;

    /*
    * input data directory
    */

    const website_data_directory = getOrCreateDataDirectoryForWebsite(website_url);

    /*
    * set up the browser instance locally with chrome or via BrowserStack for other browsers
    * for more info, see: https://www.browserstack.com/docs/automate/puppeteer/local-testing
    */

    if(use_browserstack){ // OPTION 1: use BrowserStack browsers

		// dynamically load BrowserStack instance based on settings
		const BrowserStackLocal = require('browserstack-local');
		const bsLocal = new BrowserStackLocal.Local();
		const BS_LOCAL_ARGS = { 'key': browserstack_access_key };

		bsLocal.start(BS_LOCAL_ARGS, async ()=> {


		    DEBUG && console.log('Started BrowserStackLocal');
		    // check if BrowserStack local instance is running
		    DEBUG && console.log(`BrowserStackLocal running: ${bsLocal.isRunning()}`);

		    const capabilities = {
		        'browser': browser_name,
		        'browser_version': 'latest',
		        'os': 'os x',
		        'os_version': 'catalina',
		        'build': 'puppeteer-build',
		        'name': 'force-executor',
		        'browserstack.username': browserstack_username || 'YOUR_DEFAULT_USERNAME',
		        'browserstack.accessKey': browserstack_password || 'YOUR_DEFAULT_ACCESS_KEY',
		        'browserstack.local': 'true'  // setting this capability to true would inform BrowserStack that publicly inaccessible URLs have to be resolved through your local network using the tunnel connection created by 'browserstack-local' node package
		    };

		    // use `.connect()` to initiate an Automate session on BrowserStack
		    const browser = await puppeteer.connect({
		        browserWSEndpoint: `wss://cdp.browserstack.com/puppeteer?caps=${encodeURIComponent(JSON.stringify(capabilities))}`,
		    });

		    await start_dynamic_analysis(browser, webpage_path, website_url, website_data_directory);

		    await browser.close()
		    // stop the Local instance after your test run is completed
    		bsLocal.stop(() => console.log('Stopped BrowserStackLocal'));

		});

    }else{ // OPTION 2: use local machine browsers

		var args = puppeteer.defaultArgs();
		args = puppeteer.defaultArgs().filter(arg => arg !== '--disable-dev-shm-usage')
		args.push(
				"--disable-setuid-sandbox",
				'--no-sandbox',
				"--shm-size=8gb",
				"--disk-cache-size=0",
				"--media-cache-size=0"
		);
		var browser = await puppeteer.launch({
			headless: true,
			args: args,
			'ignoreHTTPSErrors': true
		});

		await start_dynamic_analysis(browser, webpage_path, website_url, website_data_directory);
		await browser.close();

    }

})();
