#!/usr/bin/env bash
set -euo pipefail

# clear
clear

# Move to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================="
echo "         SHARPLISHY MCP DEBUG REPORT          "
echo "=============================================="
echo ""

# 1. Check if port 8000 is listening
echo "--> Checking if port 8000 is active (MCP Service):"
if command -v ss >/dev/null 2>&1; then
    if ss -tulpn | grep -q ":8000"; then
        echo "[ACTIVE] Service is listening on port 8000:"
        ss -tulpn | grep ":8000"
    else
        echo "[INACTIVE] Nothing is listening on port 8000. (Causes 502 Bad Gateway)"
    fi
else
    echo "[SKIP] 'ss' command not available."
fi
echo ""

# 2. Test HTTP connectivity to local MCP endpoint
echo "--> Testing HTTP connection to http://127.0.0.1:8000/:"
if command -v curl >/dev/null 2>&1; then
    if curl -s -I --max-time 2 http://127.0.0.1:8000/ >/dev/null 2>&1; then
        echo "[SUCCESS] Successfully connected to MCP server on port 8000."
        curl -s -I --max-time 2 http://127.0.0.1:8000/ | head -n 5
    else
        echo "[FAILED] Connection refused or timed out on http://127.0.0.1:8000/."
    fi
else
    echo "[SKIP] 'curl' command not available."
fi
echo ""

# 3. Check Python and Uvicorn environment
echo "--> Checking Python & Uvicorn availability:"
if [[ -x ".venv/bin/python3" ]]; then
    echo "[FOUND] Local venv Python: .venv/bin/python3"
    .venv/bin/python3 -m uvicorn --version 2>/dev/null && echo "  -> Uvicorn is installed in .venv" || echo "  -> Uvicorn NOT installed in .venv"
elif [[ -x "build/mcp/.venv/bin/python3" ]]; then
    echo "[FOUND] Build venv Python: build/mcp/.venv/bin/python3"
    build/mcp/.venv/bin/python3 -m uvicorn --version 2>/dev/null && echo "  -> Uvicorn is installed in build/mcp/.venv" || echo "  -> Uvicorn NOT installed in build/mcp/.venv"
elif command -v python3 >/dev/null 2>&1; then
    echo "[FOUND] System Python: $(command -v python3)"
    python3 -m uvicorn --version 2>/dev/null && echo "  -> Uvicorn is available via system python3" || echo "  -> Uvicorn NOT installed in system python3"
else
    echo "[ERROR] No usable Python interpreter found."
fi
echo ""

# 4. Inspect recent Nginx logs if accessible
echo "--> Checking recent Nginx Error Logs for sharpishly2:"
NGINX_ERR_LOG="/var/log/nginx/sharpishly2_error.log"
if [[ -f "$NGINX_ERR_LOG" ]]; then
    if [[ -r "$NGINX_ERR_LOG" ]]; then
        tail -n 5 "$NGINX_ERR_LOG"
    else
        echo "[PERMISSION DENIED] Run with sudo to view Nginx logs: sudo $0"
    fi
else
    echo "[INFO] Nginx error log not found at $NGINX_ERR_LOG."
fi

echo ""
echo "=============================================="
echo "               DIAGNOSTIC END                 "
echo "=============================================="
