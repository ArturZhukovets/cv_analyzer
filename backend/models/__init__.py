"""SQLAlchemy models for the Career Intelligence Assistant.

Importing this package registers every model on ``Base.metadata`` so table
creation and relationship resolution see the full schema.
"""

from .base import Base
from .job import Job
from .resume import Resume
from .run import Run

__all__ = ["Base", "Resume", "Run", "Job"]
