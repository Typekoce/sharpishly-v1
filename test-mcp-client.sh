#!/usr/bin/env bash
set -euo pipefail

cd app/python

PORT=1966
BASE="http://127.0.0.1:${PORT}"

VENV_DIR="../../build/mcp/.venv"
PYTHON_BIN="${VENV_DIR}/bin/python"

if [ ! -x "${PYTHON_BIN}" ]; then
  echo "ERROR: Virtual environment Python not found at ${PYTHON_BIN}" >&2
  exit 1
fi

"${PYTHON_BIN}" -m uvicorn api:app \
  --host 127.0.0.1 \
  --port "${PORT}" &
UVICORN_PID=$!

cleanup() {
  kill "${UVICORN_PID}" 2>/dev/null || true
  wait "${UVICORN_PID}" 2>/dev/null || true
}
trap cleanup EXIT

# Wait until the server responds, up to 10 seconds
for _ in $(seq 1 20); do
  if curl -fsS "${BASE}/home/index" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "${BASE}/home/index" >/dev/null 2>&1; then
  echo "ERROR: Uvicorn did not become ready on port ${PORT}" >&2
  exit 1
fi

echo "--- Home Index ---"
curl -s "${BASE}/home/index" | "${PYTHON_BIN}" -m json.tool

echo -e "\n--- MCP Tools Discovery & Validation ---"
TOOLS_RESPONSE=$(curl -s "${BASE}/mcp/tools")
echo "${TOOLS_RESPONSE}" | "${PYTHON_BIN}" -m json.tool

echo "${TOOLS_RESPONSE}" | "${PYTHON_BIN}" -c '
import json, sys
data = json.load(sys.stdin)
names = {tool.get("name") for tool in data.get("tools", [])}
expected = {"calculator", "stock_quote", "gmail"}
missing = expected - names
assert not missing, f"Missing tools: {missing}"
print("MCP tool discovery assertion passed.")
'

echo -e "\n--- Calculator Tool Execution ---"
CALC_RESPONSE=$(curl -s -X POST "${BASE}/mcp/execute" \
  -H "Content-Type: application/json" \
  -d '{"tool": "calculator", "args": {"expression": "10 + 5 * 2"}}')

echo "${CALC_RESPONSE}" | "${PYTHON_BIN}" -m json.tool

echo "${CALC_RESPONSE}" | "${PYTHON_BIN}" -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("status") == "success", data
assert data["output"]["result"] == 20, data
print("Calculator assertion passed.")
'

echo -e "\n--- Stock Quote Tool Execution ---"
QUOTE_RESPONSE=$(curl -s -X POST "${BASE}/mcp/execute" \
  -H "Content-Type: application/json" \
  -d '{"tool": "stock_quote", "args": {"ticker": "AAPL"}}')

echo "${QUOTE_RESPONSE}" | "${PYTHON_BIN}" -m json.tool

echo "${QUOTE_RESPONSE}" | "${PYTHON_BIN}" -c '
import json, sys
data = json.load(sys.stdin)
assert data.get("status") == "success", data
output = data.get("output", {})
assert output.get("ticker", "").upper() == "AAPL", output
assert "price" in output, output
print("Stock quote assertion passed.")
'

echo -e "\n--- Gmail Tool Execution ---"
GMAIL_RESPONSE=$(curl -s -X POST "${BASE}/mcp/execute" \
  -H "Content-Type: application/json" \
  -d '{"tool": "gmail", "args": {"action": "search", "query": "from:me newer_than:1d"}}')

echo "${GMAIL_RESPONSE}" | "${PYTHON_BIN}" -m json.tool

echo "${GMAIL_RESPONSE}" | "${PYTHON_BIN}" -c '
import json, sys
data = json.load(sys.stdin)
# Verify it returns a controlled JSON structure (either success or structured error)
assert "status" in data, data
print("Gmail tool response validation passed.")
'