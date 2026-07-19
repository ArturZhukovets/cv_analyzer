from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.dependencies import get_db, get_llm_service
from models.job import Job
from models.run import Run
from schemas import CoverLetterRead, CoverLetterRequest
from services import LLMService

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("/{job_id}/cover-letter")
async def create_cover_letter(
    job_id: int,
    payload: CoverLetterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    llm: Annotated[LLMService, Depends(get_llm_service)],
) -> CoverLetterRead:
    job_result = await db.execute(
        select(Job)
        .options(selectinload(Job.run).selectinload(Run.resume))
        .where(Job.id == job_id)
    )
    job = job_result.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        )

    if job.result_json is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job {job_id} has no successful analysis to base a cover letter on",
        )

    if job.cover_letter_md and not payload.regenerate:
        return CoverLetterRead(job_id=job.id, cover_letter_md=job.cover_letter_md)

    cv_json = job.run.resume.parsed_json
    if cv_json is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job {job_id}'s resume has no parsed CV JSON",
        )

    letter = await llm.write_cover_letter(cv_json, job.raw_text, job.result_json)
    job.cover_letter_md = letter
    await db.commit()

    return CoverLetterRead(job_id=job.id, cover_letter_md=letter)
