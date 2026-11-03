#!/usr/bin/env bash
# build/shells/install_mcp_client.sh
# Creates and configures the Python MCP client integration architecture for Sharpishly.
# Naming convention: 
# - Folders & file names: lowercase with underscores
# - Code identifiers (classes, methods, functions): CamelCase / camelCase

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_APP_DIR="${PROJECT_ROOT}/app/python"

echo "=== Initializing Sharpishly Python MCP Architecture (Production Patched) ==="

# 1. Ensure directory structure exists with __init__.py for proper python imports
mkdir -p "${PYTHON_APP_DIR}/core"
mkdir -p "${PYTHON_APP_DIR}/models"
mkdir -p "${PYTHON_APP_DIR}/controllers"
mkdir -p "${PYTHON_APP_DIR}/services"

touch "${PYTHON_APP_DIR}/core/__init__.py"
touch "${PYTHON_APP_DIR}/models/__init__.py"
touch "${PYTHON_APP_DIR}/controllers/__init__.py"
touch "${PYTHON_APP_DIR}/services/__init__.py"

# 2. Base Model
cat << 'EOF' > "${PYTHON_APP_DIR}/core/model.py"
"""
Sharpishly MVC Base Model
"""
class Model:
    def __init__(self):
        pass
EOF

# 3. Base Controller
cat << 'EOF' > "${PYTHON_APP_DIR}/core/controller.py"
"""
Sharpishly MVC Base Controller
"""
class Controller:
    def jsonResponse(self, data: dict, status: int = 200) -> dict:
        return {"status": status, "data": data}

    def errorResponse(self, message: str, status: int = 400) -> dict:
        return {"status": status, "error": message}
EOF

# 4. Service: McpClientService (Fixed projectRoot path & GPG pre-flight check)
cat << 'EOF' > "${PYTHON_APP_DIR}/services/mcp_client_service.py"
"""
Service layer for managing stdio connection parameters and pre-flight environment checks.
"""
import os
import sys
import subprocess
from mcp import StdioServerParameters

class McpClientService:
    @staticmethod
    def checkGpgAgent() -> bool:
        """
        Pre-flight check to verify that the local GPG agent is running 
        and responsive for password retrieval.
        """
        try:
            result = subprocess.run(
                ["gpg-connect-agent", "/bye"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=3
            )
            return result.returncode == 0
        except Exception as e:
            return False

    @staticmethod
    def getServerParameters(scriptRoute: str) -> StdioServerParameters:
        # services -> python -> app -> PROJECT_ROOT (3 levels up)
        projectRoot = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        venvPython = os.path.join(projectRoot, "build/mcp/.venv/bin/python3")
        indexPy = os.path.join(projectRoot, "app/python/index.py")

        if not os.path.exists(venvPython):
            venvPython = sys.executable

        # Pre-flight check for Gmail/Himalaya endpoints
        if "gmail" in scriptRoute:
            if not McpClientService.checkGpgAgent():
                raise RuntimeError(
                    "[!] GPG agent is unresponsive or locked. "
                    "Run 'pass show email/mysharpishly' in your terminal to unlock your key before proceeding."
                )

        env = os.environ.copy()

        return StdioServerParameters(
            command=venvPython,
            args=[indexPy, scriptRoute],
            env=env
        )
EOF

# 5. Model: McpToolModel (Patched JSON arg parsing & message history loop)
cat << 'EOF' > "${PYTHON_APP_DIR}/models/mcp_tool_model.py"
"""
Model responsible for tool execution and Ollama bridge.
"""
import json
import httpx
from mcp import ClientSession
from mcp.client.stdio import stdio_client
from core.model import Model
from services.mcp_client_service import McpClientService

class McpToolModel(Model):
    def __init__(self, ollamaUrl: str = "http://localhost:11434/api/chat", modelName: str = "qwen2.5:0.5b"):
        super().__init__()
        self.ollamaUrl = ollamaUrl
        self.modelName = modelName

    async def executePrompt(self, scriptRoute: str, userPrompt: str) -> dict:
        serverParams = McpClientService.getServerParameters(scriptRoute)

        async with stdio_client(serverParams) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                toolsList = await session.list_tools()

                ollamaTools = [
                    {
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description,
                            "parameters": tool.inputSchema
                        }
                    }
                    for tool in toolsList.tools
                ]

                messages = [{"role": "user", "content": userPrompt}]

                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self.ollamaUrl,
                        json={
                            "model": self.modelName,
                            "messages": messages,
                            "tools": ollamaTools,
                            "stream": False
                        },
                        timeout=60.0
                    )
                    response.raise_for_status()
                    resData = response.json()

                message = resData.get("message", {})

                if "tool_calls" in message:
                    toolOutputs = []
                    messages.append(message)

                    for toolCall in message["tool_calls"]:
                        funcName = toolCall["function"]["name"]
                        funcArgs = toolCall["function"]["arguments"]

                        if isinstance(funcArgs, str):
                            try:
                                funcArgs = json.loads(funcArgs)
                            except json.JSONDecodeError:
                                funcArgs = {}

                        mcpResult = await session.call_tool(funcName, arguments=funcArgs)
                        outputText = "".join([c.text for c in mcpResult.content if hasattr(c, 'text')])
                        toolOutputs.append({"tool": funcName, "args": funcArgs, "output": outputText})

                        toolMessage = {"role": "tool", "content": outputText}
                        if toolCall.get("id"):
                            toolMessage["tool_call_id"] = toolCall["id"]

                        messages.append(toolMessage)

                    async with httpx.AsyncClient() as client:
                        finalResp = await client.post(
                            self.ollamaUrl,
                            json={
                                "model": self.modelName,
                                "messages": messages,
                                "stream": False
                            },
                            timeout=60.0
                        )
                        finalResp.raise_for_status()
                        finalMsg = finalResp.json().get("message", {})

                    return {
                        "type": "tool_call",
                        "tool_calls": toolOutputs,
                        "answer": finalMsg.get("content")
                    }

                return {
                    "type": "direct_answer",
                    "answer": message.get("content")
                }
EOF

# 6. Controller: McpClientController
cat << 'EOF' > "${PYTHON_APP_DIR}/controllers/mcp_client_controller.py"
"""
Controller handling incoming dispatch requests.
"""
from core.controller import Controller
from models.mcp_tool_model import McpToolModel

class McpClientController(Controller):
    def __init__(self):
        self.model = McpToolModel()

    async def handleRequest(self, scriptRoute: str, userPrompt: str) -> dict:
        if not scriptRoute or not userPrompt:
            return self.errorResponse("Missing required parameters: scriptRoute and userPrompt")

        try:
            result = await self.model.executePrompt(scriptRoute, userPrompt)
            return self.jsonResponse(result)
        except Exception as e:
            return self.errorResponse(f"Execution failed: {str(e)}", status=500)
EOF

# 7. Entrypoint CLI Dispatcher
cat << 'EOF' > "${PYTHON_APP_DIR}/mcp_client.py"
#!/usr/bin/env python3
"""
Sharpishly Python MCP Client Dispatcher CLI
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from controllers.mcp_client_controller import McpClientController

async def main():
    scriptRoute = sys.argv[1] if len(sys.argv) > 1 else "/py/calculator/mcp"
    userPrompt = sys.argv[2] if len(sys.argv) > 2 else "Calculate (45 * 12) / 3"

    controller = McpClientController()
    response = await controller.handleRequest(scriptRoute, userPrompt)

    if response.get("status") == 200:
        data = response.get("data", {})
        if data.get("type") == "tool_call":
            for call in data.get("tool_calls", []):
                print(f"[*] Tool Executed: {call['tool']} ({call['args']}) -> {call['output']}")
        print(f"\nQwen Answer: {data.get('answer')}")
    else:
        print(f"[!] Error: {response.get('error')}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
EOF

chmod +x "${PYTHON_APP_DIR}/mcp_client.py"

echo "=== Successfully initialized Sharpishly Python MCP Architecture ==="