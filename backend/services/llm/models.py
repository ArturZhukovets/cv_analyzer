from typing import Any

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel

from configs.settings import AppSettings


def _api_key(provider: str, s: AppSettings) -> str | None:
    return {
        "openai": s.openai_api_key,
        "anthropic": s.anthropic_api_key,
    }.get(provider)


def build_chat_model(model_id: str, s: AppSettings) -> BaseChatModel:
    provider, _, _ = model_id.partition(":")
    kwargs: dict[str, Any] = {
        "api_key": _api_key(provider, s),
        "max_retries": s.llm_max_retries,
        "timeout": s.llm_timeout_s,
    }
    if provider == "openai":
        # Keep today's wire format; the fallback to Chat Completions would change
        # the payload for both the PDF block and structured output.
        kwargs["use_responses_api"] = True
    return init_chat_model(model_id, **kwargs)
