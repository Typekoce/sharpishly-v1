#!/usr/bin/env bash
# build/shells/install_fastapi_uvicorn.sh
# Installs FastAPI and Uvicorn into the local project virtual environment.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_PYTHON="${PROJECT_ROOT}/build/mcp/.venv/bin/python3"

if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "[!] MCP virtual environment not found: ${PROJECT_ROOT}/build/mcp/.venv"
  exit 1
fi

echo "=== Installing FastAPI and Uvicorn into MCP virtual environment ==="

"${VENV_PYTHON}" -m pip install --upgrade pip
"${VENV_PYTHON}" -m pip install fastapi "uvicorn[standard]"

echo "=== Verifying installation ==="
"${VENV_PYTHON}" -c "import fastapi, uvicorn; print('FastAPI and Uvicorn installed successfully')"

# Pin dependencies for reproducibility
"${VENV_PYTHON}" -m pip freeze > "${PROJECT_ROOT}/build/mcp/requirements.txt"
echo "=== Pinned requirements to build/mcp/requirements.txt ==="