#!/usr/bin/env bash
set -euo pipefail

JOBS_DIR="${JOBS_DIR:-./jobs}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:8080/api/trigger}"

check_deps() {
    local missing=()
    for cmd in inotifywait curl; do
        command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
    done
    if ((${#missing[@]})); then
        echo "Error: missing required tools: ${missing[*]}" >&2
        exit 1
    fi
}

is_valid_file() {
    local filepath=$1
    local filename=${filepath##*/}

    # Skip hidden files, directories, and common editor/temp files
    [[ $filename == .* ]] && return 1
    [[ -d $filepath ]] && return 1
    [[ ! -f $filepath ]] && return 1
    [[ $filename == *~ || $filename == *.tmp || $filename == *.swp ]] && return 1

    return 0
}

# Safe JSON string escaping
json_escape() {
    local s=$1
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\n'/\\n}
    s=${s//$'\r'/\\r}
    s=${s//$'\t'/\\t}
    printf '%s' "$s"
}

send_webhook() {
    local filename=$1
    local payload

    printf -v payload '{"file":"%s"}' "$(json_escape "$filename")"

    echo "$(date '+%F %T') Processing: $filename"

    local http_code
    http_code=$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST \
        -H 'Content-Type: application/json' \
        -d "$payload" \
        "$WEBHOOK_URL")

    if [[ $http_code == 2* ]]; then
        echo "$(date '+%F %T') Webhook OK (HTTP $http_code)"
    else
        echo "$(date '+%F %T') Webhook FAILED (HTTP $http_code)" >&2
        return 1
    fi
}

cleanup() {
    echo -e "\nStopping watcher..."
    exit 0
}

main() {
    trap cleanup INT TERM

    mkdir -p "$JOBS_DIR"
    check_deps

    echo "Watching $JOBS_DIR for new files... (Ctrl-C to stop)"

    inotifywait -m -q -e create -e moved_to --format '%w%f' "$JOBS_DIR" |
    while IFS= read -r filepath; do
        if is_valid_file "$filepath"; then
            send_webhook "${filepath##*/}" || true
        fi
    done
}

main "$@"
