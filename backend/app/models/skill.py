import uuid
from datetime import datetime, timezone

from sqlalchemy import Column
from sqlalchemy import types as sa_types
from sqlmodel import Field, SQLModel

from app.models.types import JSONType


class Skill(SQLModel, table=True):
    __tablename__ = "skills"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    slug: str = Field(unique=True, index=True, max_length=255)
    display_name: str = Field(max_length=255)
    summary: str | None = Field(default=None, sa_type=sa_types.Text())
    tags: dict = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False, server_default="{}"))
    stats: dict = Field(default_factory=dict, sa_column=Column(JSONType, nullable=False, server_default="{}"))
    owner_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    is_deleted: bool = Field(default=False)
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
    updated_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
