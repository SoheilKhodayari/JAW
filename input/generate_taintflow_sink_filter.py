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
  generates bash script that runs multiple instances of `scripts.filter_taint_flows_by_sink_parallel` script 


  Usage:
  ------------
  $ python3 -m input.generate_taintflow_sink_filter --parallel=100 --sitelist=$(pwd)/input/sitelist_crawled.csv

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

	p = argparse.ArgumentParser(description='This script runs the tool pipeline.')


	p.add_argument('--sitelist', "-I",
	  metavar="FILE",
	  help='list of sites',
	  type=str)

	p.add_argument('--parallel', "-P",
		  default=5,
		  help='number of parallel instances for testing (default: %(default)s)',
		  type=int)


	args= vars(p.parse_args())


	sitelist_file_path_name = args["sitelist"]
	fp = open(sitelist_file_path_name, 'r')
	count_sites = len(fp.readlines())
	fp.close()

	parallel_instances = args["parallel"]
	int_testbed_range = int(count_sites/parallel_instances)

	RUN_ALL_FILE_PATH = os.path.join(BASE_DIR, 'run_taintflow_sink_filters.sh');
	STOP_ALL_FILE_PATH = os.path.join(BASE_DIR, 'stop_taintflow_sink_filters.sh')

	offset = 0 

	with open(RUN_ALL_FILE_PATH, 'w+') as fp1:
		with open(STOP_ALL_FILE_PATH, 'w+') as fp2:
			for i in range(parallel_instances):

				from_row =  str(offset + i*int_testbed_range+1)
				to_row =  str(offset + (i+1)*int_testbed_range)

				if i == parallel_instances - 1:
					to_row = count_sites

				cmd = "python3 -m scripts.filter_taint_flows_by_sinks_parallel --input={0} --outputs=taintflows_relevant.json --from={1} --to={2}".format(sitelist_file_path_name, from_row, to_row)
				fp1.write("screen -dmS tsf%s bash -c '%s; exec sh'\n"%(str(i+1),cmd))
				fp2.write("screen -X -S tsf%s kill\n"%str(i+1))


	IOModule.run_os_command('chmod +x %s'%RUN_ALL_FILE_PATH)
	IOModule.run_os_command('chmod +x %s'%STOP_ALL_FILE_PATH)



if __name__ == "__main__":
  main()




