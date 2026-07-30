from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from models.run import Run

if TYPE_CHECKING:
    from services.llm import LLMService


async def analyze_run(run: Run, db: AsyncSession, llm: LLMService) -> None:
    """Analyze every job in a run in parallel and store the outcome on each job.

    Requires the run's resume to have parsed CV JSON. One job failing does not sink
    the batch — its `error` is set and `result_json` left null.
    """
    cv_json = run.resume.parsed_json
    if cv_json is None:
        raise ValueError("Cannot analyze a run whose resume has no parsed CV JSON")

    jobs = list(run.jobs)
    results = await llm.analyze_jobs(cv_json, [j.raw_text for j in jobs])
    for job, result in zip(jobs, results, strict=True):
        if isinstance(result, BaseException):
            job.error = str(result)
        elif result is None:
            job.error = "Analysis returned no output"
        else:
            job.is_valid = result.is_valid_job_posting
            job.result_json = result.model_dump()
    await db.commit()
