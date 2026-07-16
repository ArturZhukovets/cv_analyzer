from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    parsed_json: dict[str, Any] | None
    created_at: datetime
