from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .job_result import JobResult
    from .run import Run


class Job(Base, TimestampMixin):
    """A single job posting pasted into a run. `parsed_json` is nullable because
    a posting that fails the `is_valid` guardrail is never extracted."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id"), nullable=False, index=True
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    is_valid: Mapped[bool] = mapped_column(default=True, nullable=False)

    run: Mapped[Run] = relationship(back_populates="jobs")
    results: Mapped[list[JobResult]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )
