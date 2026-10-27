#!/usr/bin/env bash
set -euo pipefail

clear

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

RESPONSE=$(curl -s http://sharpishly2.test/php/job/create/)
JOBS=$(echo "$RESPONSE" | jq -r '.jobs')

for worker in $JOBS; do
    nohup php "$PROJECT_DIR/worker.php" "$worker" \
        > "$PROJECT_DIR/storage/jobs/${worker}.json" 2>&1 &
    echo "Started $worker with PID $!"
done

echo "All background workers dispatched. Use 'tail -f worker-*.json' to monitor."