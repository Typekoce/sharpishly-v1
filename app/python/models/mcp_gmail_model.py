# models/mcp_gmail_model.py
import asyncio
import email.utils
import json
import re
from email.message import EmailMessage
from pathlib import Path
from models.mcp_tool_model import McpToolModel


class McpGmailModel(McpToolModel):
    def __init__(self):
        super().__init__()

    async def _run_himalaya(self, cmd: list[str], input_bytes: bytes | None = None, timeout: int = 15) -> str:
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=input_bytes), timeout=timeout
            )
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
        elif action == "send":
            recipient = str(safe_args.get("recipient", "")).strip()
            subject = str(safe_args.get("subject", "")).strip()
            message_body = str(safe_args.get("message", "")).strip()
            account = str(safe_args.get("account", "")).strip()

            if not recipient:
                raise ValueError("Recipient email address required for send action.")
            if not subject:
                raise ValueError("Subject required for send action.")
            if not message_body:
                raise ValueError("Message body required for send action.")

            try:
                parsed_recipient = email.utils.parseaddr(recipient)
                if not parsed_recipient[1] or "@" not in parsed_recipient[1]:
                    raise ValueError
            except (ValueError, IndexError):
                raise ValueError("A valid recipient email address is required.")

            msg = EmailMessage()
            msg["From"] = account if account else "mysharpishly@gmail.com"
            msg["To"] = parsed_recipient[1]
            msg["Subject"] = subject
            msg.set_content(message_body)

            cmd = ["himalaya", "message", "send"]
            if account:
                cmd.extend(["--account", account])

            output = await self._run_himalaya(cmd, input_bytes=msg.as_bytes(), timeout=30)

            return {
                "action": "send",
                "recipient": parsed_recipient[1],
                "subject": subject,
                "status": "success",
                "output": output or "Email submitted to Himalaya for delivery."
            }
        else:
            raise ValueError(f"Unsupported Gmail action: {action}")

    def _handle_contacts_action(self, action: str, query: str) -> dict:
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

        matches = []
        q_lower = query.lower()
        for c in contacts:
            name = str(c.get("display_name", ""))
            emails = c.get("emails") or []
            addr = emails[0].get("address", "") if emails else ""
            if action == "contacts_list" or not query or q_lower in name.lower() or q_lower in addr.lower():
                matches.append({
                    "id": c.get("id"),
                    "display_name": name,
                    "email": addr
                })

        return {
            "action": action,
            "query": query,
            "matches": matches
        }

    def try_parse_email_send(self, prompt: str) -> dict | None:
        if not prompt:
            return None

        prompt_lower = prompt.lower()
        send_keywords = ("send", "email", "mail", "compose", "write")
        if not any(kw in prompt_lower for kw in send_keywords) or "@" not in prompt:
            return None

        email_match = re.search(r"[\w.+-]+@[\w.-]+\.\w+", prompt)
        if not email_match:
            return None
        recipient = email_match.group(0).strip()

        message = ""
        msg_patterns = [
            r'(?:message|body|content|text)\s+(?:of|is|:)?\s*["\'](.+?)["\']',
            r'(?:with\s+(?:the\s+)?(?:message|body|content))\s*["\'](.+?)["\']',
            r'["\']([^"\']{3,})["\']',
        ]
        for pattern in msg_patterns:
            m = re.search(pattern, prompt, re.IGNORECASE | re.DOTALL)
            if m:
                message = m.group(1).strip()
                break

        subject = "Hello"
        subj_match = re.search(
            r'(?:subject|subj)\s*(?:is|:)?\s*["\']?([^"\'\n]+?)["\']?(?:\s|$|,|\.)',
            prompt,
            re.IGNORECASE,
        )
        if subj_match:
            subject = subj_match.group(1).strip()
        elif message:
            subject = " ".join(message.split()[:6])[:80] or "Hello"

        if not message:
            message = "Hello"

        return {
            "action": "send",
            "recipient": recipient,
            "subject": subject,
            "message": message,
        }