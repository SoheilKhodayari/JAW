#!/usr/bin/env bash

# chromimum
sudo apt install -y chromium-browser

# NPM dependencies
(cd crawler && npm install)
# linux: sudo npm install puppeteer --unsafe-perm=true --allow-root
# linux cd crawler/./node_modules/puppeteer && npm run install

(cd analyses/domclobbering && npm install)
(cd analyses/cs_csrf && npm install)

(cd engine && npm install)
(cd engine/lib/jaw/dom-points-to && npm install)
(cd engine/lib/jaw/normalization && npm install)
(cd dynamic && npm install)

# Python dependencies
pip3 install -r ./requirements.txt

