import uuid
from datetime import datetime, timezone

from sqlalchemy import Column
from sqlalchemy import types as sa_types
from sqlmodel import Field, SQLModel

from app.models.types import JSONType


class SkillVersion(SQLModel, table=True):
    __tablename__ = "skill_versions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skill_id: uuid.UUID = Field(foreign_key="skills.id", index=True)
    version: str = Field(max_length=64)
    changelog: str = Field(default="", sa_type=sa_types.Text())
    changelog_source: str | None = Field(default=None, max_length=16)
    files: list = Field(default_factory=list, sa_column=Column(JSONType, nullable=False, server_default="[]"))
    security: dict = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False, server_default="{}"))
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
