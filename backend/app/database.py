from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

        # Create FTS5 virtual table and sync triggers for SQLite
        if settings.is_sqlite:
            await conn.execute(text(
                "CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5("
                "slug, display_name, summary, "
                "content='skills', content_rowid='rowid')"
            ))
            await conn.execute(text(
                "CREATE TRIGGER IF NOT EXISTS skills_fts_ai AFTER INSERT ON skills BEGIN "
                "INSERT INTO skills_fts(rowid, slug, display_name, summary) "
                "VALUES (NEW.rowid, NEW.slug, NEW.display_name, NEW.summary); END"
            ))
            await conn.execute(text(
                "CREATE TRIGGER IF NOT EXISTS skills_fts_ad AFTER DELETE ON skills BEGIN "
                "INSERT INTO skills_fts(skills_fts, rowid, slug, display_name, summary) "
                "VALUES ('delete', OLD.rowid, OLD.slug, OLD.display_name, OLD.summary); END"
            ))
            await conn.execute(text(
                "CREATE TRIGGER IF NOT EXISTS skills_fts_au AFTER UPDATE ON skills BEGIN "
                "INSERT INTO skills_fts(skills_fts, rowid, slug, display_name, summary) "
                "VALUES ('delete', OLD.rowid, OLD.slug, OLD.display_name, OLD.summary); "
                "INSERT INTO skills_fts(rowid, slug, display_name, summary) "
                "VALUES (NEW.rowid, NEW.slug, NEW.display_name, NEW.summary); END"
            ))
