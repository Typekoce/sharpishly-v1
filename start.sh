#!/bin/bash

clear

sudo chown -R seaview:www-data storage/email/
chmod -R 775 storage/email/

export PS1='\W \$ '

line='--------------'

echo $line"Start jobs"

cd app/php/src/cmd/

./job.sh

cd ../../../..

pwd

echo $line"start MCP"

# chmod +x start-mcp-client.sh
# ./start-mcp-client.sh

echo $line"start himalaya"

./start-himalaya.sh

echo $line"start worker email"

./background_worker.sh