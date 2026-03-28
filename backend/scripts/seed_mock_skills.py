"""Seed 200 mock skills for testing infinite scroll search."""

import asyncio
import hashlib
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import settings
from app.models import Skill, SkillVersion, SkillModeration, User, FileStorage

CATEGORIES = [
    "utility", "automation", "data", "text", "web", "api", "file",
    "security", "monitoring", "devops", "testing", "ai", "ml",
    "database", "cloud", "network", "image", "audio", "video", "search",
]

ADJECTIVES = [
    "smart", "fast", "advanced", "simple", "auto", "deep", "quick",
    "easy", "super", "pro", "ultra", "mega", "mini", "micro", "nano",
    "magic", "instant", "turbo", "hyper", "lite",
]

NOUNS = [
    "parser", "scanner", "converter", "analyzer", "formatter", "validator",
    "generator", "extractor", "transformer", "builder", "checker", "monitor",
    "reporter", "cleaner", "merger", "splitter", "encoder", "decoder",
    "fetcher", "scraper", "crawler", "indexer", "ranker", "classifier",
    "detector", "translator", "summarizer", "optimizer", "scheduler", "notifier",
]

SUMMARIES = [
    "Automates {noun} tasks with minimal configuration.",
    "A lightweight {adj} tool for {noun} operations.",
    "Enterprise-grade {noun} with built-in {adj} capabilities.",
    "Performs {adj} {noun} on structured and unstructured data.",
    "Open-source {noun} designed for high-throughput pipelines.",
    "Integrates {adj} {noun} into your CI/CD workflow.",
    "Real-time {noun} with {adj} performance and low latency.",
    "Cloud-native {noun} supporting multi-tenant deployments.",
    "AI-powered {adj} {noun} for intelligent automation.",
    "Batch and streaming {noun} with {adj} error handling.",
]

DEMO_TOKEN = "seed-admin-token"
DEMO_TOKEN_HASH = hashlib.sha256(DEMO_TOKEN.encode()).hexdigest()


def make_slug(adj: str, noun: str, suffix: int) -> str:
    return f"{adj}-{noun}-{suffix}"


def make_display_name(adj: str, noun: str, suffix: int) -> str:
    return f"{adj.title()} {noun.title()} {suffix}"


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with session_factory() as session:
        # Create seed user
        user = User(
            id=uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            handle="seed-bot",
            display_name="Seed Bot",
            api_token_hash=DEMO_TOKEN_HASH,
        )
        session.add(user)
        await session.flush()

        now = datetime.now(timezone.utc).timestamp()
        file_content = b"# Mock Skill\nThis is a mock skill for testing."
        sha = hashlib.sha256(file_content).hexdigest()

        # Check if file storage already exists
        from sqlmodel import select
        existing = await session.execute(select(FileStorage).where(FileStorage.sha256 == sha))
        if not existing.scalars().first():
            storage = FileStorage(
                storage_id=f"mock-file-{sha[:8]}",
                content=file_content,
                content_type="text/markdown",
                sha256=sha,
                size=len(file_content),
            )
            session.add(storage)

        skills_created = 0
        used_slugs: set[str] = set()

        for i in range(200):
            adj = random.choice(ADJECTIVES)
            noun = random.choice(NOUNS)
            slug = make_slug(adj, noun, i + 1)

            if slug in used_slugs:
                slug = f"{slug}-x"
            used_slugs.add(slug)

            display_name = make_display_name(adj, noun, i + 1)
            category = random.choice(CATEGORIES)
            summary_template = random.choice(SUMMARIES)
            summary = summary_template.format(adj=adj, noun=noun)

            # Randomize timestamps over the past 90 days
            created_offset = random.uniform(0, 90 * 86400)
            created_at = now - created_offset
            updated_at = created_at + random.uniform(0, min(created_offset, 7 * 86400))

            downloads = random.randint(0, 5000)
            stars = random.randint(0, 500)
            views = random.randint(downloads, downloads + 2000)
            versions_count = random.randint(1, 5)

            skill = Skill(
                slug=slug,
                display_name=display_name,
                summary=summary,
                tags={category: category, "mock": "mock"},
                stats={
                    "downloads": downloads,
                    "stars": stars,
                    "views": views,
                    "versions": versions_count,
                },
                owner_id=user.id,
                created_at=created_at,
                updated_at=updated_at,
            )
            session.add(skill)
            await session.flush()

            # Create version(s)
            major = random.randint(0, 2)
            minor = random.randint(0, 9)
            patch = random.randint(0, 9)
            version_str = f"{major}.{minor}.{patch}"

            sv = SkillVersion(
                skill_id=skill.id,
                version=version_str,
                changelog=f"Release {version_str} of {display_name}.",
                changelog_source="user",
                files=[{
                    "path": "README.md",
                    "size": len(file_content),
                    "sha256": sha,
                    "contentType": "text/markdown",
                }],
                security={
                    "status": "clean",
                    "hasWarnings": False,
                    "hasScanResult": True,
                },
                created_at=updated_at,
            )
            session.add(sv)

            # Moderation
            mod = SkillModeration(
                skill_id=skill.id,
                verdict="clean",
                updated_at=updated_at,
            )
            session.add(mod)

            skills_created += 1

        await session.commit()
        print(f"Seeded {skills_created} mock skills.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
