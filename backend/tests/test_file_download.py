import pytest
from httpx import AsyncClient

from app.models import Skill


@pytest.mark.asyncio
async def test_get_file(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/file?path=README.md")
    assert resp.status_code == 200
    assert "Hello World" in resp.text


@pytest.mark.asyncio
async def test_get_file_specific_version(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/file?path=README.md&version=1.0.0")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_file_not_found(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/skills/hello-world/file?path=nonexistent.txt")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_download_zip(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/download?slug=hello-world")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert len(resp.content) > 0


@pytest.mark.asyncio
async def test_download_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/download?slug=nonexistent")
    assert resp.status_code == 404
