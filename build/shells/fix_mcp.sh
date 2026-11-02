#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Repair and register the sharpishly Python MCP servers for Claude Code.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_APP_DIR="${PROJECT_ROOT}/app/python"
MCP_DIR="${PROJECT_ROOT}/build/mcp"
VENV_DIR="${MCP_DIR}/.venv"
VENV_PYTHON="${VENV_DIR}/bin/python3"
ROUTER="${PYTHON_APP_DIR}/index.py"

echo "[1/7] Checking project files..."

if [[ ! -f "${ROUTER}" ]]; then
    echo "[ERROR] Router not found: ${ROUTER}" >&2
    exit 1
fi

if [[ ! -f "${PYTHON_APP_DIR}/app/controllers/calculator_controller.py" ]]; then
    echo "[ERROR] Calculator controller not found." >&2
    exit 1
fi

if [[ ! -f "${PYTHON_APP_DIR}/app/controllers/gmail_controller.py" ]]; then
    echo "[ERROR] Gmail controller not found." >&2
    exit 1
fi

echo "[2/7] Creating Python virtual environment..."

if [[ ! -x "${VENV_PYTHON}" ]]; then
    rm -rf "${VENV_DIR}"
    python3 -m venv "${VENV_DIR}"
fi

if [[ ! -x "${VENV_PYTHON}" ]]; then
    echo "[ERROR] Virtual environment Python was not created: ${VENV_PYTHON}" >&2
    exit 1
fi

echo "[3/7] Upgrading pip and installing MCP dependencies..."

"${VENV_PYTHON}" -m pip install --upgrade pip
"${VENV_PYTHON}" -m pip install "mcp[cli]"

echo "[4/7] Validating Python syntax..."

"${VENV_PYTHON}" -m compileall -q "${PYTHON_APP_DIR}"

echo "[5/7] Testing MCP stdio server lifecycle..."

timeout 3 "${VENV_PYTHON}" "${ROUTER}" /py/calculator/mcp >/dev/null 2>&1
calculator_status=$?

if [[ "${calculator_status}" -ne 124 ]]; then
    echo "[ERROR] Calculator MCP server exited before timeout (status ${calculator_status})." >&2
    echo "Run this for details:" >&2
    echo "  ${VENV_PYTHON} ${ROUTER} /py/calculator/mcp" >&2
    exit 1
fi

timeout 3 "${VENV_PYTHON}" "${ROUTER}" /py/gmail/mcp >/dev/null 2>&1
gmail_status=$?

if [[ "${gmail_status}" -ne 124 ]]; then
    echo "[ERROR] Gmail MCP server exited before timeout (status ${gmail_status})." >&2
    echo "Run this for details:" >&2
    echo "  ${VENV_PYTHON} ${ROUTER} /py/gmail/mcp" >&2
    exit 1
fi

echo "[6/7] Re-registering MCP servers with Claude Code..."

if command -v claude >/dev/null 2>&1; then
    claude mcp remove --scope user calculator >/dev/null 2>&1 || true
    claude mcp remove --scope user gmail >/dev/null 2>&1 || true

    claude mcp add --scope user --transport stdio calculator -- \
        "${VENV_PYTHON}" \
        "${ROUTER}" \
        /py/calculator/mcp

    claude mcp add --scope user --transport stdio gmail -- \
        "${VENV_PYTHON}" \
        "${ROUTER}" \
        /py/gmail/mcp
else
    echo "[WARN] Claude Code CLI not found; skipping registration." >&2
fi

echo "[7/7] Final connection check..."

claude mcp list || true

echo ""
echo "✅ Repair complete."
echo "Python interpreter: ${VENV_PYTHON}"
echo "Router: ${ROUTER}"
echo ""
echo "If both servers show as connected, start Claude Code and run /mcp."
