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
  Creates multiple config files for parallel runs


  Usage:
  ------------
  $ python3 -m input.generate_config --top=500 --offset=0 --parallel=5 --type=firefox

"""

# native imports
import io
import subprocess
import os
import argparse
from threading import Timer

# custom imports
import constants as constantsModule
import utils.io as IOModule
from utils.logging import logger as LOGGER


# ------------------------------------------------------------------------------------------------------ #
#     Base Config
# ------------------------------------------------------------------------------------------------------ #

base_conf="""
# 1. which webapps to test?
testbed: 
  ## option 1: test a specifc website
  # site: https://google.com
  ## option 2: provide a top-site list (e.g., Alexa, Tranco, etc)
  sitelist: /input/sitelist_final.csv
  from_row: %s
  to_row: %s

# 2. crawler configuration
crawler:
  # max number of urls to visit
  maxurls: 200
  # time budget for crawling each site in seconds
  sitetimeout: 21600 # 6h;
  
  # overwrite already existing crawled data or not
  overwrite: false
 
  # check if domain is up with a python request before spawning a browser instance
  domain_health_check: false
   
  # browser to use for crawling
  browser:
    name: firefox # options are `chrome` (crawler.js) and `firefox` (crawler-taint.js)
    headless: true
    # use foxhound if firefox is enabled (default is true)
    foxhound: true 

# 3. static analysis configuration
staticpass:
  # time budget for static analysis of each site (in seconds)
  sitetimeout: 36000 # 10 hrs
  # enforce a max per webpage timeout when `sitetimeout` is not used (in seconds)
  pagetimeout: 2700
  # max amount of available memory for static analysis per process
  memory: 32000
  # compress the property graph or not
  compress_hpg: true
  # overwrite the existing graphs or not
  overwrite_hpg: false
  # neo4j instance config
  neo4j_user: 'neo4j'
  neo4j_pass: 'root'
  neo4j_http_port: '%s'
  # bolt port will default to http port + 2 with ineo 
  # otherwise, specify another port here
  neo4j_bolt_port: '%s'
  neo4j_use_docker: false

# 4. dynamic analysis configuration
dynamicpass:
  # time budget for dynamic analysis of each site in seconds
  sitetimeout: 10800 # 3 hrs
  # which browser to use
  browser:
    name: chrome
    # use remote browserstack browsers or not
    use_browserstack: false
    browserstack_username: xyz
    browserstack_password: xyz
    browserstack_access_key: xyz
    
# 5. verification pass
verificationpass:
  sitetimeout: 10800 # 3 hrs
  # which browser to use
  browser:
    name: chrome
  endpoint: http://127.0.0.1:3456

# 5. choose the vulnerability analysis component to run
# only one component must have the `enable` option as true
domclobbering:
  enabled: false
  # enable or disable the passes, useful for large-scale analysis 
  # e.g., first crawl all websites, then analyze them,
  # as opposed to crawling and analyzing sequentially at the same time
  passes:
    crawling: false
    static: false
    static_neo4j: false
    dynamic: false


cs_csrf:
  enabled: false
  passes:
    crawling: false
    static: false
    static_neo4j: false
 

request_hijacking:
  enabled: true
  passes:
    crawling: false
    static: false
    static_neo4j: false
    verification: true
"""


# ------------------------------------------------------------------------------------------------------ #
#     Main
# ------------------------------------------------------------------------------------------------------ #

def main():


  BASE_DIR= constantsModule.BASE_DIR

  p = argparse.ArgumentParser(description='This script runs the tool pipeline.')



  p.add_argument('--top', "-N",
          default=500,
          help='top N websites to test from the site list(default: %(default)s)',
          type=int)

  p.add_argument('--offset', "-O",
          default=0,
          help='initial offset for the top N websites (default: %(default)s)',
          type=int)


  p.add_argument('--parallel', "-P",
          default=5,
          help='number of parallel instances for testing (default: %(default)s)',
          type=int)


  p.add_argument('--type', "-T",
          default='firefox',
          help='type of the crawler; options are `firefox` and `chrome`; (default: %(default)s)',
          type=str)


  CRAWLER_TYPE_CHROME = 'chrome'
  CRAWLER_TYPE_FIREFOX = 'firefox'


  args= vars(p.parse_args())
  offset = args["offset"]
  top_n = args["top"]
  parallel_instances = args["parallel"]
  int_testbed_range = int(top_n/parallel_instances)


  crawler_type = args["type"]

  RUN_ALL_FILE_PATH = os.path.join(BASE_DIR, 'run_all.sh');
  STOP_ALL_FILE_PATH = os.path.join(BASE_DIR, 'stop_all.sh')

  # incrementally block three consecutive numbers for each instance (i.e., http, bolt, ssl)  
  http_port_offset = 27474

  with open(RUN_ALL_FILE_PATH, 'w+') as fp1:
    with open(STOP_ALL_FILE_PATH, 'w+') as fp2:
      for i in range(parallel_instances):

        from_row =  str(offset + i*int_testbed_range+1)
        to_row =  str(offset + (i+1)*int_testbed_range)

        http_port = http_port_offset + i*3
        bolt_port = http_port + 2

        filename = 'b'+ str(i+1) + '.conf.yaml'
        file_path = os.path.join(os.path.join(BASE_DIR, 'input/configs'), filename)
        with open(file_path, 'w+') as fd:
          fd.write(base_conf%(from_row, to_row, http_port, bolt_port))

        fp1.write("screen -dmS s%s bash -c 'python3 -m run_pipeline --conf ./input/configs/%s; exec sh'\n"%(str(i+1),filename))
        fp2.write("screen -X -S s%s kill\n"%str(i+1))



      if crawler_type == CRAWLER_TYPE_CHROME:
        fp2.write("""
pkill -f chrome -9
pkill -f chromium-browser -9
pkill -f chromedriver -9
        """)

      if crawler_type == CRAWLER_TYPE_FIREFOX:
        fp2.write("""
pkill -f firefox -9
pkill -f firefox
kill -9 $(ps -x | grep firefox)
        """)


      fp2.write("""
pkill -f 'python3 -m run_pipeline' -9
pkill -f 'python3 -m run_pipeline'
pkill -f 'node --max-old-space-size='
python3 -m ineo.api --command='INEO_BIN stop -q'
rm -rf ./ineo/instances/*
pkill -f 'ineo/instances'
pkill -f 'analyses.request_hijacking.analyze_hpg_api'
        """)

  IOModule.run_os_command('chmod +x %s'%RUN_ALL_FILE_PATH)
  IOModule.run_os_command('chmod +x %s'%STOP_ALL_FILE_PATH)



if __name__ == "__main__":
  main()




