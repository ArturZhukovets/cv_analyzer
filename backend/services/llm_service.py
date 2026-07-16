import base64
import mimetypes
from pathlib import Path

from openai import AsyncOpenAI

from configs.settings import AppSettings
from schemas import ExtractedResume

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

PARSE_CV_PROMPT = (PROMPTS_DIR / "parse_cv.md").read_text(encoding="utf-8")


class LLMService:
    """All LLM calls live here: extraction, adjudication, narrative judgment.

    Deterministic logic (scoring, skill overlap) must never end up in this class —
    see plan.md "Analysis Pipeline".
    """

    def __init__(self, app_settings: AppSettings) -> None:
        self._app_settings = app_settings
        self._client = AsyncOpenAI(api_key=app_settings.openai_api_key)

    async def extract_resume(self, file_path: Path) -> ExtractedResume | None:
        """
        Parse a CV file (PDF) directly into a schema-validated resume.
        The file is handed to the model as-is — extraction and structuring happen in a
        single call. Returns the parsed `ExtractedResume`, or None if the model returned
        nothing. An invalid CV still parses, with `is_valid_resume: false`.
        """
        file_data = base64.b64encode(file_path.read_bytes()).decode("utf-8")
        mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        response = await self._client.responses.parse(
            model=self._app_settings.openai_model,
            instructions=PARSE_CV_PROMPT,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_file",
                            "filename": file_path.name,
                            "file_data": f"data:{mime_type};base64,{file_data}",
                        },
                    ],
                }
            ],
            text_format=ExtractedResume,
        )
        return response.output_parsed

    async def extract_resume_from_text(self, text: str) -> ExtractedResume | None:
        """Same extraction as `extract_resume`, but from pre-extracted plain text (DOCX)."""
        response = await self._client.responses.parse(
            model=self._app_settings.openai_model,
            instructions=PARSE_CV_PROMPT,
            input=text,
            text_format=ExtractedResume,
        )
        return response.output_parsed
