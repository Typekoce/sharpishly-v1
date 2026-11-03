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
