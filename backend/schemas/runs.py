from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from schemas.jobs import JobAnalysis

JobText = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=20000,
    ),
]

Question = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=2000,
    ),
]


class RunCreate(BaseModel):
    resume_id: int = Field(gt=0)
    job_texts: list[JobText] = Field(min_length=1, max_length=5)


class RunRead(BaseModel):
    run_id: int
    resume_id: int
    created_at: datetime


class RunJobResultRead(BaseModel):
    job_id: int
    result: JobAnalysis | None = None
    error: str | None = None


class RunDetailRead(BaseModel):
    run_id: int
    resume_id: int
    created_at: datetime
    jobs: list[RunJobResultRead]


class RunSummaryRead(BaseModel):

    run_id: int
    resume_id: int
    resume_filename: str
    job_count: int
    best_recommendation: str | None = None
    created_at: datetime


class RunAskRequest(BaseModel):
    question: Question


class RunAskResponse(BaseModel):
    run_id: int
    question: str
    answer: str
