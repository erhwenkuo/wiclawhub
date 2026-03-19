import uuid
from datetime import datetime, timezone

from sqlalchemy import Column
from sqlalchemy import types as sa_types
from sqlmodel import Field, SQLModel

from app.models.types import JSONType


class SkillModeration(SQLModel, table=True):
    __tablename__ = "skill_moderation"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skill_id: uuid.UUID = Field(foreign_key="skills.id", unique=True, index=True)
    is_suspicious: bool = Field(default=False)
    is_malware_blocked: bool = Field(default=False)
    verdict: str = Field(default="clean", max_length=32)
    reason_codes: list = Field(default_factory=list, sa_column=Column(JSONType, nullable=False, server_default="[]"))
    summary: str | None = Field(default=None, sa_type=sa_types.Text())
    engine_version: str | None = Field(default=None, max_length=64)
    legacy_reason: str | None = Field(default=None, max_length=255)
    evidence: list = Field(default_factory=list, sa_column=Column(JSONType, nullable=False, server_default="[]"))
    updated_at: float | None = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
