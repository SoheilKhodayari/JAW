#!/usr/bin/env bash

# chromimum
sudo apt install -y chromium-browser

# NPM dependencies
(cd crawler && npm install)
# linux: sudo npm install puppeteer --unsafe-perm=true --allow-root
# linux cd crawler/./node_modules/puppeteer && npm run install

(cd analyses/domclobbering && npm install)
(cd analyses/cs_csrf && npm install)
(cd analyses/request_hijacking && npm install)

(cd engine && npm install)
(cd engine/lib/jaw/dom-points-to && npm install)
(cd engine/lib/jaw/normalization && npm install)
(cd dynamic && npm install)
(cd engine/lib/jaw/aliasing && make)

(cd verifier && npm install)
(cd verifier/service && npm install)

# python package dependencies
sudo apt-get install libgeos-dev

# Python dependencies
pip3 install -r ./requirements.txt

# pigz
sudo apt-get install pigz

## ineo for neo4j management: https://github.com/cohesivestack/ineo
# curl -sSL https://raw.githubusercontent.com/cohesivestack/ineo/v2.1.0/ineo | bash -s install -d $(pwd)/ineo/
# source ~/.bashrc
export INEO_HOME=$(pwd)/ineo/; export PATH=$INEO_HOME/bin:$PATH

# note: java 11 required with neo4j 4.2.3
sudo apt-get install openjdk-11-jdk