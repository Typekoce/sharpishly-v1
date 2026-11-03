"""
API Controller for handling frontend user chat prompts and triggering MCP tasks via Qwen.
"""
from controllers.mcp_client_controller import McpClientController
from core.controller import Controller

class ApiChatController(Controller):
    def __init__(self):
        self.mcpController = McpClientController()
        self.routeMap = {
            "calculator": "/py/calculator/mcp",
            "gmail": "/py/gmail/mcp"
        }

    async def handleChatMessage(self, requestData: dict) -> dict:
        userPrompt = requestData.get("prompt")
        targetTool = requestData.get("tool", "calculator")

        if not userPrompt:
            return self.errorResponse("Prompt is required", 400)

        scriptRoute = self.routeMap.get(targetTool)

        if not scriptRoute:
            return self.errorResponse(
                f"Unsupported tool: {targetTool}",
                400
            )

        return await self.mcpController.handleRequest(
            scriptRoute,
            userPrompt
        )