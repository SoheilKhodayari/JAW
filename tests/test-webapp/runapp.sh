#!/usr/bin/env bash
screen -dmS jawwebapp bash -c 'PORT=6789 npm run devstart; exec sh'
