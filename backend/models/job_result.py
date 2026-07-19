from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .job import Job
    from .run import Run


class JobResult(Base, TimestampMixin):
    """One analysis outcome per job in a run. Holds the schema-validated
    `JobAnalysis` (schemas/jobs.py) as a JSON blob — repeat views cost zero LLM
    calls. `result_json` is null when the analysis call failed; `error` then
    carries the failure marker."""

    __tablename__ = "job_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id"), nullable=False, index=True
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id"), nullable=False, index=True
    )

    result_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)

    run: Mapped[Run] = relationship(back_populates="results")
    job: Mapped[Job] = relationship(back_populates="results")
