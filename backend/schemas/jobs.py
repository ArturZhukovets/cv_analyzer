from typing import Literal

from pydantic import BaseModel, Field


class JobSkill(BaseModel):
    name: str = Field(description="Canonical skill name from the posting.")
    matched: bool = Field(
        description=(
            "True if the CV evidences this skill, matched semantically "
            "(e.g. 'Django' in the CV matches a 'Python web frameworks' requirement)."
        )
    )


class JobAnalysis(BaseModel):
    """Schema-validated output of the per-job CV↔JD comparison LLM call."""

    # --- Job posting extraction (skip everything below if not a real posting) ---
    is_valid_job_posting: bool = Field(
        description="False if the pasted text is not an actual job description (spam, empty, an article, a CV, etc.)."
    )
    rejection_reason: str | None = Field(
        default=None,
        description="Short, friendly reason when is_valid_job_posting is false; else null.",
    )

    title: str | None = None
    company: str | None = None
    seniority: Literal["junior", "mid", "senior", "lead", "principal"] | None = Field(
        default=None,
        description="Seniority the posting targets, inferred from responsibilities and years asked.",
    )
    years_required: float | None = Field(
        default=None,
        description="Minimum years of relevant experience the posting asks for; null if unstated.",
    )

    # One flat list: every skill the posting asks for, each tagged with whether the
    # CV evidences it. Frontend filters this into matched/missing chips.
    skills: list[JobSkill] = Field(
        default_factory=list,
        description="Every skill the posting asks for, each tagged with whether the CV evidences it.",
    )

    # --- LLM judgment ---
    recommendation: Literal["strong_fit", "possible_fit", "stretch", "not_a_fit"] = Field(
        description="Overall fit verdict weighing skills, seniority, domain, and trajectory — not just keyword overlap."
    )
    assessment: str = Field(
        description=(
            "The full human-readable verdict for this role, a few sentences: why the candidate does or "
            "doesn't fit, their strongest selling points grounded in real CV roles/projects, and the gaps "
            "that matter most. This is the headline the user reads."
        )
    )
