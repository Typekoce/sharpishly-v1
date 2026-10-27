#!/usr/bin/env bash

set -euo pipefail

log_files=(
    "/var/log/nginx/sharpishly2_access.log"
    "/var/log/nginx/sharpishly_error.log"
)

names="$(printf '%s\n' "${log_files[@]}" | xargs -n1 basename | paste -sd', ' -)"

echo "----------- SHARPISHLY LOGS: tail -F ${names} -----------"

exec sudo tail -n 20 -F "${log_files[@]}"