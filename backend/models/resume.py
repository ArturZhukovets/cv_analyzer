from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .run import Run


class Resume(Base, TimestampMixin):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # NULL until LLM extraction runs (or after it fails) — see plan.md "CV Page"
    parsed_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    runs: Mapped[list[Run]] = relationship(
        back_populates="resume",
        cascade="all, delete-orphan",
    )
