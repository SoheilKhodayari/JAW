#!/usr/bin/env bash

# neo4j version family
# see https://debian.neo4j.com/ for possible choices 
VERSION='3.5'

wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable' $VERSION | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt-get update
sudo apt-get install neo4j
