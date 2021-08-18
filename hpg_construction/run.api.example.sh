#!/bin/sh
# this will create a property graph for the JavaScript file (default name: `js_program.js`) 
# located under `outputs/test_website/test_webpage` folder
python3 -m hpg_construction.api $(pwd)/hpg_construction/outputs/test_website/test_webpage --hybrid=false