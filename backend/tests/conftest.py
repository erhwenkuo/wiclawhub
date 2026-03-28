import asyncio
import hashlib
import uuid
from collections.abc import AsyncGenerator, Generator
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.database import get_session
from app.main import app
from app.models import FileStorage, Skill, SkillModeration, SkillVersion, User


# ---------- DB fixtures ----------

TEST_DB_URL = "sqlite+aiosqlite://"  # in-memory

engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db() -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # Create FTS5 virtual table and sync triggers for search
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
    yield
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS skills_fts"))
        await conn.run_sync(SQLModel.metadata.drop_all)


async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


app.dependency_overrides[get_session] = _override_get_session


# ---------- Client fixture ----------

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------- Helper constants ----------

DEMO_TOKEN = "test-token-123"
DEMO_TOKEN_HASH = hashlib.sha256(DEMO_TOKEN.encode()).hexdigest()

ALICE_TOKEN = "alice-token-456"
ALICE_TOKEN_HASH = hashlib.sha256(ALICE_TOKEN.encode()).hexdigest()


def _now() -> float:
    return datetime.now(timezone.utc).timestamp()


# ---------- Seed fixtures ----------

@pytest_asyncio.fixture
async def demo_user() -> User:
    async with test_session_factory() as session:
        user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            handle="demo",
            display_name="Demo User",
            api_token_hash=DEMO_TOKEN_HASH,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def sample_skill(demo_user: User) -> Skill:
    now = _now()
    async with test_session_factory() as session:
        skill = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000001"),
            slug="hello-world",
            display_name="Hello World",
            summary="A greeting skill.",
            tags={"category": "utility"},
            stats={"downloads": 10, "stars": 2},
            owner_id=demo_user.id,
            created_at=now - 86400,
            updated_at=now,
        )
        session.add(skill)
        await session.flush()

        file_content = b"# Hello World\nGreeting skill."
        sha = hashlib.sha256(file_content).hexdigest()

        storage = FileStorage(
            storage_id="file-test-001",
            content=file_content,
            content_type="text/markdown",
            sha256=sha,
            size=len(file_content),
        )
        session.add(storage)

        version = SkillVersion(
            skill_id=skill.id,
            version="1.0.0",
            changelog="Initial release",
            changelog_source="user",
            files=[{"path": "README.md", "size": len(file_content), "sha256": sha, "contentType": "text/markdown"}],
            security={"status": "clean", "hasWarnings": False, "hasScanResult": True},
            created_at=now - 86400,
        )
        session.add(version)

        v2 = SkillVersion(
            skill_id=skill.id,
            version="1.1.0",
            changelog="Added features",
            changelog_source="user",
            files=[{"path": "README.md", "size": len(file_content), "sha256": sha, "contentType": "text/markdown"}],
            security={"status": "clean", "hasWarnings": False, "hasScanResult": True},
            created_at=now,
        )
        session.add(v2)

        mod = SkillModeration(
            skill_id=skill.id,
            verdict="clean",
            updated_at=now,
        )
        session.add(mod)

        await session.commit()
        await session.refresh(skill)
        return skill
