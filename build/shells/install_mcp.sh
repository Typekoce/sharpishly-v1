#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Sharpishly MCP Provisioner & Architecture Installer
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_APP_DIR="${PROJECT_ROOT}/app/python"
MCP_VENV_DIR="${PROJECT_ROOT}/build/mcp/.venv"
VENV_PYTHON="${MCP_VENV_DIR}/bin/python3"

echo "[1/6] Setting up target directories..."
mkdir -p "${PYTHON_APP_DIR}/app/core"
mkdir -p "${PYTHON_APP_DIR}/app/controllers"
mkdir -p "${PYTHON_APP_DIR}/app/models"
mkdir -p "${PYTHON_APP_DIR}/app/views"
mkdir -p "${PROJECT_ROOT}/build/mcp"

echo "[2/6] Provisioning Python virtual environment..."
if [ ! -d "${MCP_VENV_DIR}" ]; then
    python3 -m venv "${MCP_VENV_DIR}"
fi

"${VENV_PYTHON}" -m pip install --upgrade pip > /dev/null 2>&1
"${VENV_PYTHON}" -m pip install mcp httpx > /dev/null 2>&1

echo "[3/6] Generating MVC Core & Router..."

# Create app/core/app.py
cat << 'EOF' > "${PYTHON_APP_DIR}/app/core/app.py"
import asyncio
import importlib
import inspect
import os
import re
import sys
import urllib.parse

class App:
    def __init__(self, request_uri: str | None = None):
        if request_uri is None:
            request_uri = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("REQUEST_URI", "/")

        self.uri_path = urllib.parse.urlparse(request_uri).path.strip("/")

        if self.uri_path.startswith("py/"):
            self.uri_path = self.uri_path[3:]

    def dispatch(self):
        parts = [p for p in self.uri_path.split("/") if p]

        controller_name = parts[0] if parts else "home"
        action_name = parts[1] if len(parts) > 1 else "index"
        params = parts[2:]

        if not re.fullmatch(r"[a-z][a-z0-9_]*", controller_name):
            raise ValueError(f"Invalid controller name: {controller_name}")

        if not re.fullmatch(r"[a-z][a-z0-9_]*", action_name) or action_name.startswith("_"):
            raise ValueError(f"Invalid action name: {action_name}")

        module_path = f"app.controllers.{controller_name}_controller"
        class_name = f"{controller_name.capitalize()}Controller"

        module = importlib.import_module(module_path)
        controller_cls = getattr(module, class_name)
        controller = controller_cls()

        if not hasattr(controller, action_name):
            raise AttributeError(f"Action '{action_name}' not found on {class_name}")

        method = getattr(controller, action_name)
        result = method(*params)

        if inspect.iscoroutine(result):
            return asyncio.run(result)

        return result
EOF

# Create index.py entry point
cat << 'EOF' > "${PYTHON_APP_DIR}/index.py"
#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.core.app import App

if __name__ == "__main__":
    router = App()
    router.dispatch()
EOF
chmod +x "${PYTHON_APP_DIR}/index.py"

echo "[4/6] Generating MVC Controllers..."

# Create calculator_controller.py
cat << 'EOF' > "${PYTHON_APP_DIR}/app/controllers/calculator_controller.py"
import json
import ast
import operator

class CalculatorController:
    def evaluate_expression(self, expr: str):
        operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Mod: operator.mod,
            ast.USub: operator.neg,
        }

        def _eval_node(node):
            if isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
                    return node.value
                raise ValueError("Only numeric constants are allowed.")
            elif isinstance(node, ast.BinOp):
                left = _eval_node(node.left)
                right = _eval_node(node.right)
                op_type = type(node.op)
                if op_type in operators:
                    return operators[op_type](left, right)
                raise ValueError(f"Unsupported binary operator: {op_type.__name__}")
            elif isinstance(node, ast.UnaryOp):
                operand = _eval_node(node.operand)
                op_type = type(node.op)
                if op_type in operators:
                    return operators[op_type](operand)
                raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
            else:
                raise ValueError(f"Unsupported AST node: {type(node).__name__}")

        try:
            parsed = ast.parse(expr, mode='eval')
            return _eval_node(parsed.body)
        except Exception as e:
            return f"Calculation Error: {str(e)}"

    def index(self):
        print(json.dumps({"status": "ok", "controller": "CalculatorController", "action": "index"}))

    async def mcp(self):
        from mcp.server import Server
        import mcp.types as types
        from mcp.server.stdio import stdio_server

        server = Server("calculator-mcp")

        @server.list_tools()
        async def handle_list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="calculate",
                    description="Safely evaluate mathematical expressions using an AST visitor.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string", "description": "Math expression (e.g. '10 * 5 + 4')"}
                        },
                        "required": ["expression"]
                    },
                )
            ]

        @server.call_tool()
        async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
            arguments = arguments or {}
            if name == "calculate":
                expr = arguments.get("expression", "")
                result = self.evaluate_expression(expr)
                return [types.TextContent(type="text", text=str(result))]
            raise ValueError(f"Unknown tool: {name}")

        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
EOF

# Create gmail_controller.py
cat << 'EOF' > "${PYTHON_APP_DIR}/app/controllers/gmail_controller.py"
import json
import subprocess
import re

class GmailController:
    def _run_himalaya(self, args: list[str]) -> str:
        try:
            result = subprocess.run(
                ["himalaya"] + args,
                capture_output=True,
                text=True,
                timeout=15,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            return f"Himalaya error (code {e.returncode}): {e.stderr}"
        except FileNotFoundError:
            return "Error: 'himalaya' CLI client is not installed or available in PATH."

    def index(self):
        print(json.dumps({"status": "ok", "service": "gmail", "action": "index"}))

    async def mcp(self):
        from mcp.server import Server
        import mcp.types as types
        from mcp.server.stdio import stdio_server

        server = Server("gmail-mcp")

        @server.list_tools()
        async def handle_list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="list_emails",
                    description="List recent emails from Gmail inbox using himalaya.",
                    inputSchema={
                        "type": "object",
                        "properties": {"limit": {"type": "integer", "default": 10}}
                    },
                ),
                types.Tool(
                    name="read_email",
                    description="Read an email content by ID.",
                    inputSchema={
                        "type": "object",
                        "properties": {"email_id": {"type": "string"}},
                        "required": ["email_id"]
                    },
                )
            ]

        @server.call_tool()
        async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
            arguments = arguments or {}
            if name == "list_emails":
                limit = str(arguments.get("limit", 10))
                output = self._run_himalaya(["envelope", "list", "--page-size", limit])
                return [types.TextContent(type="text", text=output)]
            elif name == "read_email":
                email_id = str(arguments.get("email_id", ""))
                if not re.fullmatch(r"[A-Za-z0-9._-]+", email_id):
                    return [types.TextContent(type="text", text="Error: Invalid email ID format.")]
                output = self._run_himalaya(["message", "read", email_id])
                return [types.TextContent(type="text", text=output)]
            raise ValueError(f"Unknown tool: {name}")

        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
EOF

echo "[5/6] Validating Python Syntax and Router Integrity..."
if [ ! -f "${PYTHON_APP_DIR}/index.py" ]; then
    echo "[ERROR] Router not found at ${PYTHON_APP_DIR}/index.py." >&2
    exit 1
fi

"${VENV_PYTHON}" -m py_compile "${PYTHON_APP_DIR}/app/core/app.py"
"${VENV_PYTHON}" -m py_compile "${PYTHON_APP_DIR}/app/controllers/calculator_controller.py"
"${VENV_PYTHON}" -m py_compile "${PYTHON_APP_DIR}/app/controllers/gmail_controller.py"
"${VENV_PYTHON}" -m py_compile "${PYTHON_APP_DIR}/index.py"

echo "[6/6] Verifying Stdio Server Lifecycle (Timeout Check)..."
timeout 2 "${VENV_PYTHON}" "${PYTHON_APP_DIR}/index.py" /py/calculator/mcp >/dev/null 2>&1 || status=$?
if [ "${status:-0}" -ne 124 ]; then
    echo "[ERROR] Calculator MCP server did not remain running smoothly over stdio." >&2
    exit 1
fi

echo "✓ All checks passed successfully!"
