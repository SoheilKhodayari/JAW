# -*- coding: utf-8 -*-

"""

	Copyright (C) 2020  Soheil Khodayari, CISPA
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
	---------------
	runs a ineo command for neo4j management as specified in the ineo documentation

	Usage Example:
	---------------
	$ python3 -m ineo.api --command='INEO_BIN stop -q'
	
	> the above command, for example, stops all neo4j instances



"""


import os
import sys
import time
import argparse

import constants as constantsModule
from utils.io import run_os_command
from utils.logging import logger


def main():

	p = argparse.ArgumentParser(description='This script clusters webpages based on their similarly.')

	p.add_argument('--command', "-C",
		  help='ineo command to execute',
		  type=str)

	args= vars(p.parse_args())
	command = args["command"]


	INEO_BIN = constantsModule.INEO_BIN
	command = command.replace("INEO_BIN", INEO_BIN)
	run_os_command(command)


if __name__ == "__main__":
	main()





