from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.job import Job
from models.run import Run

if TYPE_CHECKING:
    from services.llm_service import LLMService


def _fmt(value: str | dict[str, Any] | list[Any]) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, indent=2)


def build_user_input(sections: dict[str, Any]) -> list[dict[str, Any]]:
    """Pure builder for a `responses` call input: one titled `input_text` block per
    section, dicts/lists rendered as JSON. The prompt rules themselves live in
    `prompts/*.md` (passed as `instructions`), so this stays a plain, API-key-free
    function to test."""
    return [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": f"# {title}\n{_fmt(value)}"}
                for title, value in sections.items()
            ],
        }
    ]


async def _analyze_one(llm: LLMService, cv_json: dict[str, Any], job: Job) -> None:
    """Analyze a single job, isolating failure to that job's result columns."""
    try:
        analysis = await llm.analyze_job(cv_json, job.raw_text)
        if analysis is None:
            job.error = "Analysis returned no output"
            return
        job.is_valid = analysis.is_valid_job_posting
        job.result_json = analysis.model_dump()
    except Exception as exc:
        job.error = str(exc)


async def analyze_run(run: Run, db: AsyncSession, llm: LLMService) -> None:
    """Analyze every job in a run in parallel and store the outcome on each job.

    Requires the run's resume to have parsed CV JSON. One job failing does not sink
    the batch — its `error` is set and `result_json` left null.
    """
    cv_json = run.resume.parsed_json
    if cv_json is None:
        raise ValueError("Cannot analyze a run whose resume has no parsed CV JSON")

    await asyncio.gather(*(_analyze_one(llm, cv_json, job) for job in run.jobs))
    await db.commit()
