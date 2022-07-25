#!/usr/bin/env bash
screen -dmS s1 bash -c 'python3 -m run_pipeline --conf=config.yaml; exec sh'
