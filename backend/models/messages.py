from typing import TYPE_CHECKING
from sqlalchemy import Integer, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from models.run import Run


class RunMessage(Base, TimestampMixin):
    __tablename__ = "run_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    run: Mapped["Run"] = relationship("Run", back_populates="messages")

