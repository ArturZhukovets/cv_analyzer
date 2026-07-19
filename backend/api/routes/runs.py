from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies import get_db, get_llm_service
from models.job import Job
from models.job_result import JobResult
from models.resume import Resume
from models.run import Run
from schemas import JobAnalysis, RunCreate, RunDetailRead, RunJobResultRead, RunRead
from services import LLMService, analyze_run

router = APIRouter(prefix="/api/runs", tags=["Runs"])
RECOMMENDATION_ORDER = {
    "strong_fit": 0,
    "possible_fit": 1,
    "stretch": 2,
    "not_a_fit": 3,
}


def _pick_result_for_job(results: list[JobResult], job_id: int) -> JobResult | None:
    matching_results = [result for result in results if result.job_id == job_id]
    if not matching_results:
        return None
    return max(matching_results, key=lambda result: result.created_at)


def _to_job_result_read(job_id: int, stored_result: JobResult | None) -> RunJobResultRead:
    if stored_result is None:
        return RunJobResultRead(job_id=job_id, error="No analysis result found for this job")

    if stored_result.result_json is None:
        return RunJobResultRead(
            job_id=job_id,
            error=stored_result.error or "Analysis failed",
        )

    try:
        parsed = JobAnalysis.model_validate(stored_result.result_json)
    except ValidationError:
        return RunJobResultRead(
            job_id=job_id,
            error="Stored analysis payload is invalid",
        )

    return RunJobResultRead(job_id=job_id, result=parsed, error=stored_result.error)


def _sort_key(job_result: RunJobResultRead) -> tuple[int, int]:
    if job_result.result is None:
        return (99, job_result.job_id)

    recommendation_rank = RECOMMENDATION_ORDER.get(job_result.result.recommendation, 98)
    return (recommendation_rank, job_result.job_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_run(
    payload: RunCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    llm: Annotated[LLMService, Depends(get_llm_service)],
) -> RunRead:
    resume = await db.get(Resume, payload.resume_id)
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resume {payload.resume_id} does not exist",
        )
    if resume.parsed_json is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Resume {payload.resume_id} has no parsed CV JSON. "
                "Upload a successfully extracted CV first."
            ),
        )

    run = Run(resume_id=resume.id, resume=resume)
    jobs = [Job(run=run, raw_text=job_text) for job_text in payload.job_texts]

    db.add(run)
    db.add_all(jobs)
    await db.commit()
    # Refresh only the server-generated column: a full refresh expires the in-memory
    # `jobs`/`resume` relationships, and touching them later would sync-lazy-load
    # inside the async session (MissingGreenlet).
    await db.refresh(run, attribute_names=["created_at"])

    await analyze_run(run, db, llm)

    return RunRead(run_id=run.id, resume_id=run.resume_id, created_at=run.created_at)

# TODO: Refactor this code a bit to make it clear
@router.get("/{run_id}")
async def get_run(
    run_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunDetailRead:
    run_result = await db.execute(
        select(Run)
        .options(selectinload(Run.jobs), selectinload(Run.results))
        .where(Run.id == run_id)
    )
    run = run_result.scalar_one_or_none()
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    jobs: list[RunJobResultRead] = []
    for job in run.jobs:
        stored_result = _pick_result_for_job(run.results, job.id)
        jobs.append(_to_job_result_read(job.id, stored_result))
    jobs.sort(key=_sort_key)

    return RunDetailRead(
        run_id=run.id,
        resume_id=run.resume_id,
        created_at=run.created_at,
        jobs=jobs,
    )
