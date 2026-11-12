#!/bin/bash

clear

export PS1='\W \$ '

line='--------------'

echo $line"Start jobs"

cd app/php/src/cmd/

./job.sh

cd ../../../..

pwd

echo $line"start MCP"

./build/shells/start-mcp-client.sh

echo $line"start himalaya"

./start-himalaya.sh

echo $line"start worker email"

./background_worker.sh