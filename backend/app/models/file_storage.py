import uuid
from datetime import datetime, timezone

from sqlalchemy import types as sa_types
from sqlmodel import Field, SQLModel


class FileStorage(SQLModel, table=True):
    __tablename__ = "file_storage"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    storage_id: str = Field(unique=True, index=True, max_length=255)
    content: bytes = Field(sa_type=sa_types.LargeBinary())
    content_type: str = Field(default="application/octet-stream", max_length=255)
    sha256: str = Field(max_length=64, index=True)
    size: int = Field(default=0)
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
