"""
FastAPI HTTP server exposing the API chat controller to the frontend.
"""
from fastapi import FastAPI
from pydantic import BaseModel
from controllers.api_chat_controller import ApiChatController

app = FastAPI()
chatController = ApiChatController()

class ChatRequest(BaseModel):
    prompt: str
    tool: str = "calculator"

@app.post("/api/chat")
async def chat(request: ChatRequest) -> dict:
    return await chatController.handleChatMessage(request.model_dump())