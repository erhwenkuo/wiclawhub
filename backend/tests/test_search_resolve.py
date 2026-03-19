import pytest
from httpx import AsyncClient

from app.models import Skill


@pytest.mark.asyncio
async def test_search(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search?q=hello")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["slug"] == "hello-world"
    assert data["results"][0]["score"] > 0


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search?q=zzzznonexistent")
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 0


@pytest.mark.asyncio
async def test_search_by_summary(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search?q=greeting")
    assert resp.status_code == 200
    assert len(resp.json()["results"]) == 1


@pytest.mark.asyncio
async def test_resolve(client: AsyncClient, sample_skill: Skill) -> None:
    # Get the sha256 from the file
    ver_resp = await client.get("/api/v1/skills/hello-world/versions/1.0.0")
    sha = ver_resp.json()["version"]["files"][0]["sha256"]
    prefix = sha[:6]

    resp = await client.get(f"/api/v1/resolve?slug=hello-world&hash={prefix}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["match"] is not None
    assert data["latestVersion"]["version"] == "1.1.0"


@pytest.mark.asyncio
async def test_resolve_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/resolve?slug=nonexistent&hash=abc")
    assert resp.status_code == 404
