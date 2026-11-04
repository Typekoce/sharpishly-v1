from fastapi import FastAPI
from routers.mcp_router import mcp_router
from routers.web_router import web_router

app = FastAPI(title="Sharpishly Python Backend")

# Mount modular routers cleanly without global wildcard conflicts
app.include_router(mcp_router)
app.include_router(web_router)
