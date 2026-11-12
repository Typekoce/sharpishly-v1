import asyncio
import json
import sys
from pathlib import Path

from controllers.mcp_client_controller import McpClientController

async def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: send_email_job.py <job-json-path>", file=sys.stderr)
        return 2

    job_path = Path(sys.argv[1])

    try:
        payload = job_path.read_text(encoding="utf-8")
        data = json.loads(payload)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Invalid email job file: {exc}", file=sys.stderr)
        return 2

    controller = McpClientController()
    result = await controller.handle_request(data)

    print(json.dumps(result, indent=2))

    if result.get("status") != "success":
        return 1

    return 0

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))