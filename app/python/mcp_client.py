#!/usr/bin/env python3
"""
Sharpishly Python MCP Client Dispatcher CLI
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from controllers.mcp_client_controller import McpClientController

async def main():
    scriptRoute = sys.argv[1] if len(sys.argv) > 1 else "/py/calculator/mcp"
    userPrompt = sys.argv[2] if len(sys.argv) > 2 else "Calculate (45 * 12) / 3"

    controller = McpClientController()
    response = await controller.handleRequest(scriptRoute, userPrompt)

    if response.get("status") == 200:
        data = response.get("data", {})
        if data.get("type") == "tool_call":
            for call in data.get("tool_calls", []):
                print(f"[*] Tool Executed: {call['tool']} ({call['args']}) -> {call['output']}")
        print(f"\nQwen Answer: {data.get('answer')}")
    else:
        print(f"[!] Error: {response.get('error')}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
