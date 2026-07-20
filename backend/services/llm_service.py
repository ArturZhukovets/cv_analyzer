import base64
import mimetypes
from pathlib import Path
from typing import Any

from openai import AsyncOpenAI

from configs.settings import AppSettings
from schemas import ExtractedResume, JobAnalysis
from services.analysis import build_user_input

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

PARSE_CV_PROMPT = (PROMPTS_DIR / "parse_cv.md").read_text(encoding="utf-8")
ANALYZE_JOB_PROMPT = (PROMPTS_DIR / "analyze_job.md").read_text(encoding="utf-8")
ASK_RUN_PROMPT = (PROMPTS_DIR / "ask_run.md").read_text(encoding="utf-8")
COVER_LETTER_PROMPT = (PROMPTS_DIR / "cover_letter.md").read_text(encoding="utf-8")


class LLMService:
    """
    All LLM calls live here: extraction, adjudication, narrative judgment.

    Deterministic logic (scoring, skill overlap) must never end up in this class —
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

    async def analyze_job(
        self, cv_json: dict[str, Any], job_text: str
    ) -> JobAnalysis | None:
        """
        Compare the CV JSON against one job posting in a single structured call on the
        strong model. Returns the schema-validated `JobAnalysis`, or None if the model
        returned nothing. Invalid postings still parse, with `is_valid_job_posting: false`.
        """
        response = await self._client.responses.parse(
            model=self._app_settings.openai_strong_model,
            instructions=ANALYZE_JOB_PROMPT,
            input=build_user_input(
                {
                    "Candidate CV (structured JSON)": cv_json,
                    "Job posting (raw text)": job_text,
                }
            ),
            text_format=JobAnalysis,
        )
        return response.output_parsed

    async def answer_run_question(
        self, cv_json: dict[str, Any], jobs: list[dict[str, Any]], question: str
    ) -> str:
        """Free-form Q&A over a whole run: CV JSON + every job's raw text and computed
        analysis are stuffed into context (no RAG) and answered by the strong model."""
        response = await self._client.responses.create(
            model=self._app_settings.openai_strong_model,
            instructions=ASK_RUN_PROMPT,
            input=build_user_input(
                {
                    "Candidate CV (structured JSON)": cv_json,
                    "Jobs in this run (raw posting + computed analysis)": jobs,
                    "Question": question,
                }
            ),
        )
        return response.output_text

    async def write_cover_letter(
        self, cv_json: dict[str, Any], job_text: str, analysis: dict[str, Any]
    ) -> str:
        """Generate a markdown cover letter for one job from the CV JSON, the raw posting,
        and that job's computed analysis, on the strong model."""
        response = await self._client.responses.create(
            model=self._app_settings.openai_strong_model,
            instructions=COVER_LETTER_PROMPT,
            input=build_user_input(
                {
                    "Candidate CV (structured JSON)": cv_json,
                    "Job posting (raw text)": job_text,
                    "Computed analysis for this job": analysis,
                }
            ),
        )
        return response.output_text
