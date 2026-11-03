from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from controllers.api_chat_controller import ApiChatController

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://sharpishly2.test",
        "http://localhost",
        "http://127.0.0.1"
    ],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

chat_controller = ApiChatController()


class ChatRequest(BaseModel):
    prompt: str
    tool: str = "calculator"


@app.post("/api/chat")
async def chat(request: ChatRequest) -> dict:
    return await chat_controller.handleChatMessage(request.model_dump())