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
	Generates a bash script that categorizes requests / taint flows based on the tainted position of the sink string


	Usage:
	------------
	$ python3 -m input.generate_req_categorization

"""


# native imports
import io
import subprocess
import os

# custom imports
import constants as constantsModule
from utils.logging import logger as LOGGER


def main():

	BASH_SCRIPT_NAME_RUNNING = "run_req_categorization.sh"
	BASH_SCRIPT_NAME_STOPPING = "stop_req_categorization.sh"

	run_script_full_path_name = os.path.join(constantsModule.BASE_DIR, BASH_SCRIPT_NAME_RUNNING)
	stop_script_full_path_name = os.path.join(constantsModule.BASE_DIR, BASH_SCRIPT_NAME_STOPPING)

	run_script_content_lines = ["#!/usr/bin/env bash"]
	stop_script_content_lines = ["#!/usr/bin/env bash"]


	sources = [
		"loc_href",
		"loc_hash",
		"win_name",
		"loc_search",
		"doc_referrer",
		"doc_baseuri",
		"doc_uri",
		"pushsub_endpoint",
		"message_evt"
	]

	sinks = [
		"websocket_url",
		"websocket_data",
		"eventsource_url",
		"fetch_url",
		"fetch_data",
		"xmlhttprequest_url",
		"xmlhttprequest_data",
		"xmlhttprequest_sethdr",
		"window.open",
		"loc_assign",
		"script_src"
	]

	RUN_COMMAND_TEMPLATE = "screen -dmS cc{0} bash -c 'python3 -m scripts.categorize_reqs_based_on_tainted_params  --source={1} --sink={2}; exec sh'"
	STOP_COMMAND_TEMPLATE = "screen -X -S cc{0} kill"

	screen_counter = 0
	for source in sources:
		for sink in sinks:
			screen_counter = screen_counter + 1
			run_command = RUN_COMMAND_TEMPLATE.format(screen_counter, source, sink)
			run_script_content_lines.append(run_command)

			stop_command = STOP_COMMAND_TEMPLATE.format(screen_counter)
			stop_script_content_lines.append(stop_command)
		run_script_content_lines.append("#")

	run_all_command = "screen -dmS cc{0} bash -c 'python3 -m scripts.categorize_reqs_based_on_tainted_params; exec sh'".format(screen_counter+1)
	run_script_content_lines.append(run_all_command)
	
	stop_all_command = "screen -X -S cc{0} kill".format(screen_counter+1)
	stop_script_content_lines.append(stop_all_command)


	with open(run_script_full_path_name, "w+") as fd:
		for line in run_script_content_lines:
			fd.write(line+"\n")

	with open(stop_script_full_path_name, "w+") as fd:
		for line in stop_script_content_lines:
			fd.write(line+"\n")


if __name__ == "__main__":
	main()