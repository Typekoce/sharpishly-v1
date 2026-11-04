from fastapi import APIRouter
from controllers.mcp_client_controller import McpClientController

mcp_router = APIRouter(prefix="/mcp", tags=["MCP"])
mcp_controller = McpClientController()


@mcp_router.get("/tools")
async def list_mcp_tools():
    return {"tools": mcp_controller.list_tools()}


@mcp_router.post("/execute")
async def execute_mcp_tool(payload: dict):
    return await mcp_controller.handle_request(payload)
