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
                check=True,
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            return f"Himalaya error (code {e.returncode}): {e.stderr}"
        except FileNotFoundError:
            return "Error: 'himalaya' CLI client is not installed or available in PATH."

    def index(self):
        print(json.dumps({"status": "ok", "service": "gmail", "action": "index"}))

    async def mcp(self):
        from mcp.server.fastmcp import FastMCP

        server = FastMCP("gmail-mcp")

        @server.tool()
        def list_emails(limit: int = 10) -> str:
            """List recent emails from Gmail inbox using himalaya."""
            return self._run_himalaya(["envelope", "list", "--page-size", str(limit)])

        @server.tool()
        def read_email(email_id: str) -> str:
            """Read an email content by ID."""
            if not re.fullmatch(r"[A-Za-z0-9._-]+", email_id):
                return "Error: Invalid email ID format."
            return self._run_himalaya(["message", "read", email_id])

        await server.run_stdio_async()
