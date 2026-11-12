#!/usr/bin/env bash
set -uo pipefail

# Call worker_email.sh on a loop every 10 seconds
while true; do
    ./worker_email.sh
    sleep 10
done