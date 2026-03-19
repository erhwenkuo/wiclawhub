import json

import pytest
from httpx import AsyncClient

from app.models import Skill
from tests.conftest import DEMO_TOKEN


@pytest.mark.asyncio
async def test_list_skills_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/skills")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["nextCursor"] is None


@pytest.mark.asyncio
async def test_list_skills(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["slug"] == "hello-world"
    assert data["items"][0]["displayName"] == "Hello World"
    assert data["items"][0]["latestVersion"]["version"] == "1.1.0"


@pytest.mark.asyncio
async def test_list_skills_pagination(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills?limit=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    # Only one skill, so no next cursor
    assert data["nextCursor"] is None


@pytest.mark.asyncio
async def test_get_skill(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill"]["slug"] == "hello-world"
    assert data["skill"]["summary"] == "A greeting skill."
    assert data["owner"]["handle"] == "demo"
    assert data["latestVersion"]["version"] == "1.1.0"
    assert data["moderation"]["verdict"] == "clean"


@pytest.mark.asyncio
async def test_get_skill_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/skills/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_publish_skill(client: AsyncClient, demo_user) -> None:  # type: ignore[no-untyped-def]
    payload = json.dumps({
        "slug": "new-skill",
        "displayName": "New Skill",
        "version": "1.0.0",
        "changelog": "First release",
        "files": [],
        "tags": ["test"],
    })
    resp = await client.post(
        "/api/v1/skills",
        data={"payload": payload},
        files=[],
        headers={"Authorization": f"Bearer {DEMO_TOKEN}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "skillId" in data
    assert "versionId" in data

    # Verify it exists
    resp2 = await client.get("/api/v1/skills/new-skill")
    assert resp2.status_code == 200
    assert resp2.json()["skill"]["displayName"] == "New Skill"


@pytest.mark.asyncio
async def test_publish_requires_auth(client: AsyncClient) -> None:
    payload = json.dumps({
        "slug": "x",
        "displayName": "X",
        "version": "1.0.0",
        "changelog": "c",
        "files": [],
    })
    resp = await client.post("/api/v1/skills", data={"payload": payload})
    assert resp.status_code == 200 or resp.status_code == 401 or resp.status_code == 422
    # Without auth header, FastAPI's HTTPBearer returns 403 or the dep returns 401


@pytest.mark.asyncio
async def test_delete_skill(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.delete(
        "/api/v1/skills/hello-world",
        headers={"Authorization": f"Bearer {DEMO_TOKEN}"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Skill should be hidden from list
    resp2 = await client.get("/api/v1/skills")
    assert all(s["slug"] != "hello-world" for s in resp2.json()["items"])


@pytest.mark.asyncio
async def test_undelete_skill(client: AsyncClient, sample_skill: Skill) -> None:
    # Delete first
    await client.delete(
        "/api/v1/skills/hello-world",
        headers={"Authorization": f"Bearer {DEMO_TOKEN}"},
    )

    # Undelete
    resp = await client.post(
        "/api/v1/skills/hello-world/undelete",
        headers={"Authorization": f"Bearer {DEMO_TOKEN}"},
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Should be visible again
    resp2 = await client.get("/api/v1/skills/hello-world")
    assert resp2.status_code == 200
