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
	$ python3 -m runme --conf=config.yaml

"""

import argparse
import pandas as pd
import os, sys
import utils.io as IOModule
from utils.logging import logger as LOGGER
import analyses.domclobbering.domc_neo4j_traversals as DOMCTraversalsModule
import analyses.cs_csrf.cs_csrf_neo4j_traversals as CSRFTraversalsModule

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

	if override_site != 'None':
		config["testbed"]["site"] = override_site

	if override_site_list != 'None':
		config["testbed"]["sitelist"] = override_site_list

	if override_site_list_from != -1:
		config["testbed"]["from_row"] = override_site_list_from

	if override_site_list_to != -1:
		config["testbed"]["to_row"] = override_site_list_to


	LOGGER.info("loading config: %s"%str(config))


	crawler_command_cwd = os.path.join(BASE_DIR, "crawler")
	dynamic_verifier_command_cwd = os.path.join(BASE_DIR, "dynamic")


	# crawling
	crawling_command = "node --max-old-space-size=4096 DRIVER_ENTRY --seedurl=SEED_URL --maxurls={0} --browser={1} --headless={2}".format(
		config["crawler"]["maxurls"],
		config["crawler"]["browser"]["name"],
		config["crawler"]["browser"]["headless"]
	)
	
	node_crawler_driver_program = os.path.join(crawler_command_cwd, "crawler.js")
	crawling_command = crawling_command.replace("DRIVER_ENTRY", node_crawler_driver_program)
	crawling_timeout = int(config["crawler"]["sitetimeout"])


	# static analysis config
	static_analysis_timeout = int(config["staticpass"]["sitetimeout"])
	static_analysis_memory = config["staticpass"]["memory"]


	# dom clobbering
	domc_analyses_command_cwd = os.path.join(BASE_DIR, "analyses/domclobbering")
	domc_static_analysis_command = "node --max-old-space-size=%s DRIVER_ENTRY --seedurl=SEED_URL"%static_analysis_memory
	domc_static_analysis_driver_program = os.path.join(domc_analyses_command_cwd, "static_analysis.js")
	domc_static_analysis_command = domc_static_analysis_command.replace("DRIVER_ENTRY", domc_static_analysis_driver_program)
	

	# client-side csrf
	cs_csrf_analyses_command_cwd = os.path.join(BASE_DIR, "analyses/cs_csrf")
	cs_csrf_static_analysis_command = "node --max-old-space-size=%s DRIVER_ENTRY --seedurl=SEED_URL"%static_analysis_memory
	cs_csrf_static_analysis_driver_program = os.path.join(cs_csrf_analyses_command_cwd, "static_analysis.js")
	cs_csrf_static_analysis_command = cs_csrf_static_analysis_command.replace("DRIVER_ENTRY", cs_csrf_static_analysis_driver_program)
	


	## dom clobbering dynamic verifier
	dynamic_verifier_timeout = int(config["dynamicpass"]["sitetimeout"])
	node_dynamic_verfier_command = "node --max-old-space-size=4096 DRIVER_ENTRY --website=SITE_URL --browser={0} --use_browserstack={1}  --browserstack_username={2}  --browserstack_password={3} --browserstack_access_key={4}".format(
		config["dynamicpass"]["browser"]["name"],
		config["dynamicpass"]["browser"]["use_browserstack"],
		config["dynamicpass"]["browser"]["browserstack_username"],
		config["dynamicpass"]["browser"]["browserstack_password"],
		config["dynamicpass"]["browser"]["browserstack_access_key"],
	)
	node_dynamic_verifier_driver_program = os.path.join(dynamic_verifier_command_cwd, 'force_execution.js')
	node_dynamic_verifier = node_dynamic_verfier_command.replace("DRIVER_ENTRY", node_dynamic_verifier_driver_program)
	



	if "site" in config["testbed"]:
		website_url = config["testbed"]["site"]

		# crawling
		if (config['domclobbering']['enabled'] and config['domclobbering']["passes"]["crawling"]) or (config['cs_csrf']['enabled'] and config['cs_csrf']["passes"]["crawling"]):
			LOGGER.info("crawling site %s."%(website_url))
			cmd = crawling_command.replace('SEED_URL', website_url)
			IOModule.run_os_command(cmd, cwd=crawler_command_cwd, timeout= crawling_timeout)
			LOGGER.info("successfully crawled %s."%(website_url)) 

		# dom clobbering
		if config['domclobbering']['enabled']:
			# static analysis
			if config['domclobbering']["passes"]["static"]:
				LOGGER.info("static analysis for site %s."%(website_url))
				cmd = domc_static_analysis_command.replace('SEED_URL', website_url)
				IOModule.run_os_command(cmd, cwd=domc_analyses_command_cwd, timeout= static_analysis_timeout)
				LOGGER.info("successfully finished static analysis for site %s."%(website_url)) 

			# static analysis over neo4j
			if config['domclobbering']["passes"]["static_neo4j"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(website_url))
				DOMCTraversalsModule.build_and_analyze_hpg(website_url)
				LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(website_url))

			# dynamic verification
			if config['domclobbering']["passes"]["dynamic"]:
				LOGGER.info("Running dynamic verifier for site %s."%(website_url))
				cmd = node_dynamic_verifier.replace('SEED_URL', website_url)
				IOModule.run_os_command(cmd, cwd=dynamic_verifier_command_cwd, timeout= dynamic_verifier_timeout)
				LOGGER.info("Dynamic verification completed for site %s."%(website_url))


		# client-side csrf
		if config['cs_csrf']['enabled']:
			# static analysis
			if config['cs_csrf']["passes"]["static"]:
				LOGGER.info("static analysis for site %s."%(website_url))
				cmd = cs_csrf_static_analysis_command.replace('SEED_URL', website_url)
				IOModule.run_os_command(cmd, cwd=cs_csrf_analyses_command_cwd, timeout= static_analysis_timeout)
				LOGGER.info("successfully finished static analysis for site %s."%(website_url)) 

			# static analysis over neo4j
			if config['cs_csrf']["passes"]["static_neo4j"]:
				LOGGER.info("HPG construction and analysis over neo4j for site %s."%(website_url))
				CSRFTraversalsModule.build_and_analyze_hpg(website_url)
				LOGGER.info("finished HPG construction and analysis over neo4j for site %s."%(website_url))
	

	else: 
		
		testbed_filename = BASE_DIR.rstrip('/') + config["testbed"]["sitelist"].strip().strip('\n').strip()
		from_row = int(config["testbed"]["from_row"])
		to_row = int(config["testbed"]["to_row"])

		chunksize = 10**4
		iteration = 0
		done = False
		for chunk_df in pd.read_csv(testbed_filename, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):
			if done:
				break

			iteration = iteration + 1
			LOGGER.info("starting to crawl chunk: %s -- %s"%((iteration-1)*chunksize, iteration*chunksize))
			
			for (index, row) in chunk_df.iterrows():
				g_index = iteration*index+1
				if g_index >= from_row and g_index <= to_row:

					website_rank = row[0]
					website_url = 'http://' + row[1]
					
					# crawling
					if (config['domclobbering']['enabled'] and config['domclobbering']["passes"]["crawling"]) or (config['cs_csrf']['enabled'] and config['cs_csrf']["passes"]["crawling"]):
						LOGGER.info("crawling site %s - %s"%(website_rank, website_url)) 
						cmd = crawling_command.replace('SEED_URL', website_url)
						IOModule.run_os_command(cmd, cwd=crawler_command_cwd, timeout= crawling_timeout)
						LOGGER.info("successfully crawled %s - %s"%(website_rank, website_url)) 

					# dom clobbering
					if config['domclobbering']['enabled']:
						# static analysis
						if  config['domclobbering']["passes"]["static"]:
							LOGGER.info("static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
							cmd = domc_static_analysis_command.replace('SEED_URL', website_url)
							IOModule.run_os_command(cmd, print_stdout=False, cwd=domc_analyses_command_cwd, timeout= static_analysis_timeout)
							LOGGER.info("successfully finished static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						
						if  config['domclobbering']["passes"]["static_neo4j"]:
							LOGGER.info("HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 
							DOMCTraversalsModule.build_and_analyze_hpg(website_url)
							LOGGER.info("finished HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 

						# dynamic verification
						if  config['domclobbering']["passes"]["dynamic"]:
							LOGGER.info("Running dynamic verifier for site %s - %s"%(website_rank, website_url)) 
							cmd = node_dynamic_verifier.replace('SEED_URL', website_url)
							IOModule.run_os_command(cmd, cwd=dynamic_verifier_command_cwd, timeout= dynamic_verifier_timeout)
							LOGGER.info("Dynamic verification completed for site %s - %s"%(website_rank, website_url)) 

					# client-side csrf
					if config['cs_csrf']['enabled']:
						# static analysis
						if config['cs_csrf']["passes"]["static"]:
							LOGGER.info("static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
							cmd = cs_csrf_static_analysis_command.replace('SEED_URL', website_url)
							IOModule.run_os_command(cmd, print_stdout=False, cwd=cs_csrf_analyses_command_cwd, timeout= static_analysis_timeout)
							LOGGER.info("successfully finished static analysis for site at row %s - rank %s - %s"%(g_index, website_rank, website_url)) 
						
						if config['cs_csrf']["passes"]["static_neo4j"]:
							LOGGER.info("HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 
							CSRFTraversalsModule.build_and_analyze_hpg(website_url)
							LOGGER.info("finished HPG construction and analysis over neo4j for site %s - %s"%(website_rank, website_url)) 


				if g_index > to_row:
					done = True
					LOGGER.info("successfully tested sites, terminating!") 
					break

if __name__ == "__main__":
	main()


