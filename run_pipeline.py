# -*- coding: utf-8 -*-

"""
	Copyright (C) 2022  Soheil Khodayari, CISPA
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
	The main program that runs the testing pipeline


	Usage:
	------------
	$ python3 -m run_pipeline --conf=config.yaml

"""

import argparse
import pandas as pd
import os, sys
import requests

import utils.io as IOModule
from utils.logging import logger as LOGGER
import utils.utility as utilityModule
import constants as constantsModule
import analyses.domclobbering.domc_neo4j_traversals as DOMCTraversalsModule
import analyses.domclobbering.static_analysis_api as domc_sast_model_construction_api

import analyses.cs_csrf.cs_csrf_neo4j_traversals as CSRFTraversalsModule
import analyses.cs_csrf.static_analysis_api as csrf_sast_model_construction_api

import analyses.request_hijacking.static_analysis_api as rh_sast_model_construction_api
import analyses.request_hijacking.static_analysis_py_api as request_hijacking_neo4j_analysis_api
import analyses.request_hijacking.verification_api as request_hijacking_verification_api

def is_website_up(uri):
	try:
		response = requests.head(uri, timeout=20)
		return True
	except Exception as e:
		return False


def save_website_is_down(domain):
	base = constantsModule.DATA_DIR_UNREPONSIVE_DOMAINS
	if not os.path.exists(base):
		os.makedirs(base)

	filename = os.path.join(base, utilityModule.getDirectoryNameFromURL(domain))
	with open(filename, "w+") as fd:
		fd.write(domain)


def main():

	BASE_DIR= os.path.dirname(os.path.realpath(__file__))
	CONFIG_FILE_DEFAULT = 'config.yaml'
	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')
	p.add_argument('--conf', "-C",
					metavar="FILE",
					default=CONFIG_FILE_DEFAULT,
					help='pipeline configuration file. (default: %(default)s)',
					type=str)


	p.add_argument('--site', "-S",
					default='None',
					help='website to test; overrides config file (default: %(default)s)',
					type=str)

	p.add_argument('--list', "-L",
					default='None',
					help='site list to test; overrides config file (default: %(default)s)',
					type=str)


	p.add_argument('--from', "-F",
					default=-1,
					help='the first entry to consider when a site list is provided; overrides config file (default: %(default)s)',
					type=int)

	p.add_argument('--to', "-T",
					default=-1,
					help='the last entry to consider when a site list is provided; overrides config file (default: %(default)s)',
					type=int)



	args= vars(p.parse_args())
	config = IOModule.load_config_yaml(args["conf"])

	override_site = args["site"]
	override_site_list = args["list"]
	override_site_list_from = args["from"]
	override_site_list_to = args["to"]

	domain_health_check = config["crawler"]["domain_health_check"]

	if override_site != 'None':
		config["testbed"]["site"] = override_site

	if override_site_list != 'None':
		config["testbed"]["sitelist"] = override_site_list

	if override_site_list_from != -1:
		config["testbed"]["from_row"] = override_site_list_from

	if override_site_list_to != -1:
		config["testbed"]["to_row"] = override_site_list_to


	LOGGER.info("loading config: %s"%str(config))

	# iteratively write the HPG construction output to disk
	# useful in case of timeouts for partial results
	iterative_output = 'false'
	if "staticpass" in config:
		if "iterativeoutput" in config["staticpass"]:
			iterative_output = str(config["staticpass"]["iterativeoutput"]).lower()
	

	crawler_command_cwd = os.path.join(BASE_DIR, "crawler")
	force_execution_command_cwd = os.path.join(BASE_DIR, "dynamic")
	dynamic_verifier_command_cwd = os.path.join(BASE_DIR, "verifier")

	# default memory for nodejs crawling process
	crawler_node_memory = 8192

	if "memory" in config["crawler"]:
		crawler_node_memory = config["crawler"]["memory"]
		
	# crawling
	crawling_command = "node --max-old-space-size={5} DRIVER_ENTRY --seedurl=SEED_URL --maxurls={0} --browser={1} --headless={2} --overwrite={3} --foxhound={4}".format(
		config["crawler"]["maxurls"],
		config["crawler"]["browser"]["name"],
		config["crawler"]["browser"]["headless"],
		config["crawler"]["overwrite"],
		config["crawler"]["browser"]["foxhound"], # should_use_foxhound
		crawler_node_memory
	)
	
	
	browser_name = config["crawler"]["browser"]["name"]
	if browser_name == 'chrome':
		crawler_js_program = 'crawler.js'
	else:
		crawler_js_program = 'crawler-taint.js'

	

	node_crawler_driver_program = os.path.join(crawler_command_cwd, crawler_js_program)
	crawling_command = crawling_command.replace("DRIVER_ENTRY", node_crawler_driver_program)
	crawling_timeout = int(config["crawler"]["sitetimeout"])


	# static analysis config
	static_analysis_timeout = int(config["staticpass"]["sitetimeout"])
	static_analysis_memory = config["staticpass"]["memory"]
	static_analysis_per_webpage_timeout = int(config["staticpass"]["pagetimeout"])

	static_analysis_compress_hpg = 'true'
	if "compress_hpg" in config["staticpass"]:
		static_analysis_compress_hpg = config["staticpass"]["compress_hpg"]


	static_analysis_overwrite_hpg = 'false'
	if "overwrite_hpg" in config["staticpass"]:
		static_analysis_overwrite_hpg = config["staticpass"]["overwrite_hpg"]

	# set neo4j config
	if "neo4j_user" in config["staticpass"]:
		constantsModule.NEO4J_USER = config["staticpass"]["neo4j_user"]
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_pass" in config["staticpass"]:
		constantsModule.NEO4J_PASS = config["staticpass"]["neo4j_pass"]
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_http_port" in config["staticpass"]:
		constantsModule.NEO4J_HTTP_PORT = config["staticpass"]["neo4j_http_port"]
		constantsModule.NEO4J_CONN_HTTP_STRING = "http://127.0.0.1:%s"%str(constantsModule.NEO4J_HTTP_PORT)

	if "neo4j_bolt_port" in config["staticpass"]:
		constantsModule.NEO4J_BOLT_PORT = config["staticpass"]["neo4j_bolt_port"]
		constantsModule.NEO4J_CONN_STRING = "bolt://127.0.0.1:%s"%str(constantsModule.NEO4J_BOLT_PORT)
		constantsModule.NEOMODEL_NEO4J_CONN_STRING = "bolt://%s:%s@127.0.0.1:%s"%(constantsModule.NEO4J_USER, constantsModule.NEO4J_PASS, constantsModule.NEO4J_BOLT_PORT)

	if "neo4j_use_docker" in config["staticpass"]:
		constantsModule.NEO4J_USE_DOCKER = config["staticpass"]["neo4j_use_docker"] 


	## dom clobbering
	# domc_analyses_command_cwd = os.path.join(BASE_DIR, "analyses/domclobbering")
	# domc_static_analysis_command = "node --max-old-space-size=%s DRIVER_ENTRY --seedurl=SEED_URL --iterativeoutput=%s"%(static_analysis_memory, iterative_output)
	# domc_static_analysis_driver_program = os.path.join(domc_analyses_command_cwd, "static_analysis.js")
	# domc_static_analysis_command = domc_static_analysis_command.replace("DRIVER_ENTRY", domc_static_analysis_driver_program)
	
	## client-side csrf
	# cs_csrf_analyses_command_cwd = os.path.join(BASE_DIR, "analyses/cs_csrf")
	# cs_csrf_static_analysis_command = "node --max-old-space-size=%s DRIVER_ENTRY --seedurl=SEED_URL --iterativeoutput=%s"%(static_analysis_memory, iterative_output)
	# cs_csrf_static_analysis_driver_program = os.path.join(cs_csrf_analyses_command_cwd, "static_analysis.js")
	# cs_csrf_static_analysis_command = cs_csrf_static_analysis_command.replace("DRIVER_ENTRY", cs_csrf_static_analysis_driver_program)
	

	## dom clobbering dynamic verifier
	force_execution_timeout = int(config["dynamicpass"]["sitetimeout"])
	node_force_execution_command = "node --max-old-space-size=4096 DRIVER_ENTRY --website=SITE_URL --browser={0} --use_browserstack={1}  --browserstack_username={2}  --browserstack_password={3} --browserstack_access_key={4}".format(
		config["dynamicpass"]["browser"]["name"],
		config["dynamicpass"]["browser"]["use_browserstack"],
		config["dynamicpass"]["browser"]["browserstack_username"],
		config["dynamicpass"]["browser"]["browserstack_password"],
		config["dynamicpass"]["browser"]["browserstack_access_key"]
	)
	node_force_execution_driver_program = os.path.join(force_execution_command_cwd, 'force_execution.js')
	node_force_execution = node_force_execution_command.replace("DRIVER_ENTRY", node_force_execution_driver_program)
	

	## request hijacking dynamic verifier
	verification_pass_timeout = int(config["verificationpass"]["sitetimeout"])
	## TODO: add TMPDIR=/dev/shm to the beginning of the command below to reduce io
	node_dynamic_verfier_command = "node --max-old-space-size=4096 DRIVER_ENTRY --datadir={0} --website=SITE_URL --webpage=PAGE_URL_HASH --webpagedir=PAGE_URL_DIR --type=DYNAMIC_OR_STATIC --browser={1} --service={2}".format(
		constantsModule.DATA_DIR,
		config["verificationpass"]["browser"]["name"],
		config["verificationpass"]["endpoint"]

	)
	node_dynamic_verifier_driver_program = os.path.join(dynamic_verifier_command_cwd, "verify.js")
	node_dynamic_verifier = node_dynamic_verfier_command.replace("DRIVER_ENTRY", node_dynamic_verifier_driver_program)



	if "site" in config["testbed"]:
		website_url = config["testbed"]["site"]

		# crawling
		if (config['domclobbering']['enabled'] and config['domclobbering']["passes"]["crawling"]) or \
			(config['cs_csrf']['enabled'] and config['cs_csrf']["passes"]["crawling"]) or \
			(config['request_hijacking']['enabled'] and config['request_hijacking']["passes"]["crawling"]):


			if domain_health_check:
				LOGGER.info('checking if domain is up with python requests ...')
				website_up = False

				try:
					website_up = is_website_up(website_url)
				except:
					save_website_is_down(website_url)

				if not website_up:
					LOGGER.warning('domain %s is not up, skipping!'%website_url)
					save_website_is_down(website_url)

			LOGGER.info("crawling site %s."%(website_url))
			cmd = crawling_command.replace('SEED_URL', website_url)
			LOGGER.debug(cmd)
			IOModule.run_os_command(cmd, cwd=crawler_command_cwd, timeout= crawling_timeout)
			LOGGER.info("successfully crawled %s."%(website_url)) 

		# dom clobbering
		if config['domclobbering']['enabled']:
			# static analysis
			if config['domclobbering']["passes"]["static"]:
				LOGGER.info("static analysis for site %s."%(website_url))
				# cmd = domc_static_analysis_command.replace('SEED_URL', website_url)
				# IOModule.run_os_command(cmd, cwd=domc_analyses_command_cwd, timeout= static_analysis_timeout)
				domc_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
				LOGGER.info("successfully finished static analysis for site %s."%(website_url)) 

			# static analysis over neo4j
			if config['domclobbering']["passes"]["static_neo4j"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(website_url))
				DOMCTraversalsModule.build_and_analyze_hpg_local(website_url)
				LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(website_url))

			# dynamic verification
			if config['domclobbering']["passes"]["dynamic"]:
				LOGGER.info("Running dynamic verifier for site %s."%(website_url))
				cmd = node_force_execution.replace('SITE_URL', website_url)
				IOModule.run_os_command(cmd, cwd=force_execution_command_cwd, timeout= force_execution_timeout)
				LOGGER.info("Dynamic verification completed for site %s."%(website_url))


		# client-side csrf
		if config['cs_csrf']['enabled']:
			# static analysis
			if config['cs_csrf']["passes"]["static"]:
				LOGGER.info("static analysis for site %s."%(website_url))
				# cmd = cs_csrf_static_analysis_command.replace('SEED_URL', website_url)
				# IOModule.run_os_command(cmd, cwd=cs_csrf_analyses_command_cwd, timeout= static_analysis_timeout)
				csrf_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
				LOGGER.info("successfully finished static analysis for site %s."%(website_url)) 

			# static analysis over neo4j
			if config['cs_csrf']["passes"]["static_neo4j"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(website_url))
				CSRFTraversalsModule.build_and_analyze_hpg(website_url)
				LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(website_url))
	

		# request hijacking
		if config['request_hijacking']['enabled']:
			# static analysis
			if config['request_hijacking']["passes"]["static"]:
				LOGGER.info("static analysis for site %s."%(website_url))
				rh_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
				LOGGER.info("successfully finished static analysis for site %s."%(website_url)) 

			# static analysis over neo4j
			if config['request_hijacking']["passes"]["static_neo4j"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(website_url))
				request_hijacking_neo4j_analysis_api.build_and_analyze_hpg(website_url, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite=static_analysis_overwrite_hpg)
				LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(website_url))

			# dynamic verification
			if config['request_hijacking']['passes']['verification']:
				LOGGER.info("dynamic data flow verification for site %s."%(website_url))
				cmd = node_dynamic_verifier.replace("SEED_URL", website_url)
				request_hijacking_verification_api.start_verification_for_site(cmd, website_url, cwd=dynamic_verifier_command_cwd, timeout=verification_pass_timeout, overwrite=False)
				LOGGER.info("sucessfully finished dynamic data flow verification for site %s."%(website_url))


	else: 
		
		testbed_filename = BASE_DIR.rstrip('/') + config["testbed"]["sitelist"].strip().strip('\n').strip()
		from_row = int(config["testbed"]["from_row"])
		to_row = int(config["testbed"]["to_row"])

		chunksize = 10**5
		iteration = 0
		done = False
		for chunk_df in pd.read_csv(testbed_filename, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
			if done:
				break

			iteration = iteration + 1
			LOGGER.info("starting to crawl chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
			
			reverse_chunk_df = chunk_df[::-1]

			for (index, row) in reverse_chunk_df.iterrows():
				g_index = iteration*index+1
				if g_index >= from_row and g_index <= to_row:

					website_rank = row[0]
					website_url = 'http://' + row[1]
					

					if domain_health_check:
						LOGGER.info('checking if domain is up with python requests ...')
						website_up = False

						try:
							website_up = is_website_up(website_url)
						except:
							save_website_is_down(website_url)
							continue

						if not website_up:
							LOGGER.warning('domain %s is not up, skipping!'%website_url)
							save_website_is_down(website_url)
							continue

					# crawling
					if (config['domclobbering']['enabled'] and config['domclobbering']["passes"]["crawling"]) or \
						(config['cs_csrf']['enabled'] and config['cs_csrf']["passes"]["crawling"]) or \
						(config['request_hijacking']['enabled'] and config['request_hijacking']["passes"]["crawling"]):

						LOGGER.info("crawling site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						cmd = crawling_command.replace('SEED_URL', website_url)
						IOModule.run_os_command(cmd, cwd=crawler_command_cwd, timeout= crawling_timeout)
						LOGGER.info("successfully crawled %s - %s"%(website_rank, website_url)) 

					# dom clobbering
					if config['domclobbering']['enabled']:
						# static analysis
						if  config['domclobbering']["passes"]["static"]:
							LOGGER.info("static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
							# cmd = domc_static_analysis_command.replace('SEED_URL', website_url)
							# IOModule.run_os_command(cmd, print_stdout=False, cwd=domc_analyses_command_cwd, timeout= static_analysis_timeout)
							domc_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
							LOGGER.info("successfully finished static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						
						if  config['domclobbering']["passes"]["static_neo4j"]:
							LOGGER.info("HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 
							DOMCTraversalsModule.build_and_analyze_hpg_local(website_url)
							LOGGER.info("finished HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 

						# dynamic verification
						if  config['domclobbering']["passes"]["dynamic"]:
							LOGGER.info("Running dynamic verifier for site %s - %s"%(website_rank, website_url)) 
							cmd = node_force_execution.replace('SITE_URL', website_url)
							IOModule.run_os_command(cmd, cwd=force_execution_command_cwd, timeout= force_execution_timeout)
							LOGGER.info("Dynamic verification completed for site %s - %s"%(website_rank, website_url)) 


					# client-side csrf
					if config['cs_csrf']['enabled']:
						# static analysis
						if config['cs_csrf']["passes"]["static"]:
							LOGGER.info("static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
							# cmd = cs_csrf_static_analysis_command.replace('SEED_URL', website_url)
							# IOModule.run_os_command(cmd, print_stdout=False, cwd=cs_csrf_analyses_command_cwd, timeout= static_analysis_timeout)
							csrf_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
							LOGGER.info("successfully finished static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						
						if config['cs_csrf']["passes"]["static_neo4j"]:
							LOGGER.info("HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 
							CSRFTraversalsModule.build_and_analyze_hpg(website_url)
							LOGGER.info("finished HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 



					# request hijacking
					if config['request_hijacking']['enabled']:
						# static analysis
						if config['request_hijacking']["passes"]["static"]:
							LOGGER.info("static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
							rh_sast_model_construction_api.start_model_construction(website_url, iterative_output=iterative_output, memory=static_analysis_memory, timeout=static_analysis_per_webpage_timeout, compress_hpg=static_analysis_compress_hpg, overwrite_hpg=static_analysis_overwrite_hpg)
							LOGGER.info("successfully finished static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						
						if config['request_hijacking']["passes"]["static_neo4j"]:
							LOGGER.info("HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 
							request_hijacking_neo4j_analysis_api.build_and_analyze_hpg(website_url, timeout=static_analysis_per_webpage_timeout, overwrite=static_analysis_overwrite_hpg, compress_hpg=static_analysis_compress_hpg)
							LOGGER.info("finished HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 

						# dynamic verification
						if config['request_hijacking']['passes']['verification']:
							LOGGER.info("dynamic data flow verification for site %s - %s"%(website_rank, website_url))
							cmd = node_dynamic_verifier.replace("SITE_URL", website_url)
							request_hijacking_verification_api.start_verification_for_site(cmd, website_url, cwd=dynamic_verifier_command_cwd, timeout=verification_pass_timeout, overwrite=False)
							LOGGER.info("sucessfully finished dynamic data flow verification for site %s - %s"%(website_rank, website_url))


				# if g_index > to_row :
				if g_index < from_row:
					done = True
					LOGGER.info("successfully tested sites, terminating!") 
					break

if __name__ == "__main__":
	main()
