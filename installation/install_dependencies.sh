# install python3 dependencies
pip3 install -r requirements.txt

# install nodejs dependencies
(cd hpg_construction && npm install)
(cd hpg_construction/lib/jaw/dom-points-to && npm install)
(cd hpg_construction/lib/jaw/normalization && npm install)


