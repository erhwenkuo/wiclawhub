"""Seed the database with sample data for development."""

import asyncio
import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, init_db
from app.models import FileStorage, Skill, SkillModeration, SkillVersion, User


def _now() -> float:
    return datetime.now(timezone.utc).timestamp()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def seed() -> None:
    await init_db()

    async with async_session() as session:
        session: AsyncSession

        # --- Users ---
        demo_user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            handle="demo",
            display_name="Demo User",
            image=None,
            api_token_hash=_hash_token("demo-token-123"),
        )

        alice = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
            handle="alice",
            display_name="Alice",
            image=None,
            api_token_hash=_hash_token("alice-token-456"),
        )

        session.add_all([demo_user, alice])
        await session.flush()

        # --- Skills ---
        now = _now()

        skill1 = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000001"),
            slug="hello-world",
            display_name="Hello World",
            summary="A simple greeting skill that says hello.",
            tags={"category": "utility"},
            stats={"downloads": 42, "stars": 5},
            owner_id=demo_user.id,
            created_at=now - 86400 * 7,
            updated_at=now,
        )

        skill2 = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000002"),
            slug="code-reviewer",
            display_name="Code Reviewer",
            summary="Reviews code for common issues and suggests improvements.",
            tags={"category": "development", "language": "python"},
            stats={"downloads": 128, "stars": 15},
            owner_id=alice.id,
            created_at=now - 86400 * 3,
            updated_at=now - 86400,
        )

        skill3 = Skill(
            id=uuid.UUID("10000000-0000-0000-0000-000000000003"),
            slug="summarizer",
            display_name="Text Summarizer",
            summary="Summarizes long texts into concise bullet points.",
            tags={"category": "text-processing"},
            stats={"downloads": 256, "stars": 30},
            owner_id=demo_user.id,
            created_at=now - 86400 * 14,
            updated_at=now - 86400 * 2,
        )

        session.add_all([skill1, skill2, skill3])
        await session.flush()

        # --- Skill Versions ---
        file_content = b"# Hello World\n\nSay hello to the user."
        file_sha = hashlib.sha256(file_content).hexdigest()

        storage1 = FileStorage(
            storage_id="file-001",
            content=file_content,
            content_type="text/markdown",
            sha256=file_sha,
            size=len(file_content),
        )
        session.add(storage1)
        await session.flush()

        v1 = SkillVersion(
            skill_id=skill1.id,
            version="1.0.0",
            changelog="Initial release",
            changelog_source="user",
            files=[
                {
                    "path": "README.md",
                    "size": len(file_content),
                    "sha256": file_sha,
                    "contentType": "text/markdown",
                }
            ],
            security={
                "status": "clean",
                "hasWarnings": False,
                "checkedAt": now,
                "hasScanResult": True,
            },
            created_at=now - 86400 * 7,
        )

        v1_1 = SkillVersion(
            skill_id=skill1.id,
            version="1.1.0",
            changelog="Added multilingual greetings",
            changelog_source="user",
            files=[
                {
                    "path": "README.md",
                    "size": len(file_content),
                    "sha256": file_sha,
                    "contentType": "text/markdown",
                }
            ],
            security={
                "status": "clean",
                "hasWarnings": False,
                "checkedAt": now,
                "hasScanResult": True,
            },
            created_at=now,
        )

        v2 = SkillVersion(
            skill_id=skill2.id,
            version="0.1.0",
            changelog="Beta release of code reviewer",
            changelog_source="user",
            files=[
                {
                    "path": "skill.md",
                    "size": 512,
                    "sha256": "abc123",
                    "contentType": "text/markdown",
                }
            ],
            security={"status": "clean", "hasWarnings": False, "hasScanResult": True},
            created_at=now - 86400 * 3,
        )

        v3 = SkillVersion(
            skill_id=skill3.id,
            version="2.0.0",
            changelog="Major rewrite with improved summarization",
            changelog_source="auto",
            files=[
                {
                    "path": "summarizer.md",
                    "size": 1024,
                    "sha256": "def456",
                    "contentType": "text/markdown",
                }
            ],
            security={
                "status": "clean",
                "hasWarnings": False,
                "hasScanResult": True,
            },
            created_at=now - 86400 * 2,
        )

        session.add_all([v1, v1_1, v2, v3])
        await session.flush()

        # --- Moderation ---
        mod1 = SkillModeration(
            skill_id=skill1.id,
            verdict="clean",
            updated_at=now,
        )
        mod2 = SkillModeration(
            skill_id=skill2.id,
            verdict="clean",
            updated_at=now - 86400,
        )
        session.add_all([mod1, mod2])

        await session.commit()

    print("Seed data inserted successfully.")
    print("  Users: demo (token: demo-token-123), alice (token: alice-token-456)")
    print("  Skills: hello-world, code-reviewer, summarizer")


if __name__ == "__main__":
    asyncio.run(seed())
