#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app/python"

cd "$APP_DIR"

# Prefer a virtual environment if present; otherwise use system Python.
if [[ -x "$SCRIPT_DIR/build/mcp/.venv/bin/python3" ]]; then
    PYTHON="$SCRIPT_DIR/build/mcp/.venv/bin/python3"
elif [[ -x "$APP_DIR/.venv/bin/python3" ]]; then
    PYTHON="$APP_DIR/.venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON="$(command -v python3)"
else
    echo "ERROR: No usable Python interpreter found." >&2
    exit 1
fi

echo "Using Python: $PYTHON"
echo "Application directory: $APP_DIR"

if ! "$PYTHON" -c "import uvicorn" >/dev/null 2>&1; then
    echo "ERROR: uvicorn is not installed for $PYTHON." >&2
    echo "Install it with:" >&2
    echo "  $PYTHON -m pip install 'uvicorn[standard]'" >&2
    exit 1
fi

exec "$PYTHON" -m uvicorn api:app \
    --host 127.0.0.1 \
    --port 8000 \
    --app-dir "$APP_DIR" \
    --reload