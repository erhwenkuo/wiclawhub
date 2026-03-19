import pytest
from httpx import AsyncClient

from app.models import Skill


@pytest.mark.asyncio
async def test_get_moderation(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/moderation")
    assert resp.status_code == 200
    data = resp.json()
    assert data["moderation"]["verdict"] == "clean"
    assert data["moderation"]["isSuspicious"] is False


@pytest.mark.asyncio
async def test_get_moderation_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/skills/nonexistent/moderation")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_scan(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/scan")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill"]["slug"] == "hello-world"
    assert data["version"]["version"] == "1.1.0"
    assert data["security"]["status"] == "clean"


@pytest.mark.asyncio
async def test_get_scan_specific_version(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/scan?version=1.0.0")
    assert resp.status_code == 200
    assert resp.json()["version"]["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_get_scan_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/skills/nonexistent/scan")
    assert resp.status_code == 404
