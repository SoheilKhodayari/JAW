#!/usr/bin/env bash
screen -dmS verificationservice bash -c 'PORT=3456 npm run devstart; exec sh'
