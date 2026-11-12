#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/email-send-worker.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Another email worker is already running."
    exit 0
fi

STORAGE_DIR="storage/email/send"
PROCESSED_DIR="storage/email/processed"
FAILED_DIR="storage/email/failed"
LOG_DIR="storage/email/logs"

mkdir -p "$STORAGE_DIR" "$PROCESSED_DIR" "$FAILED_DIR" "$LOG_DIR"

shopt -s nullglob
files=("$STORAGE_DIR"/*.json)

if [ ${#files[@]} -eq 0 ]; then
    echo "No email job files found in $STORAGE_DIR."
    exit 0
fi

for file in "${files[@]}"; do
    filename=$(basename "$file")
    log_file="$LOG_DIR/${filename%.json}.log"

    echo "Processing email job: $filename"

    if python3 app/python/send_email_job.py "$file" >"$log_file" 2>&1; then
        echo "Successfully sent email for job: $filename"
        mv -n "$file" "$PROCESSED_DIR/$filename"
    else
        status=$?
        echo "Error sending email for job: $filename (exit code $status). Moving to failed directory."
        cat "$log_file" >&2
        mv -n "$file" "$FAILED_DIR/$filename"
    fi
done