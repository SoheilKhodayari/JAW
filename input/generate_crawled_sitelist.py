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
  Generates a list of crawled websites


  Usage:
  ------------
  $ python3 -m input.generate_crawled_sitelist --input=tranco_N7QWW_unique.csv --output=sitelist_crawled.csv

"""


# native imports
import io
import subprocess
import os
import argparse
import pandas as pd

# custom imports
import constants as constantsModule
from utils.logging import logger as LOGGER



def get_name_from_url(url):
  return url.replace(':', '-').replace('/', '');


def main():

  INPUT_FILE_NAME_DEFAULT = "tranco_N7QWW_unique.csv"
  OUTPUT_FILE_NAME_DEFAULT = "sitelist_crawled.csv"


  p = argparse.ArgumentParser(description='This script generates a list of crawled websites.')
  p.add_argument('--input', "-I",
          metavar="FILE",
          default=INPUT_FILE_NAME_DEFAULT,
          help='top-site list file name (default: %(default)s)',
          type=str)

  p.add_argument('--output', "-O",
          metavar="FILE",
          default=OUTPUT_FILE_NAME_DEFAULT,
          help='output file name (default: %(default)s)',
          type=str)

  args= vars(p.parse_args())
  input_file_name = args["input"]
  output_file_name = args["output"]

  if input_file_name == INPUT_FILE_NAME_DEFAULT:
    input_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), INPUT_FILE_NAME_DEFAULT)

  if output_file_name == OUTPUT_FILE_NAME_DEFAULT:
     output_file_name = os.path.join(os.path.join(constantsModule.BASE_DIR, "input"), OUTPUT_FILE_NAME_DEFAULT)


  chunksize = 10**5
  iteration = 0


  out_rows = []
  new_side_index = 1

  for chunk_df in pd.read_csv(input_file_name, chunksize=chunksize, usecols=[0, 1], header=None, skip_blank_lines=True):

    iteration = iteration + 1
    
    for (index, row) in chunk_df.iterrows():
      g_index = iteration*index+1

      rank = row[0]
      etld_url =row[1].strip().strip('\n').strip()
      url = 'http://' + etld_url
      website_folder_name = get_name_from_url(url)
      website_folder_path_name = os.path.join(constantsModule.DATA_DIR, website_folder_name)
      
      if os.path.exists(website_folder_path_name) and os.path.isdir(website_folder_path_name):
        files = os.listdir(website_folder_path_name)
        if len(files) > 1: # only include the sites crawled correctly (similarly to `utils/clean_data.py` script)
          out_rows.append([str(new_side_index), etld_url, str(rank)])
          new_side_index += 1


  with open(output_file_name, "w+") as fd:
    length = len(out_rows)
    for i in range(length):
      row = out_rows[i]
      row_string = str(','.join(row))
      row_string = row_string.strip().strip('\n').strip()
      if i < length - 1:
        fd.write(row_string + '\n')
      else:
        fd.write(row_string)

if __name__ == "__main__":
  main()