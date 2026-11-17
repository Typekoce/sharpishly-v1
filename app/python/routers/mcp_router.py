from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from controllers.mcp_client_controller import McpClientController

mcp_router = APIRouter()


@mcp_router.get("/mcp/tools")
async def list_mcp_tools():
    controller = McpClientController()
    return JSONResponse(content={"tools": controller.list_tools()})


@mcp_router.post("/mcp/execute")
async def execute_mcp_tool(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "error": {
                    "code": "INVALID_JSON",
                    "message": "Request body must be valid JSON.",
                },
            },
        )

    controller = McpClientController()
    result = await controller.handle_request(payload)
    return JSONResponse(content=result)


@mcp_router.post("/mcp/chat")
async def handle_chat(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "error": {
                    "code": "INVALID_JSON",
                    "message": "Request body must be valid JSON.",
                },
            },
        )

    controller = McpClientController()

    try:
        result = await controller.route_request(payload)
        return JSONResponse(content=result)
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": {
                    "code": "CHAT_ROUTE_ERROR",
                    "message": str(error),
                },
            },
        )