from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .run import Run


class Job(Base, TimestampMixin):
    """A single job posting pasted into a run, plus its analysis outcome.
    `result_json` holds the schema-validated `JobAnalysis` (schemas/jobs.py) —
    repeat views cost zero LLM calls. It is null when the analysis call failed;
    `error` then carries the failure marker."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id"), nullable=False, index=True
    )
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_valid: Mapped[bool] = mapped_column(default=True, nullable=False)

    result_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    cover_letter_md: Mapped[str | None] = mapped_column(Text)

    run: Mapped[Run] = relationship(back_populates="jobs")
