import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    token_hash: str = Field(max_length=255, index=True)
    expires_at: float
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
    revoked: bool = Field(default=False)
