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
  Creates a shell script file for parallel running of `scripts.run_verification_module` script


  Usage:
  ------------
  $ python3 -m input.generate_config_verification --offset=0 --parallel=20 --webpages=$(pwd)/input/site_req_pattern_mapping_dast_final_flat.csv

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
#     Main
# ------------------------------------------------------------------------------------------------------ #

def main():


  BASE_DIR= constantsModule.BASE_DIR
  WEBPAGES_LIST_DEFAULT = './input/site_req_patterns_dast_final_flat.csv'

  p = argparse.ArgumentParser(description='Creates a shell script file for parallel running of scripts.run_verification_module.')


  p.add_argument('--offset', "-O",
          default=0,
          help='initial offset for the top N websites (default: %(default)s)',
          type=int)

  p.add_argument('--parallel', "-P",
          default=5,
          help='number of parallel instances for testing (default: %(default)s)',
          type=int)

  p.add_argument('--webpages', "-W",
          default=WEBPAGES_LIST_DEFAULT,
          help='Webpages (default: %(default)s)',
          type=str)


  CRAWLER_TYPE_CHROME = 'chrome'
  CRAWLER_TYPE_FIREFOX = 'firefox'


  args= vars(p.parse_args())
  offset = args["offset"]
  webpages_list_file = args["webpages"]
  fd = open(webpages_list_file, 'r')
  webpages_list = fd.readlines()
  fd.close()
  top_n = len(webpages_list)

  parallel_instances = args["parallel"]
  int_testbed_range = int(top_n/parallel_instances)

  RUN_ALL_FILE_PATH = os.path.join(BASE_DIR, 'run_verification.sh');
  STOP_ALL_FILE_PATH = os.path.join(BASE_DIR, 'stop_verification.sh')

  with open(RUN_ALL_FILE_PATH, 'w+') as fp1:
    with open(STOP_ALL_FILE_PATH, 'w+') as fp2:
      for i in range(parallel_instances):

        from_row =  str(offset + i*int_testbed_range+1)
        to_row =  str(offset + (i+1)*int_testbed_range)

        fp1.write("screen -dmS sc%s bash -c 'python3 -m scripts.run_verification_module --webpages=%s --from=%s --to=%s; exec sh'\n"%(str(i+1), webpages_list_file, from_row, to_row))
        fp2.write("screen -X -S sc%s kill\n"%str(i+1))



      fp2.write("""
pkill -f 'python3 -m run_verification_module' -9
pkill -f 'python3 -m run_verification_module'
pkill -f 'node --max-old-space-size='
        """)

  IOModule.run_os_command('chmod +x %s'%RUN_ALL_FILE_PATH)
  IOModule.run_os_command('chmod +x %s'%STOP_ALL_FILE_PATH)


if __name__ == "__main__":
  main()


