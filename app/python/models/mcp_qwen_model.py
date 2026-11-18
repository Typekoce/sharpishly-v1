# models/mcp_qwen_model.py
from models.mcp_tool_model import McpToolModel


class McpQwenModel(McpToolModel):
    def __init__(self):
        super().__init__()

    async def _run_qenl(self, arguments: dict) -> dict:
        safe_arguments = arguments or {}

        # todo: use gmail tool to send emails

        prompt = str(
            safe_arguments.get("prompt")
            or safe_arguments.get("query")
            or "Say hello and confirm you are running."
        ).strip()

        model = str(
            safe_arguments.get("model", "qwen2.5:0.5b")
        ).strip()

        return await self.call_qwen(prompt, model)