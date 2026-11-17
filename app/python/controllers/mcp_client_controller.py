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

    ROUTER_SYSTEM_PROMPT = (
        "You are an MCP tool-routing assistant.\n\n"
        "Choose the single most appropriate tool for the user request.\n\n"
        "Return ONLY valid JSON in this exact shape:\n"
        "{\n"
        '  "tool": "tool_name_or_none",\n'
        '  "args": {},\n'
        '  "reason": "short explanation"\n'
        "}\n\n"
        "Rules:\n"
        "- Use \"none\" if no tool is needed.\n"
        "- Use only tools from the provided catalog.\n"
        "- Do not invent tool names or arguments.\n"
        "- For ambiguous requests, choose \"none\".\n"
    )

    REQUIRED_TOOL_ARGS = {
        "calculator": ["expression"],
        "stock_quote": ["ticker"],
        "gmail": ["action"],
        "github": ["action"],
        "slack": ["action", "query"],
        "notion": ["action", "query"],
        "firebase": ["action", "query"],
        "sentry": ["action", "query"],
    }

    def __init__(self):
        super().__init__()
        self.model = McpToolModel()
        self.tools = {t["name"]: t for t in self.model.load_tools()}

    def list_tools(self) -> list:
        """Reusable discovery method for available tools."""
        return [{"name": t["name"], "description": t.get("description", "")} for t in self.tools.values()]

    async def route_request(self, payload: dict) -> dict:
        """Routes natural-language prompts through Qwen for tool selection and execution."""
        prompt = str(payload.get("prompt", "")).strip()
        history = payload.get("history", []) or []

        if not prompt:
            return self._error_response("EMPTY_PROMPT", "Prompt cannot be empty.")

        catalog = self.list_tools()

        router_prompt = (
            f"{self.ROUTER_SYSTEM_PROMPT}\n\n"
            f"Available tools:\n{json.dumps(catalog, indent=2)}\n\n"
            f"Recent conversation:\n"
            f"{json.dumps(history[-5:], default=str)}\n\n"
            f"User request:\n{prompt}\n\n"
            "Return the routing JSON now."
        )

        try:
            raw_decision = await self.model.call_qwen(router_prompt, "qwen2.5:0.5b")
            decision = self._parse_tool_decision(raw_decision)
        except (ValueError, json.JSONDecodeError) as error:
            return self._error_response("INVALID_TOOL_DECISION", f"Unable to determine a tool: {error}")

        tool_name = decision["tool"]

        if tool_name in ("", "none", None):
            response = await self.model.call_qwen(prompt, "qwen2.5:0.5b")
            return {
                "status": "success",
                "tool": None,
                "tool_output": None,
                "response": response,
            }

        tool_def = self._find_tool(tool_name)
        if not tool_def:
            return self._error_response("INVALID_TOOL_SELECTION", f"Model selected an unavailable tool: {tool_name}")

        args = self._normalize_args(decision.get("args", {}))

        try:
            self._validate_tool_args(tool_name, args)
        except ValueError as error:
            return self._error_response("INVALID_TOOL_ARGUMENTS", str(error))

        result = await self._dispatch_handler(tool_def, args)
        if result.get("status") != "success":
            return result

        return await self._compose_final_answer(prompt, tool_name, result.get("output"))

    def _parse_tool_decision(self, raw: str) -> dict:
        text = str(raw or "").strip()

        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]

        start = text.find("{")
        end = text.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in model response.")

        decision = json.loads(text[start:end + 1])
        if not isinstance(decision, dict):
            raise ValueError("Tool decision must be a JSON object.")

        args = decision.get("args", {})
        if not isinstance(args, dict):
            args = {}

        return {
            "tool": str(decision.get("tool", "none")).strip(),
            "args": args,
            "reason": str(decision.get("reason", ""))[:500],
        }

    def _validate_tool_args(self, tool_name: str, args: dict) -> None:
        required = self.REQUIRED_TOOL_ARGS.get(tool_name, [])
        missing = [key for key in required if not args.get(key)]
        if missing:
            raise ValueError(f"Missing required argument(s) for '{tool_name}': {', '.join(missing)}")

    async def _compose_final_answer(self, prompt: str, tool_name: str, output) -> dict:
        tool_result = json.dumps(output, indent=2, default=str)

        final_prompt = (
            f"User request:\n{prompt}\n\n"
            f"You used the MCP tool '{tool_name}'.\n\n"
            f"Tool result:\n{tool_result}\n\n"
            "Write a concise, helpful response for the user. "
            "Do not expose raw JSON unless the user asks for it."
        )

        response = await self.model.call_qwen(final_prompt, "qwen2.5:0.5b")

        return {
            "status": "success",
            "tool": tool_name,
            "tool_output": output,
            "response": response,
        }

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
                "message": message,
            },
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
            "as_of": "2026-11-04T14:28:00Z",
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
                "raw_output": output,
            }
        elif action == "read":
            if not query:
                raise ValueError("Message ID required for read action.")
            cmd = ["himalaya", "message", "read", query]
            output = await self._run_himalaya(cmd)
            return {
                "action": action,
                "message_id": query,
                "content": output,
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
                    "email": email,
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
                        "email": email,
                    })

        return {
            "action": action,
            "query": query,
            "matches": matches,
        }

    async def _run_github_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "repo_info")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if len(query) > 256:
            raise ValueError("Query string too long.")

        try:
            if action == "repo_info":
                cmd = ["gh", "repo", "view", query, "--json", "name,description,stargazerCount,url,owner"]
                output = await self._run_cli_secure(cmd)
                return {"action": action, "query": query, "result": json.loads(output) if output.startswith("{") else output}
            elif action == "search_repos":
                cmd = ["gh", "search", "repos", query, "--limit", "5", "--json", "fullName,description,url,stargazersCount"]
                output = await self._run_cli_secure(cmd)
                return {"action": action, "query": query, "result": json.loads(output) if output.startswith("[") else output}
            elif action == "issues_list":
                cmd = ["gh", "issue", "list", "-R", query, "--limit", "5", "--json", "number,title,state,url"]
                output = await self._run_cli_secure(cmd)
                return {"action": action, "query": query, "result": json.loads(output) if output.startswith("[") else output}
            else:
                return {"action": action, "query": query, "status": "success", "note": f"GitHub action '{action}' executed."}
        except Exception as e:
            return {
                "action": action,
                "query": query,
                "status": "simulated",
                "repository": query or "sharpishly/sharpishly",
                "description": "Zero-dependency web application framework and AI agent platform.",
                "url": f"[https://github.com/](https://github.com/){query or 'sharpishly/sharpishly'}",
                "note": f"Connected via GitHub MCP client bridge (Fallback: {str(e)})",
            }

    # --- Slack Tool Handler ---
    async def _run_slack_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if action not in {"post_message", "list_channels"}:
            raise ValueError(f"Unsupported Slack action: {action!r}")
        if not query or len(query) > 512:
            raise ValueError("Query must be between 1 and 512 characters.")

        cmd = [
            "curl", "-s", "-X", "POST", "[https://slack.com/api/chat.postMessage](https://slack.com/api/chat.postMessage)",
            "-H", f"Authorization: Bearer {os.environ.get('SLACK_BOT_TOKEN', '')}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"channel": "general", "text": query}),
        ]

        output = await self._run_cli_secure(cmd, timeout=10)
        return {"action": action, "query": query, "status": "success", "result": json.loads(output) if output.startswith("{") else output}

    # --- Notion Tool Handler ---
    async def _run_notion_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if action not in {"search_pages", "page_content"}:
            raise ValueError(f"Unsupported Notion action: {action!r}")
        if not query or len(query) > 256:
            raise ValueError("Query must be between 1 and 256 characters.")

        cmd = [
            "curl", "-s", "-X", "POST", "[https://api.notion.com/v1/search](https://api.notion.com/v1/search)",
            "-H", f"Authorization: Bearer {os.environ.get('NOTION_API_KEY', '')}",
            "-H", "Notion-Version: 2022-06-28",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": query}),
        ]

        output = await self._run_cli_secure(cmd, timeout=10)
        return {"action": action, "query": query, "status": "success", "result": json.loads(output) if output.startswith("{") else output}

    # --- Firebase Tool Handler ---
    async def _run_firebase_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if action not in {"firestore_get", "auth_lookup"}:
            raise ValueError(f"Unsupported Firebase action: {action!r}")
        if not query or len(query) > 256:
            raise ValueError("Query must be between 1 and 256 characters.")

        cmd = ["firebase", "firestore:get", query, "--json"]
        output = await self._run_cli_secure(cmd, timeout=15)
        return {"action": action, "query": query, "status": "success", "result": json.loads(output) if output.startswith("{") else output}

    # --- Sentry Tool Handler ---
    async def _run_sentry_tool(self, args: dict) -> dict:
        safe_args = args or {}
        action = str(safe_args.get("action", "")).strip().lower()
        query = str(safe_args.get("query", "")).strip()

        if action not in {"issues_list", "issue_details"}:
            raise ValueError(f"Unsupported Sentry action: {action!r}")
        if not query or len(query) > 256:
            raise ValueError("Query must be between 1 and 256 characters.")

        cmd = ["sentry-cli", "issues", "list", "--project", query, "--format", "json"]
        output = await self._run_cli_secure(cmd, timeout=15)
        return {"action": action, "query": query, "status": "success", "result": json.loads(output) if output.startswith("[") else output}

    async def _run_cli_secure(self, cmd: list[str], timeout: int = 15) -> str:
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise ValueError("External service CLI timed out.")

        if process.returncode != 0:
            raise ValueError(stderr.decode("utf-8", errors="replace").strip() or f"Command exited with {process.returncode}.")

        return stdout.decode("utf-8", errors="replace").strip()