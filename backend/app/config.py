from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for .env in backend/ first, then project root
_env_files = [f for f in [Path(".env"), Path("../.env")] if f.is_file()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files or ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    SKILL_SITE_NAME: str = "WiClawHub"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./wiclawhub.db"

    # Auth
    SECRET_KEY: str = "change-me-in-production"

    # JWT
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth - GitHub
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Frontend URL (for OAuth redirect)
    FRONTEND_URL: str = "http://localhost:5173"

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_AVATAR_SIZE: int = 2 * 1024 * 1024  # 2 MB

    # Rate limiting (requests per minute)
    RATE_LIMIT_READ: int = 120
    RATE_LIMIT_WRITE: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.DATABASE_URL

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET_KEY or self.SECRET_KEY

    @property
    def sync_database_url(self) -> str:
        """Return sync version of database URL for Alembic."""
        return self.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")


settings = Settings()
