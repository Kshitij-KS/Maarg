"""Small OpenAI-compatible JSON client with safe disabled defaults."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

import httpx


class LLMUnavailableError(RuntimeError):
    """Raised when LLM behavior is disabled, unconfigured, or returns invalid data."""


@dataclass(frozen=True)
class LLMConfig:
    enabled: bool
    provider: str
    model: str
    api_key: str | None
    timeout_seconds: float
    base_url: str

    @classmethod
    def from_env(cls) -> LLMConfig:
        return cls(
            enabled=os.getenv("LLM_ENABLED", "false").lower() in {"1", "true", "yes", "on"},
            provider=os.getenv("LLM_PROVIDER", "openai").lower(),
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            api_key=os.getenv("OPENAI_API_KEY"),
            timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "8")),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )


class OpenAIJSONClient:
    """Call OpenAI Chat Completions and require a JSON object response."""

    def __init__(self, config: LLMConfig | None = None) -> None:
        self.config = config or LLMConfig.from_env()

    def is_configured(self) -> bool:
        return (
            self.config.enabled
            and self.config.provider == "openai"
            and bool(self.config.api_key)
        )

    def complete_json(self, *, system: str, user: str) -> dict[str, Any]:
        if not self.is_configured():
            raise LLMUnavailableError("LLM is disabled or OPENAI_API_KEY is not configured.")

        response = httpx.post(
            f"{self.config.base_url.rstrip('/')}/chat/completions",
            headers={
                "authorization": f"Bearer {self.config.api_key}",
                "content-type": "application/json",
            },
            json={
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            },
            timeout=self.config.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            raise LLMUnavailableError("LLM response was not a JSON object.")
        return parsed
