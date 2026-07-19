from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.job import Job
from models.job_result import JobResult
from models.run import Run
from schemas import JobAnalysis

if TYPE_CHECKING:
    from services.llm_service import LLMService


def build_analysis_input(cv_json: dict[str, Any], job_text: str) -> list[dict[str, Any]]:
    """Pure builder for the `responses.parse` input: the candidate CV JSON plus the
    raw job text. The matching rules themselves live in `prompts/analyze_job.md` (passed
    as `instructions`), so this stays a plain, API-key-free function to test."""
    cv_block = json.dumps(cv_json, ensure_ascii=False, indent=2)
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": f"# Candidate CV (structured JSON)\n{cv_block}",
                },
                {
                    "type": "input_text",
                    "text": f"# Job posting (raw text)\n{job_text}",
                },
            ],
        }
    ]


async def _analyze_one(
    llm: LLMService, cv_json: dict[str, Any], job: Job
) -> JobResult:
    """Analyze a single job, isolating failure to this job's result row."""
    try:
        analysis = await llm.analyze_job(cv_json, job.raw_text)
        if analysis is None:
            return JobResult(
                run_id=job.run_id,
                job_id=job.id,
                error="Analysis returned no output",
            )
        job.is_valid = analysis.is_valid_job_posting
        return JobResult(
            run_id=job.run_id,
            job_id=job.id,
            result_json=analysis.model_dump(),
        )
    except Exception as exc:
        return JobResult(run_id=job.run_id, job_id=job.id, error=str(exc))


async def analyze_run(run: Run, db: AsyncSession, llm: LLMService) -> list[JobResult]:
    """Analyze every job in a run in parallel and persist one `JobResult` each.

    Requires the run's resume to have parsed CV JSON. One job failing does not sink
    the batch — its `JobResult.error` is set and `result_json` left null.
    """
    cv_json = run.resume.parsed_json
    if cv_json is None:
        raise ValueError("Cannot analyze a run whose resume has no parsed CV JSON")

    results = await asyncio.gather(
        *(_analyze_one(llm, cv_json, job) for job in run.jobs)
    )

    db.add_all(results)
    await db.commit()
    for result in results:
        await db.refresh(result)
    return results
