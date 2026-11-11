#!/bin/bash
clear
tail -f /var/log/nginx/sharpishly2_error.log \
 /var/log/nginx/sharpishly2_access.log \
 /var/log/nginx/error.log \
 /var/log/nginx/access.log \
 /var/log/php8.4-fpm.log \
 storage/logs/mcp_error.log \
 app/php/src/cmd/storage/logs/app.log