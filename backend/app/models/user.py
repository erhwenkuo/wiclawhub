import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    handle: str | None = Field(default=None, unique=True, index=True, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    image: str | None = Field(default=None, max_length=1024)
    api_token_hash: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, unique=True, index=True, max_length=255)
    password_hash: str | None = Field(default=None, max_length=255)
    email_verified: bool = Field(default=False)
    auth_provider: str | None = Field(default=None, max_length=50)
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
