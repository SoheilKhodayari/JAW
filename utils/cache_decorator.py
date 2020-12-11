
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


	A Function Memoization Decorator:
	-----------------------
		1. Set up a cache data structure for function results
		2. Every time the function is called, do one of the following:
			2.1. Return the cached result, if any; or
			2.2. Call the function to compute the missing result, and then update the cache
	
	Usage
	-----------------------
	>> memoized_func = memozie(my_function)


	Important Note:
	-----------------------
	You can also use the default @functools.lru_cache decorator over this custom version
		>> import functools
		>> 
			@functools.lru_cache(maxsize=128)
			def my_function():
				...
	
	Thanks to:
	-----------------------
	https://dbader.org/blog/python-memoization
	https://stackoverflow.com/questions/1988804/what-is-memoization-and-how-can-i-use-it-in-python

"""

def memoize(func):
    cache = dict()

    def memoized_func(*args):
        if args in cache:
            return cache[args]
        result = func(*args)
        cache[args] = result
        return result

    return memoized_func


