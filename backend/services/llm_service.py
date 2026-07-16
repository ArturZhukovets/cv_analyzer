from typing import Any

from configs.settings import AppSettings


class LLMService:
    """All LLM calls live here: extraction, adjudication, narrative judgment.

    Deterministic logic (scoring, skill overlap) must never end up in this class —
    see plan.md "Analysis Pipeline".
    """

    def __init__(self, settings: AppSettings) -> None:
        self._settings = settings

    async def extract_resume(self, raw_text: str) -> dict[str, Any] | None:
        """One extraction call: raw CV text -> parsed_json (resume schema in plan.md)."""
        pass
