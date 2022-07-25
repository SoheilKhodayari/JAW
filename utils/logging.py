# -*- coding: utf-8 -*-

"""
    Copyright (C) 21  Soheil Khodayari, CISPA
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
    Logging module
    

    Usage:
    ------------
    > from utils.logging import logger
    > logger.debug("message")
    > logger.info("message")
    > logger.warning("message")
    > logger.error("message")
    > logger.critical("message")
"""


import logging
from datetime import datetime

def get_current_timestamp():
    
    """
    @return {string} current date and time string
    """
    
    now = datetime.now()
    dt_string = now.strftime("%d-%m-%Y_%H-%M-%S")
    return dt_string


class LogFormatter(logging.Formatter):

    """
    Custom Logging Formatter
    """

    grey = "\x1b[38;21m"
    green = "\x1b[1;32m"
    yellow = "\x1b[33;21m"
    red = "\x1b[31;21m"
    bold_red = "\x1b[31;1m"
    blue = "\x1b[1;34m"
    light_blue = "\x1b[1;36m"
    purple = "\x1b[1;35m"
    reset = "\x1b[0m"
    format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s (%(filename)s:%(lineno)d)"

    FORMATS = {
        logging.DEBUG: blue + format + reset,
        logging.INFO: grey + format + reset,
        logging.WARNING: yellow + format + reset,
        logging.ERROR: red + format + reset,
        logging.CRITICAL: bold_red + format + reset
    }

    def format(self, record):
        
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)



logger = logging.getLogger("JAW")
logger.setLevel(logging.DEBUG)

## stdout
ch = logging.StreamHandler()

## log to file
# ch = logging.FileHandler('logs/logs_%s.log'%get_current_timestamp())

ch.setLevel(logging.DEBUG)
ch.setFormatter(LogFormatter())
logger.addHandler(ch)







