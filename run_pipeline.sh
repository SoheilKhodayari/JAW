#!/usr/bin/env bash
INEO_HOME=$(pwd)/ineo/ PATH=$INEO_HOME/bin:$PATH screen -dmS s1 bash -c 'python3 -m run_pipeline --conf=config.yaml; exec sh'
