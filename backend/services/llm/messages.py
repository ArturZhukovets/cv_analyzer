import base64
import json
import mimetypes
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage


def _fmt(value: str | dict[str, Any] | list[Any]) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)


def build_sections_text(sections: dict[str, Any]) -> str:
    return "\n\n".join(f"# {title}\n{_fmt(value)}" for title, value in sections.items())


def build_ask_context(cv_json: dict[str, Any], jobs: list[dict[str, Any]]) -> str:
    """The CV + jobs blob re-sent with every `/ask` turn, never stored in history."""
    return build_sections_text(
        {
            "Candidate CV (structured JSON)": cv_json,
            "Jobs in this run (raw posting + computed analysis)": jobs,
        }
    )


def build_sections_message(sections: dict[str, Any]) -> HumanMessage:
    return HumanMessage(
        content=[
            {"type": "text", "text": f"# {title}\n{_fmt(value)}"}
            for title, value in sections.items()
        ]
    )


def build_file_message(file_path: Path) -> HumanMessage:
    mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return HumanMessage(
        content=[
            {
                "type": "file",
                "base64": base64.b64encode(file_path.read_bytes()).decode(),
                "mime_type": mime,
                "filename": file_path.name,
            }
        ]
    )
