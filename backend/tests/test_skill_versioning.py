"""Test skill versioning flow: v0.0.1 → v0.0.2 → v1.0.0"""

import json

import pytest
from httpx import AsyncClient

from tests.conftest import DEMO_TOKEN


@pytest.mark.asyncio
async def test_version_progression(client: AsyncClient, demo_user) -> None:  # type: ignore[no-untyped-def]
    slug = "my-versioned-skill"
    auth = {"Authorization": f"Bearer {DEMO_TOKEN}"}

    # --- Publish v0.0.1 ---
    readme_v1 = ("README.md", b"# My Skill\nVersion 0.0.1", "text/markdown")
    payload_v1 = json.dumps({
        "slug": slug,
        "displayName": "My Versioned Skill",
        "version": "0.0.1",
        "changelog": "Initial alpha release",
        "files": [{"path": "README.md", "contentType": "text/markdown"}],
        "tags": ["test", "versioning"],
    })
    resp = await client.post(
        "/api/v1/skills",
        data={"payload": payload_v1},
        files=[("files", readme_v1)],
        headers=auth,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    skill_id = data["skillId"]

    # Verify skill exists and latest version is 0.0.1
    resp = await client.get(f"/api/v1/skills/{slug}")
    assert resp.status_code == 200
    skill_data = resp.json()
    assert skill_data["skill"]["slug"] == slug
    assert skill_data["latestVersion"]["version"] == "0.0.1"
    assert skill_data["latestVersion"]["changelog"] == "Initial alpha release"

    # Verify versions list has 1 entry
    resp = await client.get(f"/api/v1/skills/{slug}/versions")
    assert resp.status_code == 200
    versions = resp.json()
    assert len(versions["items"]) == 1
    assert versions["items"][0]["version"] == "0.0.1"

    # --- Publish v0.0.2 ---
    readme_v2 = ("README.md", b"# My Skill\nVersion 0.0.2 - bug fixes", "text/markdown")
    payload_v2 = json.dumps({
        "slug": slug,
        "displayName": "My Versioned Skill",
        "version": "0.0.2",
        "changelog": "Bug fixes and improvements",
        "files": [{"path": "README.md", "contentType": "text/markdown"}],
        "tags": ["test", "versioning"],
    })
    resp = await client.post(
        "/api/v1/skills",
        data={"payload": payload_v2},
        files=[("files", readme_v2)],
        headers=auth,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["skillId"] == skill_id  # same skill

    # Latest version should now be 0.0.2
    resp = await client.get(f"/api/v1/skills/{slug}")
    assert resp.status_code == 200
    skill_data = resp.json()
    assert skill_data["latestVersion"]["version"] == "0.0.2"
    assert skill_data["latestVersion"]["changelog"] == "Bug fixes and improvements"

    # Versions list should have 2 entries, newest first
    resp = await client.get(f"/api/v1/skills/{slug}/versions")
    assert resp.status_code == 200
    versions = resp.json()
    assert len(versions["items"]) == 2
    assert versions["items"][0]["version"] == "0.0.2"
    assert versions["items"][1]["version"] == "0.0.1"

    # Old version still accessible
    resp = await client.get(f"/api/v1/skills/{slug}/versions/0.0.1")
    assert resp.status_code == 200
    assert resp.json()["version"]["version"] == "0.0.1"
    assert resp.json()["version"]["changelog"] == "Initial alpha release"

    # --- Publish v1.0.0 ---
    readme_v3 = ("README.md", b"# My Skill\nVersion 1.0.0 - stable release!", "text/markdown")
    skill_md = ("SKILL.md", b"---\ndescription: A stable versioned skill\n---\n# My Skill", "text/markdown")
    payload_v3 = json.dumps({
        "slug": slug,
        "displayName": "My Versioned Skill",
        "version": "1.0.0",
        "changelog": "First stable release with breaking changes",
        "files": [
            {"path": "README.md", "contentType": "text/markdown"},
            {"path": "SKILL.md", "contentType": "text/markdown"},
        ],
        "tags": ["stable", "versioning"],
    })
    resp = await client.post(
        "/api/v1/skills",
        data={"payload": payload_v3},
        files=[("files", readme_v3), ("files", skill_md)],
        headers=auth,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["skillId"] == skill_id

    # Latest version should be 1.0.0
    resp = await client.get(f"/api/v1/skills/{slug}")
    assert resp.status_code == 200
    skill_data = resp.json()
    assert skill_data["latestVersion"]["version"] == "1.0.0"
    assert skill_data["latestVersion"]["changelog"] == "First stable release with breaking changes"

    # Versions list should have 3 entries, newest first
    resp = await client.get(f"/api/v1/skills/{slug}/versions")
    assert resp.status_code == 200
    versions = resp.json()
    assert len(versions["items"]) == 3
    assert versions["items"][0]["version"] == "1.0.0"
    assert versions["items"][1]["version"] == "0.0.2"
    assert versions["items"][2]["version"] == "0.0.1"

    # All old versions still accessible
    for ver in ["0.0.1", "0.0.2", "1.0.0"]:
        resp = await client.get(f"/api/v1/skills/{slug}/versions/{ver}")
        assert resp.status_code == 200
        assert resp.json()["version"]["version"] == ver

    # v1.0.0 should have 2 files
    resp = await client.get(f"/api/v1/skills/{slug}/versions/1.0.0")
    assert resp.status_code == 200
    v1_data = resp.json()
    assert len(v1_data["version"]["files"]) == 2
    file_paths = {f["path"] for f in v1_data["version"]["files"]}
    assert file_paths == {"README.md", "SKILL.md"}

    # v0.0.1 should still have only 1 file
    resp = await client.get(f"/api/v1/skills/{slug}/versions/0.0.1")
    assert resp.status_code == 200
    assert len(resp.json()["version"]["files"]) == 1

    # File content should differ between versions
    resp_old = await client.get(f"/api/v1/skills/{slug}/file", params={"path": "README.md", "version": "0.0.1"})
    resp_new = await client.get(f"/api/v1/skills/{slug}/file", params={"path": "README.md", "version": "1.0.0"})
    assert resp_old.status_code == 200
    assert resp_new.status_code == 200
    assert b"0.0.1" in resp_old.content
    assert b"1.0.0" in resp_new.content


@pytest.mark.asyncio
async def test_skill_count_unchanged_by_new_versions(client: AsyncClient, demo_user) -> None:  # type: ignore[no-untyped-def]
    """Publishing new versions of the same skill should not increase skill count."""
    auth = {"Authorization": f"Bearer {DEMO_TOKEN}"}
    slug = "count-test-skill"

    # Publish v0.0.1
    payload = json.dumps({
        "slug": slug,
        "displayName": "Count Test",
        "version": "0.0.1",
        "changelog": "v1",
        "files": [],
        "tags": [],
    })
    await client.post("/api/v1/skills", data={"payload": payload}, files=[], headers=auth)

    resp = await client.get("/api/v1/skills/count")
    assert resp.status_code == 200
    count_after_v1 = resp.json()["total"]

    # Publish v0.0.2
    payload = json.dumps({
        "slug": slug,
        "displayName": "Count Test",
        "version": "0.0.2",
        "changelog": "v2",
        "files": [],
        "tags": [],
    })
    await client.post("/api/v1/skills", data={"payload": payload}, files=[], headers=auth)

    resp = await client.get("/api/v1/skills/count")
    assert resp.status_code == 200
    count_after_v2 = resp.json()["total"]

    assert count_after_v1 == count_after_v2
