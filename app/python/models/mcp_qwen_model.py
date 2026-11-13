# models/mcp_qwen_model.py
import json
from typing import Any

from core.llm import LlmClient
from core.model import BaseModel
from core.responses import ApiResponse
from services.confirmation_store import ConfirmationStore
from services.tool_call_validator import ToolCallValidator
from services.tool_registry import ToolRegistry
from services.tool_risk_policy import ToolRiskPolicy


class McpQwenModel(BaseModel):
    def __init__(
        self,
        llm_client: LlmClient,
        tool_registry: ToolRegistry,
        validator: ToolCallValidator,
        risk_policy: ToolRiskPolicy,
        confirmations: ConfirmationStore,
    ):
        self._llm = llm_client
        self._tools = tool_registry
        self._validator = validator
        self._risk_policy = risk_policy
        self._confirmations = confirmations

    async def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        user_prompt = str(payload.get("prompt", "")).strip()

        if not user_prompt:
            return ApiResponse.error(
                "INVALID_REQUEST",
                "A non-empty natural-language prompt is required.",
            ).to_dict()

        try:
            completion = await self._llm.complete(
                self._build_prompt(user_prompt),
            )
        except Exception as exc:
            return ApiResponse.error("LLM_ERROR", str(exc)).to_dict()

        proposal = self._parse_proposal(completion)

        if proposal is None:
            return ApiResponse.error(
                "INVALID_MODEL_RESPONSE",
                "The language model did not return a valid tool-selection object.",
            ).to_dict()

        return await self._process_proposal(proposal)

    def _build_prompt(self, user_prompt: str) -> str:
        tools = json.dumps(
            self._tools.summaries(),
            indent=2,
            default=str,
        )

        return f"""You are an MCP tool-routing assistant.

Available tools:
{tools}

Select at most one applicable tool.
Extract only arguments allowed by that tool's input schema.
Do not invent fields.

If no tool applies, return:
{{"tool": null, "args": {{}}}}

Respond with JSON only:
{{"tool": "tool_name_or_null", "args": {{}}}}

User request:
{user_prompt}
"""

    def _parse_proposal(self, completion: str) -> dict[str, Any] | None:
        text = self._strip_code_fence(completion)

        try:
            value = json.loads(text)
            return value if isinstance(value, dict) else None
        except json.JSONDecodeError:
            return self._extract_embedded_json(text)

    @staticmethod
    def _strip_code_fence(text: str) -> str:
        if not text.startswith("```"):
            return text.strip()

        lines = text.splitlines()
        return "\n".join(lines[1:-1]).strip()

    @staticmethod
    def _extract_embedded_json(text: str) -> dict[str, Any] | None:
        decoder = json.JSONDecoder()

        for index, character in enumerate(text):
            if character != "{":
                continue

            try:
                value, _ = decoder.raw_decode(text[index:])
            except json.JSONDecodeError:
                continue

            if isinstance(value, dict):
                return value

        return None

    async def _process_proposal(
        self,
        proposal: dict[str, Any],
    ) -> dict[str, Any]:
        tool_name = proposal.get("tool")
        arguments = proposal.get("args") or {}

        if not tool_name:
            return ApiResponse.error(
                "NO_TOOL_SELECTED",
                "The request did not map to an available MCP tool.",
            ).to_dict()

        tool = self._tools.get(str(tool_name))

        if tool is None:
            return ApiResponse.error(
                "UNKNOWN_TOOL",
                f"Unknown or unavailable tool: {tool_name}",
            ).to_dict()

        errors = self._validator.validate(tool, arguments)

        if errors:
            return ApiResponse.error(
                "INVALID_TOOL_ARGUMENTS",
                "; ".join(errors),
            ).to_dict()

        if self._risk_policy.requires_confirmation(tool, arguments):
            confirmation = self._confirmations.create(
                str(tool_name),
                arguments,
            )

            return ApiResponse.confirmation_required(
                confirmation["confirmation_id"],
                str(tool_name),
                arguments,
                confirmation["expires_at"],
            ).to_dict()

        return {
            "status": "ready",
            "tool": str(tool_name),
            "args": arguments,
        }