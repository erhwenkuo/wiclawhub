import pytest
from httpx import AsyncClient

from app.models import User
from tests.conftest import DEMO_TOKEN


@pytest.mark.asyncio
async def test_whoami(client: AsyncClient, demo_user: User) -> None:
    resp = await client.get(
        "/api/v1/whoami",
        headers={"Authorization": f"Bearer {DEMO_TOKEN}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["handle"] == "demo"
    assert data["user"]["displayName"] == "Demo User"


@pytest.mark.asyncio
async def test_whoami_no_token(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/whoami")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_whoami_invalid_token(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/whoami",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert resp.status_code == 401
