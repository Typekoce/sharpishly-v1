import asyncio
import json
import os
from pathlib import Path
import ast
import operator
from core.controller import Controller
from models.mcp_tool_model import McpToolModel

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

_ALLOWED_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

def safe_eval(expression: str):
    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
            return _ALLOWED_BINOPS[type(node.op)](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
            return _ALLOWED_UNARYOPS[type(node.op)](_eval(node.operand))
        raise ValueError("Unsupported expression")

    tree = ast.parse(expression, mode="eval")
    return _eval(tree)


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
        raw_args = payload.get("args", {})

        tool_def = self._find_tool(tool_name)
        if not tool_def:
            return self._error_response("TOOL_NOT_FOUND", f"Tool '{tool_name}' not found.")

        args = self._normalize_args(raw_args)
        return await self._dispatch_handler(tool_def, args)

    def _find_tool(self, name: str) -> dict | None:
        """Reusable lookup helper."""
        return self.tools.get(name)

    async def _dispatch_handler(self, tool_def: dict, args: dict) -> dict:
        """Reusable execution and exception-handling helper supporting async handlers."""
        handler_name = tool_def.get("handler")
        handler = getattr(self, handler_name, None)

        if not callable(handler):
            return self._error_response("HANDLER_NOT_CALLABLE", f"Handler '{handler_name}' is not callable.")

        try:
            result = await handler(args) if asyncio.iscoroutinefunction(handler) else handler(args)
            return {"status": "success", "tool": tool_def["name"], "output": result}
        except Exception as e:
            return self._error_response("EXECUTION_ERROR", str(e))

    def _error_response(self, code: str, message: str) -> dict:
        """Reusable structured error response formatter."""
        return {
            "status": "error",
            "error": {
                "code": code,
                "message": message
            }
        }

    @staticmethod
    def _normalize_args(raw_args) -> dict:
        if isinstance(raw_args, str):
            raw_args = raw_args.strip()
            if raw_args.startswith("{"):
                try:
                    parsed = json.loads(raw_args)
                    if isinstance(parsed, dict):
                        return parsed.get("args", parsed)
                except json.JSONDecodeError:
                    return {"query": raw_args}
            return {"query": raw_args}

        if isinstance(raw_args, dict):
            nested = raw_args.get("args")
            if isinstance(nested, str):
                try:
                    parsed = json.loads(nested)
                    if isinstance(parsed, dict):
                        return {**raw_args, **parsed}
                except json.JSONDecodeError:
                    pass
            return raw_args

        return {}

    # --- Tool Handlers ---

    async def _run_calculator_tool(self, args: dict) -> dict:
        safe_args = args or {}
        expression = str(safe_args.get("expression", "0"))
        if len(expression) > 128:
            raise ValueError("Expression too long.")
        val = safe_eval(expression)
        return {"result": val}

    async def _run_stock_quote_tool(self, args: dict) -> dict:
        safe_args = args or {}
        ticker = str(safe_args.get("ticker", "AAPL")).upper().strip()
        return {
            "ticker": ticker,
            "price": 189.50,
            "currency": "USD",
            "change": 2.10,
            "change_percent": 1.12,
            "as_of": "2026-11-04T14:28:00Z"
        }

    async def _run_himalaya(self, cmd: list[str]) -> str:
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=15)
        except FileNotFoundError:
            raise RuntimeError("Himalaya CLI client is not installed or available in PATH.")
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise RuntimeError("Himalaya command timed out.")

        if proc.returncode != 0:
            detail = stderr.decode(errors="replace").strip() or stdout.decode(errors="replace").strip()
            raise RuntimeError(f"Himalaya command failed: {detail}")

        return stdout.decode(errors="replace").strip()

    async def _run_gmail_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "list")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if len(query) > 500:
            raise ValueError("Query string too long.")

        if action in ["contacts_search", "contacts_list"]:
            return self._handle_contacts_action(action, query)

        if action in ["search", "list"]:
            cmd = ["himalaya", "envelope", "list"]
            if query:
                cmd.extend(query.split())
            output = await self._run_himalaya(cmd)
            return {
                "action": action,
                "query": query,
                "raw_output": output
            }
        elif action == "read":
            if not query:
                raise ValueError("Message ID required for read action.")
            cmd = ["himalaya", "message", "read", query]
            output = await self._run_himalaya(cmd)
            return {
                "action": action,
                "message_id": query,
                "content": output
            }
        else:
            raise ValueError(f"Unsupported Gmail action: {action}")

    def _handle_contacts_action(self, action: str, query: str) -> dict:
        """Loads local address book using pathlib and performs defensive searches/listings."""
        project_root = Path(__file__).resolve().parents[3]
        file_path = project_root / "output" / "hotmail_contacts_addressbook.json"

        if not file_path.exists():
            return {"query": query, "matches": [], "note": "Address book file not found."}

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            return {"query": query, "matches": [], "note": "Invalid address book JSON."}

        contacts = data.get("addressbook", {}).get("contacts", [])
        if not isinstance(contacts, list):
            contacts = []

        if action == "contacts_list" or not query:
            matches = []
            for c in contacts:
                emails = c.get("emails") or []
                email = emails[0].get("address", "") if emails else ""
                matches.append({
                    "id": c.get("id"),
                    "display_name": c.get("display_name"),
                    "email": email
                })
        else:
            matches = []
            q_lower = query.lower()
            for c in contacts:
                name = str(c.get("display_name", "")).lower()
                emails = c.get("emails") or []
                email = emails[0].get("address", "") if emails else ""
                if q_lower in name or q_lower in email.lower():
                    matches.append({
                        "id": c.get("id"),
                        "display_name": c.get("display_name"),
                        "email": email
                    })

        return {
            "action": action,
            "query": query,
            "matches": matches
        }
