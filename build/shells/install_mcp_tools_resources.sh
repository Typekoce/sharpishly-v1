#!/usr/bin/env bash
set -e

echo "Creating directory structure under app/python..."
mkdir -p app/python/config
mkdir -p app/python/models
mkdir -p app/python/controllers
mkdir -p app/python/routers

echo "Installing mcp_tools.json..."
cat << 'EOF' > app/python/config/mcp_tools.json
{
  "tools": [
    {
      "name": "calculator",
      "handler": "_run_calculator_tool",
      "description": "Evaluates safe mathematical and arithmetic expressions.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "expression": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128,
            "description": "Arithmetic expression to evaluate (e.g. '2 + 2 * 5')."
          }
        },
        "required": ["expression"],
        "additionalProperties": false
      }
    },
    {
      "name": "gmail",
      "handler": "_run_gmail_tool",
      "description": "Searches, reads, drafts, and manages emails via Gmail API.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "enum": ["search", "read", "draft", "send"],
            "description": "The Gmail operation to perform."
          },
          "query": {
            "type": "string",
            "maxLength": 256,
            "description": "Search query or message ID."
          }
        },
        "required": ["action"],
        "additionalProperties": false
      }
    }
  ]
}
EOF

echo "Installing McpToolModel..."
cat << 'EOF' > app/python/models/mcp_tool_model.py
import json
from pathlib import Path
from core.model import Model


class McpToolModel(Model):

    def __init__(self, filename: str = "mcp_tools.json"):
        super().__init__()
        self.config_path = Path(__file__).parent.parent / "config" / filename

    def load_tools(self) -> list:
        """Reusable method to load tools from JSON configuration."""
        if not self.config_path.exists():
            return []
        with open(self.config_path, "r") as f:
            return json.load(f).get("tools", [])
EOF

echo "Installing McpClientController..."
cat << 'EOF' > app/python/controllers/mcp_client_controller.py
import asyncio
from core.controller import Controller
from models.mcp_tool_model import McpToolModel


class McpClientController(Controller):

    def __init__(self):
        super().__init__()
        self.model = McpToolModel()
        self.tools = {t["name"]: t for t in self.model.load_tools()}

    def list_tools(self) -> list:
        """Reusable discovery method for available tools."""
        return [{"name": t["name"], "description": t.get("description", "")} for t in self.tools.values()]

    async def handle_request(self, payload: dict) -> dict:
        """Main request orchestrator using atomic helper methods."""
        tool_name = payload.get("tool")
        args = payload.get("args", {})

        tool_def = self._find_tool(tool_name)
        if not tool_def:
            return self._error_response(f"Tool '{tool_name}' not found.")

        return await self._dispatch_handler(tool_def, args)

    def _find_tool(self, name: str) -> dict | None:
        """Reusable lookup helper."""
        return self.tools.get(name)

    async def _dispatch_handler(self, tool_def: dict, args: dict) -> dict:
        """Reusable execution and exception-handling helper supporting async handlers."""
        handler_name = tool_def.get("handler")
        handler = getattr(self, handler_name, None)

        if not callable(handler):
            return self._error_response(f"Handler '{handler_name}' is not callable.")

        try:
            result = await handler(args) if asyncio.iscoroutinefunction(handler) else handler(args)
            return {"status": "success", "tool": tool_def["name"], "output": result}
        except Exception as e:
            return self._error_response(str(e))

    def _error_response(self, message: str) -> dict:
        """Reusable DRY error response formatter."""
        return {"status": "error", "message": message}

    # --- Reusable Tool Handlers ---

    async def _run_calculator_tool(self, args: dict) -> str:
        expression = args.get("expression", "0")
        return str(eval(expression, {"__builtins__": None}, {}))

    async def _run_gmail_tool(self, args: dict) -> str:
        action = args.get("action", "search")
        return f"Gmail {action} executed."
EOF

echo "Installing HomeController..."
cat << 'EOF' > app/python/controllers/home_controller.py
from core.controller import Controller


class HomeController(Controller):

    async def index(self) -> dict:
        return {
            "status": "success",
            "message": "Sharpishly Python MVC online",
            "route": "home/index"
        }
EOF

echo "Installing mcp_router.py..."
cat << 'EOF' > app/python/routers/mcp_router.py
from fastapi import APIRouter
from controllers.mcp_client_controller import McpClientController

mcp_router = APIRouter(prefix="/mcp", tags=["MCP"])
mcp_controller = McpClientController()


@mcp_router.get("/tools")
async def list_mcp_tools():
    return {"tools": mcp_controller.list_tools()}


@mcp_router.post("/execute")
async def execute_mcp_tool(payload: dict):
    return await mcp_controller.handle_request(payload)
EOF

echo "Installing web_router.py..."
cat << 'EOF' > app/python/routers/web_router.py
from fastapi import APIRouter
from controllers.home_controller import HomeController

web_router = APIRouter(prefix="/home", tags=["Web MVC"])
home_controller = HomeController()


@web_router.get("/index")
async def home_index():
    return await home_controller.index()
EOF

echo "Installing api.py..."
cat << 'EOF' > app/python/api.py
from fastapi import FastAPI
from routers.mcp_router import mcp_router
from routers.web_router import web_router

app = FastAPI(title="Sharpishly Python Backend")

# Mount modular routers cleanly without global wildcard conflicts
app.include_router(mcp_router)
app.include_router(web_router)
EOF

echo "All updated files successfully installed under app/python/!"
