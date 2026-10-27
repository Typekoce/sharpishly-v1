#!/bin/bash

clear

line='--------------'

echo "Start jobs"

cd app/php/src/cmd/

./job.sh

cd ../../../..

pwd
