import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel, UniqueConstraint


class OAuthAccount(SQLModel, table=True):
    __tablename__ = "oauth_accounts"
    __table_args__ = (
        UniqueConstraint("provider", "provider_account_id", name="uq_oauth_provider_account"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    provider: str = Field(max_length=50)
    provider_account_id: str = Field(max_length=255)
    provider_email: str | None = Field(default=None, max_length=255)
    access_token_encrypted: str | None = Field(default=None, max_length=1024)
    created_at: float = Field(
        default_factory=lambda: datetime.now(timezone.utc).timestamp()
    )
