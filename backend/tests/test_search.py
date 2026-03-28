"""Tests for full-text search via FTS5 (SQLite)."""

import json

import pytest
from httpx import AsyncClient

from app.models import Skill
from tests.conftest import DEMO_TOKEN


@pytest.mark.asyncio
async def test_search_by_display_name(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search", params={"q": "Hello World"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) >= 1
    assert results[0]["slug"] == "hello-world"


@pytest.mark.asyncio
async def test_search_by_slug(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search", params={"q": "hello-world"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) >= 1
    assert results[0]["slug"] == "hello-world"


@pytest.mark.asyncio
async def test_search_by_summary(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search", params={"q": "greeting"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) >= 1
    assert results[0]["slug"] == "hello-world"


@pytest.mark.asyncio
async def test_search_no_results(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search", params={"q": "xyznonexistent123"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 0


@pytest.mark.asyncio
async def test_search_empty_query_returns_all(client: AsyncClient, sample_skill: Skill) -> None:
    resp = await client.get("/api/v1/search", params={"q": ""})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) >= 1


@pytest.mark.asyncio
async def test_search_ranking_exact_slug_first(client: AsyncClient, demo_user) -> None:  # type: ignore[no-untyped-def]
    """Exact slug match should rank higher than partial match."""
    auth = {"Authorization": f"Bearer {DEMO_TOKEN}"}

    # Create two skills: one with slug "weather", another with "weather-forecast"
    for slug, name, summary in [
        ("weather-forecast", "Weather Forecast", "Detailed weather forecasts"),
        ("weather", "Weather", "Get current weather"),
    ]:
        payload = json.dumps({
            "slug": slug,
            "displayName": name,
            "version": "1.0.0",
            "changelog": "init",
            "files": [],
            "tags": [],
        })
        resp = await client.post(
            "/api/v1/skills",
            data={"payload": payload},
            files=[],
            headers=auth,
        )
        assert resp.status_code == 200

    resp = await client.get("/api/v1/search", params={"q": "weather"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert len(results) == 2
    # Exact slug match "weather" should rank first
    assert results[0]["slug"] == "weather"


@pytest.mark.asyncio
async def test_search_after_publish(client: AsyncClient, demo_user) -> None:  # type: ignore[no-untyped-def]
    """Newly published skills should be immediately searchable."""
    auth = {"Authorization": f"Bearer {DEMO_TOKEN}"}

    payload = json.dumps({
        "slug": "brand-new-skill",
        "displayName": "Brand New Skill",
        "version": "0.1.0",
        "changelog": "first",
        "files": [],
        "tags": [],
        "summary": "A completely unique skill for testing search",
    })
    resp = await client.post(
        "/api/v1/skills",
        data={"payload": payload},
        files=[],
        headers=auth,
    )
    assert resp.status_code == 200

    # Search by display name
    resp = await client.get("/api/v1/search", params={"q": "Brand New"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert any(r["slug"] == "brand-new-skill" for r in results)

    # Search by summary keyword
    resp = await client.get("/api/v1/search", params={"q": "unique"})
    assert resp.status_code == 200
    results = resp.json()["results"]
    assert any(r["slug"] == "brand-new-skill" for r in results)
