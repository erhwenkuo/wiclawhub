import uuid
from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Star(SQLModel, table=True):
    __tablename__ = "stars"
    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_star_user_skill"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    skill_id: uuid.UUID = Field(foreign_key="skills.id", index=True)
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
