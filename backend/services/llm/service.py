from pathlib import Path
from typing import Any

from langchain_core.language_models import LanguageModelInput
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import Runnable, RunnableLambda
from pydantic import BaseModel

from configs.settings import AppSettings
from schemas import ExtractedResume, JobAnalysis
from services.llm.messages import (
    build_ask_context,
    build_file_message,
    build_sections_message,
)
from services.llm.models import build_chat_model
from services.llm.prompts import (
    ANALYZE_JOB_PROMPT,
    COVER_LETTER_PROMPT,
    PARSE_CV_PROMPT,
    ASK_RUN_PROMPT,
)


def _parsed_or_none(result: dict[str, Any]) -> BaseModel | None:
    if result["parsing_error"] is not None:
        raise result["parsing_error"]
    return result["parsed"]


class LLMService:
    """
    All LLM calls live here: extraction, adjudication, narrative judgment.

    Deterministic logic (scoring, skill overlap) must never end up in this class —
    """

    def __init__(self, app_settings: AppSettings) -> None:
        self._fast = build_chat_model(app_settings.llm_fast_model, app_settings)
        self._strong = build_chat_model(app_settings.llm_strong_model, app_settings)
        self._max_concurrency = app_settings.llm_max_concurrency
        self._extract: Runnable[LanguageModelInput, ExtractedResume | None] = self._fast.with_structured_output(
            ExtractedResume, include_raw=True
        ) | RunnableLambda(_parsed_or_none)
        self._analyze: Runnable[LanguageModelInput, JobAnalysis | None] = self._strong.with_structured_output(
            JobAnalysis, include_raw=True
        ) | RunnableLambda(_parsed_or_none)
        self._text = self._strong | StrOutputParser()

    def _create_analyze_messages_obj_list(
        self, cv_json: dict[str, Any], job_text: str
    ) -> list[SystemMessage | HumanMessage]:
        system_prompt = ANALYZE_JOB_PROMPT.read_text(encoding="utf-8")
        return [
            SystemMessage(system_prompt),
            build_sections_message(
                {
                    "Candidate CV (structured JSON)": cv_json,
                    "Job posting (raw text)": job_text,
                }
            ),
        ]

    async def extract_resume(self, file_path: Path) -> ExtractedResume | None:
        """
        Parse a CV file (PDF) directly into a schema-validated resume.
        The file is handed to the model as-is — extraction and structuring happen in a
        single call. Returns the parsed `ExtractedResume`, or None if the model returned
        nothing. An invalid CV still parses, with `is_valid_resume: false`.
        """

        system_prompt = PARSE_CV_PROMPT.read_text(encoding="utf-8")

        return await self._extract.ainvoke(
            [
                SystemMessage(system_prompt),
                build_file_message(file_path)],
        )

    async def extract_resume_from_text(self, text: str) -> ExtractedResume | None:
        """Same extraction as `extract_resume`, but from pre-extracted plain text (DOCX)."""
        system_prompt = PARSE_CV_PROMPT.read_text(encoding="utf-8")
        return await self._extract.ainvoke(
            [SystemMessage(system_prompt), HumanMessage(text)]
        )

    async def analyze_job(
        self, cv_json: dict[str, Any], job_text: str
    ) -> JobAnalysis | None:
        """
        Compare the CV JSON against one job posting in a single structured call on the
        strong model. Returns the schema-validated `JobAnalysis`, or None if the model
        returned nothing. Invalid postings still parse, with `is_valid_job_posting: false`.
        """
        return await self._analyze.ainvoke(self._create_analyze_messages_obj_list(cv_json, job_text))

    async def analyze_jobs(
        self, cv_json: dict[str, Any], job_texts: list[str]
    ) -> list[JobAnalysis | None | BaseException]:
        """Analyze many job postings against the same CV, capped by `llm_max_concurrency`.

        Order matches `job_texts`. Failures are returned as exceptions (`return_exceptions`)
        so one bad job does not cancel the batch.
        """
        return await self._analyze.abatch(
            [self._create_analyze_messages_obj_list(cv_json, t) for t in job_texts],
            config={"max_concurrency": self._max_concurrency},
            return_exceptions=True,
        )

    async def answer_run_question(
        self,
        cv_json: dict[str, Any],
        jobs: list[dict[str, Any]],
        question: str,
        history: list[AIMessage | HumanMessage],
    ) -> str:

        system_prompt = ASK_RUN_PROMPT.read_text(encoding="utf-8")
        return await self._text.ainvoke(
            [
                SystemMessage(system_prompt),
                HumanMessage(content=build_ask_context(cv_json, jobs)),
                *history,
                HumanMessage(content=question),
            ]
        )

    async def write_cover_letter(
        self, cv_json: dict[str, Any], job_text: str, analysis: dict[str, Any]
    ) -> str:
        """Generate a markdown cover letter for one job from the CV JSON, the raw posting,
        and that job's computed analysis, on the strong model."""
        system_prompt = COVER_LETTER_PROMPT.read_text(encoding="utf-8")
        return await self._text.ainvoke(
            [
                SystemMessage(system_prompt),
                build_sections_message(
                    {
                        "Candidate CV (structured JSON)": cv_json,
                        "Job posting (raw text)": job_text,
                        "Computed analysis for this job": analysis,
                    }
                ),
            ]
        )
