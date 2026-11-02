import json
import subprocess
import re

class GmailController:
    def _run_himalaya(self, args: list[str]) -> str:
        try:
            result = subprocess.run(
                ["himalaya"] + args,
                capture_output=True,
                text=True,
                timeout=15,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            return f"Himalaya error (code {e.returncode}): {e.stderr}"
        except FileNotFoundError:
            return "Error: 'himalaya' CLI client is not installed or available in PATH."

    def index(self):
        print(json.dumps({"status": "ok", "service": "gmail", "action": "index"}))

    async def mcp(self):
        from mcp.server import Server
        import mcp.types as types
        from mcp.server.stdio import stdio_server

        server = Server("gmail-mcp")

        @server.list_tools()
        async def handle_list_tools() -> list[types.Tool]:
            return [
                types.Tool(
                    name="list_emails",
                    description="List recent emails from Gmail inbox using himalaya.",
                    inputSchema={
                        "type": "object",
                        "properties": {"limit": {"type": "integer", "default": 10}}
                    },
                ),
                types.Tool(
                    name="read_email",
                    description="Read an email content by ID.",
                    inputSchema={
                        "type": "object",
                        "properties": {"email_id": {"type": "string"}},
                        "required": ["email_id"]
                    },
                )
            ]

        @server.call_tool()
        async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
            arguments = arguments or {}
            if name == "list_emails":
                limit = str(arguments.get("limit", 10))
                output = self._run_himalaya(["envelope", "list", "--page-size", limit])
                return [types.TextContent(type="text", text=output)]
            elif name == "read_email":
                email_id = str(arguments.get("email_id", ""))
                if not re.fullmatch(r"[A-Za-z0-9._-]+", email_id):
                    return [types.TextContent(type="text", text="Error: Invalid email ID format.")]
                output = self._run_himalaya(["message", "read", email_id])
                return [types.TextContent(type="text", text=output)]
            raise ValueError(f"Unknown tool: {name}")

        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
