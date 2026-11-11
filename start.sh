#!/bin/bash

clear

export PS1='\W \$ '

line='--------------'

echo $line"Start jobs"

cd app/php/src/cmd/

./job.sh

cd ../../../..

pwd

echo $"start MCP"

./build/shells/start-mcp.sh