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
	filter a given list of taintflows based on specific sinks

	Running:
	------------
	$ python3 -m scripts.filter_taint_flows_by_specific_sink --input=$(pwd)/input/taintflows_count_source_filter_loc_hash.json --source_name=loc_hash --sink=xmlhttprequest


	SINK OPTIONS
	------------
			--sink=websocket_url
			--sink=websocket_data
			--sink=eventsource_url
			--sink=fetch_url
			--sink=fetch_data
			--sink=xmlhttprequest_url
			--sink=xmlhttprequest_data
			--sink=xmlhttprequest_sethdr
			--sink=window.open
			--sink=loc_assign
			--sink=script_src

	SOURCE OPTIONS
	------------
			--input=$(pwd)/input/taintflows_count_source_filter_loc_href.json --source_name=loc_href
			--input=$(pwd)/input/taintflows_count_source_filter_loc_hash.json --source_name=loc_hash
			--input=$(pwd)/input/taintflows_count_source_filter_win_name.json --source_name=win_name
			--input=$(pwd)/input/taintflows_count_source_filter_loc_search.json --source_name=loc_search
			--input=$(pwd)/input/taintflows_count_source_filter_doc_referrer.json --source_name=doc_referrer
			--input=$(pwd)/input/taintflows_count_source_filter_doc_baseuri.json --source_name=doc_baseuri
			--input=$(pwd)/input/taintflows_count_source_filter_doc_uri.json --source_name=doc_uri
			--input=$(pwd)/input/taintflows_count_source_filter_pushsub_endpoint.json --source_name=pushsub_endpoint
			--input=$(pwd)/input/taintflows_count_source_filter_message_evt.json --source_name=message_evt
			--input=$(pwd)/input/taintflows_count_source_filter_push_message.json --source_name=push_message

"""

import os, sys
import json
import argparse
import pandas as pd

import utils.io as IOModule
import constants as constantsModule

from utils.logging import logger as LOGGER
import utils.utility as utilityModule



def filter_taint_flows_by_specific_sinks(json_content, target_sinks):
	
	target_sinks = [item.lower() for item in target_sinks]
	out_flows = []
	for taintflow in json_content:
		sink = taintflow["sink"].lower()
		for target_sink in target_sinks:
			if target_sink in sink:
				out_flows.append(taintflow)
				break

	return out_flows



def main():


	p = argparse.ArgumentParser(description='This script clusters webpages based on their similarly.')
	p.add_argument('--input', "-I",
		  metavar="FILE",
		  help='list of sites)',
		  type=str)

	# p.add_argument('--outputs_name', "-O",
	# 	  metavar="FILE",
	# 	  help='name of the file in each webpage to store the taintflow',
	# 	  type=str)

	# p.add_argument('--output_list', "-L",
	# 	  metavar="FILE",
	# 	  help='list of output pages with count of taint flows in JSON format',
	# 	  type=str)

	p.add_argument('--source_name', "-A",
		  help='source name abbreviated',
		  type=str)

	p.add_argument('--sink', "-S",
		  help='the target sink',
		  type=str)

	args= vars(p.parse_args())
	input_file = args["input"]
	source_name = args["source_name"]
	target_sink_input = args["sink"].lower()

	outputs_file_name = "taintflows_filter_%s_%s.json"%(str(source_name), str(target_sink_input))
	output_list_file_name = "taintflows_count_filter_%s_%s.json"%(str(source_name), str(target_sink_input))


	LOGGER.info('started processing the taint flows.')
	
	data = {} 

	if target_sink_input.find("websocket_url") >= 0:
		target_sinks = [ "WebSocket"]

	elif target_sink_input.find("websocket_data") >= 0:
		target_sinks = [ "WebSocket.send"]

	elif target_sink_input.find("eventsource_url") >= 0:
		target_sinks = [ "EventSource"]

	elif target_sink_input.find("fetch_url") >= 0:
		target_sinks = [ "fetch.url"]

	elif target_sink_input.find("fetch_data") >= 0:
		target_sinks = [ "fetch.body"]

	elif target_sink_input.find("xmlhttprequest_url") >= 0:
		target_sinks = ["XMLHttpRequest.open", "XMLHttpRequest.open(url)"]

	elif target_sink_input.find("xmlhttprequest_data") >= 0:
		target_sinks = [ "XMLHttpRequest.send"]

	elif target_sink_input.find("xmlhttprequest_sethdr") >= 0:
		target_sinks = [ "XMLHttpRequest.setRequestHeader"]

	elif target_sink_input.find("window.open") >= 0:
		target_sinks = [ "window.open"]

	elif target_sink_input.find("loc_assign") >= 0:
		target_sinks = ["location.href","location.assign","location.replace"]

	elif target_sink_input.find("script_src") >= 0:
		target_sinks = ["script.src"]
		
	else:
		LOGGER.error('unexpected target sink given as input.')
		sys.exit(1)

	taintflow_file_name = "taintflows_source_filter_%s.json"%str(source_name)

	fd = open(input_file, 'r')
	json_content = json.load(fd)
	fd.close()

	for app_name in json_content:
		for webpage in json_content[app_name]:
			webpage_directory = os.path.join(os.path.join(os.path.join(constantsModule.DATA_DIR, app_name), webpage))
			taintflow_file = os.path.join(webpage_directory, taintflow_file_name)

			taintfile_json_content = {}
			try:
				fp = open(taintflow_file, 'r')
				taintfile_json_content = json.load(fp)
				fp.close()
			except:
				LOGGER.warning('JSON parsing error for %s'%taintflow_file)

			flows = filter_taint_flows_by_specific_sinks(taintfile_json_content, target_sinks)
			filtered_taint_file_name = os.path.join(webpage_directory, outputs_file_name)

			with open(filtered_taint_file_name, 'w+') as fd:
				json.dump(flows, fd, ensure_ascii=False, indent=4)


			count_filtered_taintflows = len(flows)
			if count_filtered_taintflows > 0:
				if app_name not in data:
					data[app_name] = {}
				data[app_name][webpage] = count_filtered_taintflows


	with open(os.path.join(constantsModule.OUTPUTS_DIR, output_list_file_name), 'w+') as fd:
		json.dump(data, fd, ensure_ascii=False, indent=4)
	LOGGER.info('finished.')


main()









