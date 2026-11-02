#!/bin/bash

# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Install required Python libraries
pip3 install numpy pandas sqlalchemy matplotlib

# Download MCP Server package
wget 
https://github.com/microsoft/microsoft-cloud-management/releaseshttps://github.com/microsoft/microsoft-cloud-management/relases/download/7.x.x/mcp-server-x64-7.x.x-linux64.zip

# Extract the downloaded file to /usr/local/bin/
sudo mkdir -p /usr/local/bin
sudo unzip -o cpserver-x64-7.x.x-linux64.zip -d /usr/local/bin/

# Start MCP server using systemd service
sudo systemctl start mcp-server
