from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx
import os

chat_router = APIRouter(prefix="/api/v1", tags=["chat"])

class ChatPayload(BaseModel):
    reality_id: int
    anchors: List[Dict[str, Any]] = []
    history: List[Dict[str, Any]] = []
    prompt: str

@chat_router.post("/chat")
async def handle_chat(payload: ChatPayload):
    try:
        # Build compact context window
        system_directives = "Core System Directives & Durable Facts:\n"
        for anchor in payload.anchors:
            system_directives += f"- [{anchor.get('entity_name', 'Fact')}]: {anchor.get('observed_state', '')}\n"

        messages = [{"role": "system", "content": system_directives}]
        for msg in payload.history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
            
        messages.append({"role": "user", "content": payload.prompt})

        qwen_url = os.getenv("QWEN_API_URL", "http://192.168.0.90:8081/api/chat")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(qwen_url, json={"model": "qwen2.5:0.5b", "messages": messages, "stream": False})
            data = resp.json()
            reply = data.get("response") or data.get("message", {}).get("content") or str(data)

        return {"status": "success", "response": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))