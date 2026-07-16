from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .job import Job
    from .run import Run


class JobResult(Base, TimestampMixin):
    
    __tablename__ = "job_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id"), nullable=False, index=True
    )
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id"), nullable=False, index=True
    )

    # Deterministic — computed, not generated
    match_score: Mapped[float] = mapped_column(Float, nullable=False)
    matched_skills_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False
    )  # [{required, matched_as, method}]
    gap_skills_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False
    )  # [{skill, required|preferred}]

    # LLM judgment, structured
    narrative_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Lazy, nullable — generated only on request
    interview_qs_md: Mapped[str | None] = mapped_column(Text)

    # Observability
    tokens_used: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)

    run: Mapped[Run] = relationship(back_populates="results")
    job: Mapped[Job] = relationship(back_populates="results")
