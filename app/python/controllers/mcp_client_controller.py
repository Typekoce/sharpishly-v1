import asyncio
import json
import os
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

    async def _run_calculator_tool(self, args: dict) -> dict:
        safe_args = args or {}
        expression = safe_args.get("expression", "0")
        val = eval(expression, {"__builtins__": None}, {})
        return {"result": val}

    async def _run_stock_quote_tool(self, args: dict) -> dict:
        safe_args = args or {}
        ticker = safe_args.get("ticker", "AAPL").upper().strip()
        return {
            "ticker": ticker,
            "price": 189.50,
            "currency": "USD",
            "change": 2.10,
            "change_percent": 1.12,
            "as_of": "2026-11-04T14:28:00Z"
        }

    async def _run_gmail_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = safe_args.get("action", "search")
        query = safe_args.get("query", "").lower().strip()

        if action in ["contacts_search", "contacts_list"]:
            return self._handle_contacts_action(action, query)

        if action not in ["search", "list", "read"]:
            raise ValueError(f"Unsupported Gmail action: {action}")
            
        return {"action": action, "query": query, "messages": []}

    def _handle_contacts_action(self, action: str, query: str) -> dict:
        """Loads local address book and performs read-only searches/listings."""
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        file_path = os.path.join(base_dir, "output", "hotmail_contacts_addressbook.json")

        if not os.path.exists(file_path):
            return {"query": query, "matches": [], "note": "Address book file not found."}

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        contacts = data.get("addressbook", {}).get("contacts", [])

        if action == "contacts_list" or not query:
            matches = [
                {
                    "id": c.get("id"),
                    "display_name": c.get("display_name"),
                    "email": c.get("emails", [{}])[0].get("address", "")
                }
                for c in contacts
            ]
        else:
            matches = []
            for c in contacts:
                name = c.get("display_name", "").lower()
                email = c.get("emails", [{}])[0].get("address", "").lower()
                if query in name or query in email:
                    matches.append({
                        "id": c.get("id"),
                        "display_name": c.get("display_name"),
                        "email": c.get("emails", [{}])[0].get("address", "")
                    })

        return {
            "action": action,
            "query": query,
            "matches": matches
        }