import pytest
from httpx import AsyncClient

from app.models import Skill


@pytest.mark.asyncio
async def test_list_versions(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/versions")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    # Newest first
    assert data["items"][0]["version"] == "1.1.0"
    assert data["items"][1]["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_list_versions_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/skills/nonexistent/versions")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_version(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/versions/1.0.0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["skill"]["slug"] == "hello-world"
    assert data["version"]["version"] == "1.0.0"
    assert data["version"]["changelog"] == "Initial release"
    assert len(data["version"]["files"]) == 1
    assert data["version"]["files"][0]["path"] == "README.md"
    assert data["version"]["security"]["status"] == "clean"


@pytest.mark.asyncio
async def test_get_version_not_found(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/versions/9.9.9")
    assert resp.status_code == 404
