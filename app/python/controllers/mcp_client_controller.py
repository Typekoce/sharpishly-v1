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

    # --- Tool Handlers ---

    # async def _run_calculator_tool(self, args: dict) -> dict:
    #     expression = args.get("expression", "0")
    #     val = eval(expression, {"__builtins__": None}, {})
    #     return {"result": val}

    async def _run_calculator_tool(self, args: dict) -> dict:
        safe_args = args or {}
        expression = safe_args.get("expression", "0")
        val = eval(expression, {"__builtins__": None}, {})
        return {"result": val}

    async def _run_stock_quote_tool(self, args: dict) -> dict:
        ticker = args.get("ticker", "AAPL").upper().strip()
        return {
            "ticker": ticker,
            "price": 189.50,
            "currency": "USD",
            "change": 2.10,
            "change_percent": 1.12,
            "as_of": "2026-11-04T14:28:00Z"
        }

    async def _run_gmail_tool(self, args: dict) -> dict:
        action = args.get("action", "search")
        query = args.get("query", "")
        if action not in ["search", "list", "read"]:
            raise ValueError(f"Unsupported Gmail action: {action}")
        return {"action": action, "query": query, "messages": []}