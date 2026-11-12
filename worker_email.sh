#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/email-send-worker.lock"
exec 9>>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Another email worker is already running."
    exit 0
fi

STORAGE_DIR="storage/email/send"
PROCESSED_DIR="storage/email/processed"
FAILED_DIR="storage/email/failed"
LOG_DIR="storage/email/logs"

mkdir -p "$STORAGE_DIR" "$PROCESSED_DIR" "$FAILED_DIR" "$LOG_DIR"

move_without_collision() {
    local source_file="$1"
    local destination_dir="$2"
    local filename="$(basename "$source_file")"
    local stem="${filename%.*}"
    local extension="${filename##*.}"
    local destination="$destination_dir/$filename"
    local suffix=0

    while [ -e "$destination" ]; do
        suffix=$((suffix + 1))
        destination="$destination_dir/${stem}.${suffix}.${extension}"
    done

    mv -- "$source_file" "$destination"
}

shopt -s nullglob
files=("$STORAGE_DIR"/*.json)
shopt -u nullglob

for file in "${files[@]}"; do
    filename=$(basename "$file")
    log_file="$LOG_DIR/${filename%.json}.log"

    echo "Processing email job: $filename"

    if python3 app/python/send_email_job.py "$file" >>"$log_file" 2>&1; then
        echo "Successfully sent email for job: $filename"
        move_without_collision "$file" "$PROCESSED_DIR"
    else
        status=$?
        echo "Error sending email for job: $filename (exit code $status). Moving to failed directory."
        move_without_collision "$file" "$FAILED_DIR"
    fi
done