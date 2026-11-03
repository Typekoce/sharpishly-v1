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
