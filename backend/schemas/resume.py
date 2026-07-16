from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    parsed_json: dict[str, Any] | None
    created_at: datetime


class ExperienceEntry(BaseModel):
    company: str
    title: str
    description: str | None = Field(
        default=None,
        description="Free-text responsibilities and achievements for this role.",
    )


class ExtractedResume(BaseModel):
    """
    Schema-validated output of the Resume extraction LLM call.
    """

    is_valid_resume: bool
    rejection_reason: str | None = Field(
        default=None,
        description="Short, friendly reason when is_valid_resume is false; else null.",
    )

    candidate_name: str | None = None
    seniority: Literal["junior", "mid", "senior", "lead", "principal"] | None = None
    total_years_experience: float | None = Field(
        default=None,
        description="Total professional experience in years, estimated from CV context.",
    )

    skills: list[str] = Field(
        default_factory=list,
        description="Flat, deduplicated, canonical skill names used for embedding match.",
    )
    experience: list[ExperienceEntry] = Field(default_factory=list)

    profile_text: str | None = Field(
        default=None,
        description=(
            "Dense free-text profile packing everything not captured in structured "
            "fields (education, certifications, projects, languages, impact) for "
            "comparison against job descriptions."
        ),
    )
