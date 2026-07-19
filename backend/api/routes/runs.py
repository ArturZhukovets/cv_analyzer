from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies import get_db, get_llm_service
from models.job import Job
from models.resume import Resume
from models.run import Run
from schemas import (
    JobAnalysis,
    RunAskRequest,
    RunAskResponse,
    RunCreate,
    RunDetailRead,
    RunJobResultRead,
    RunRead,
    RunSummaryRead,
)
from services import LLMService, analyze_run

router = APIRouter(prefix="/api/runs", tags=["Runs"])
RECOMMENDATION_ORDER = {
    "strong_fit": 0,
    "possible_fit": 1,
    "stretch": 2,
    "not_a_fit": 3,
}


async def _get_run_or_404(run_id: int, db: AsyncSession) -> Run:
    result = await db.execute(
        select(Run)
        .options(selectinload(Run.resume), selectinload(Run.jobs))
        .where(Run.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )
    return run


def _to_job_result_read(job: Job) -> RunJobResultRead:
    if job.result_json is None:
        return RunJobResultRead(job_id=job.id, error=job.error or "Analysis failed")

    try:
        parsed = JobAnalysis.model_validate(job.result_json)
    except ValidationError:
        return RunJobResultRead(job_id=job.id, error="Stored analysis payload is invalid")

    return RunJobResultRead(job_id=job.id, result=parsed, error=job.error)


def _sort_key(job_result: RunJobResultRead) -> tuple[int, int]:
    if job_result.result is None:
        return (99, job_result.job_id)

    recommendation_rank = RECOMMENDATION_ORDER.get(job_result.result.recommendation, 98)
    return (recommendation_rank, job_result.job_id)


def _best_recommendation(jobs: list[Job]) -> str | None:
    """The strongest verdict across a run's jobs (strong_fit first); null if none
    of the jobs produced a valid analysis."""
    recommendations = [
        job.result_json["recommendation"]
        for job in jobs
        if job.result_json and "recommendation" in job.result_json
    ]
    if not recommendations:
        return None
    return min(recommendations, key=lambda rec: RECOMMENDATION_ORDER.get(rec, 98))


@router.get("")
async def list_runs(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[RunSummaryRead]:
    result = await db.execute(
        select(Run)
        .options(selectinload(Run.resume), selectinload(Run.jobs))
        .order_by(Run.created_at.desc())
    )
    runs = result.scalars().all()
    return [
        RunSummaryRead(
            run_id=run.id,
            resume_id=run.resume_id,
            resume_filename=run.resume.filename,
            job_count=len(run.jobs),
            best_recommendation=_best_recommendation(run.jobs),
            created_at=run.created_at,
        )
        for run in runs
    ]


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


@router.get("/{run_id}")
async def get_run(
    run_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RunDetailRead:
    run = await _get_run_or_404(run_id, db)
    jobs = sorted((_to_job_result_read(job) for job in run.jobs), key=_sort_key)

    return RunDetailRead(
        run_id=run.id,
        resume_id=run.resume_id,
        created_at=run.created_at,
        jobs=jobs,
    )


@router.post("/{run_id}/ask")
async def ask_run(
    run_id: int,
    payload: RunAskRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    llm: Annotated[LLMService, Depends(get_llm_service)],
) -> RunAskResponse:
    run = await _get_run_or_404(run_id, db)

    cv_json = run.resume.parsed_json
    if cv_json is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Run {run_id}'s resume has no parsed CV JSON",
        )

    jobs_context = [
        {
            "job_id": job.id,
            "raw_text": job.raw_text,
            "analysis": job.result_json,
            "error": job.error,
        }
        for job in run.jobs
    ]

    answer = await llm.answer_run_question(cv_json, jobs_context, payload.question)
    return RunAskResponse(run_id=run.id, question=payload.question, answer=answer)
