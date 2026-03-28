import hashlib
import json
import re
import uuid as uuid_mod
from io import BytesIO
from zipfile import ZipFile

import yaml

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlmodel import select

from app.auth import get_current_user, get_optional_user
from app.database import get_session
from app.models.file_storage import FileStorage
from app.models.user import User
from app.schemas.common import DeleteResponse
from app.schemas.scan import (
    ScanModeration,
    ScanSkill,
    ScanVersion,
    SkillScanResponse,
)
from app.schemas.skill import (
    LatestVersion,
    ModerationInfo,
    PublishResponse,
    SkillData,
    SkillListItem,
    SkillListResponse,
    SkillResponse,
)
from app.schemas.user import Owner
from app.schemas.version import (
    SecuritySnapshot,
    SkillVersion as SkillVersionSchema,
    SkillVersionListResponse,
    SkillVersionResponse,
    SkillVersionResponseSkill,
    VersionDetail,
    VersionFile,
)
from app.services import skill_service

router = APIRouter()


@router.get("/skills/count", tags=["skills"], summary="Count skills", description="Return total number of published skills.")
async def count_skills(
    nonSuspiciousOnly: bool = Query(False),
    nonSuspicious: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    non_sus = nonSuspiciousOnly or nonSuspicious
    total = await skill_service.count_skills(session, non_suspicious_only=non_sus)
    return {"total": total}


@router.get("/skills", response_model=SkillListResponse, tags=["skills"], summary="List skills", description="Paginated list of published skills with optional suspicious-content filter.")
async def list_skills(
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    nonSuspiciousOnly: bool = Query(False),
    nonSuspicious: bool = Query(False),
    owner: str | None = Query(None),
    sort: str = Query("updated"),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    non_sus = nonSuspiciousOnly or nonSuspicious
    owner_id = None
    if owner == "me" and current_user:
        owner_id = current_user.id
    items, next_cursor = await skill_service.list_skills(
        session, limit=limit, cursor=cursor, non_suspicious_only=non_sus, owner_id=owner_id, sort=sort
    )
    return SkillListResponse(
        items=[
            SkillListItem(
                slug=i["skill"].slug,
                displayName=i["skill"].display_name,
                summary=i["skill"].summary,
                tags=i["skill"].tags,
                stats=i["skill"].stats,
                createdAt=i["skill"].created_at,
                updatedAt=i["skill"].updated_at,
                latestVersion=_to_latest(i["latestVersion"]),
                owner=Owner(
                    handle=i["owner"].handle if i["owner"] else None,
                    displayName=i["owner"].display_name if i["owner"] else None,
                    image=i["owner"].image if i["owner"] else None,
                ) if i.get("owner") else None,
            )
            for i in items
        ],
        nextCursor=next_cursor,
    )


@router.post("/skills", response_model=PublishResponse, tags=["skills"], summary="Publish or update a skill", description="Create a new skill or publish a new version. Requires bearer token auth.")
async def publish_skill(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    form = await request.form()

    payload = form.get("payload")
    data = json.loads(payload)
    file_entries = data.get("files", [])

    # Collect all uploaded files from the multipart form
    files: list[UploadFile] = []
    for key in form.keys():
        for val in form.getlist(key):
            if hasattr(val, "filename"):
                files.append(val)

    # Build a path → UploadFile lookup from the multipart files
    uploaded_map: dict[str, UploadFile] = {}
    for uf in files:
        uploaded_map[uf.filename or ""] = uf

    # If payload has no file entries, build them from uploaded files (CLI compat)
    if not file_entries and files:
        for uf in files:
            file_entries.append({
                "path": uf.filename or "",
                "contentType": uf.content_type or "application/octet-stream",
            })

    # Read content, compute sha256, store in FileStorage, update metadata
    file_contents: dict[str, bytes] = {}
    for idx, entry in enumerate(file_entries):
        entry_path = entry.get("path", "")
        uf = uploaded_map.get(entry_path)
        if uf is None:
            # Try matching by basename as fallback
            for name, candidate in uploaded_map.items():
                if name.endswith("/" + entry_path) or name == entry_path:
                    uf = candidate
                    break
        if uf is None and idx < len(files):
            # Fall back to index-based matching
            uf = files[idx]

        if uf is None:
            continue

        await uf.seek(0)
        content = await uf.read()
        if not content:
            continue
        file_contents[entry_path] = content
        sha256 = hashlib.sha256(content).hexdigest()
        size = len(content)

        # Check if this content already exists (deduplicate by sha256)
        existing = await session.execute(
            select(FileStorage).where(FileStorage.sha256 == sha256)
        )
        if existing.scalars().first() is None:
            fs = FileStorage(
                storage_id=uuid_mod.uuid4().hex,
                content=content,
                content_type=entry.get("contentType", "application/octet-stream"),
                sha256=sha256,
                size=size,
            )
            session.add(fs)

        # Update the metadata entry with real sha256 and size
        entry["sha256"] = sha256
        entry["size"] = size

    # Extract summary from SKILL.md frontmatter "description" field
    summary = data.get("summary")
    skill_md = file_contents.get("SKILL.md") or file_contents.get("skill.md")
    if skill_md is not None:
        try:
            text = skill_md.decode("utf-8", errors="replace")
            fm_match = re.match(r"^---\s*\n(.+?)\n---", text, re.DOTALL)
            if fm_match:
                frontmatter = yaml.safe_load(fm_match.group(1))
                if isinstance(frontmatter, dict) and frontmatter.get("description"):
                    summary = frontmatter["description"]
        except Exception:
            pass

    try:
        skill, sv = await skill_service.create_or_update_skill(
            session,
            owner=user,
            slug=data["slug"],
            display_name=data["displayName"],
            version=data["version"],
            changelog=data["changelog"],
            files=file_entries,
            tags=data.get("tags"),
            summary=summary,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    await session.commit()

    return PublishResponse(
        ok=True,
        skillId=str(skill.id),
        versionId=str(sv.id),
    )


@router.get("/skills/{slug}", response_model=SkillResponse, tags=["skills"], summary="Get skill details", description="Return full detail for a single skill including owner, moderation, and latest version.")
async def get_skill(
    slug: str,
    view: bool = Query(True),
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.get_skill(session, slug, increment_view=view)
    if data is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    skill = data["skill"]
    owner = data["owner"]
    mod = data["moderation"]
    latest = data["latestVersion"]

    return SkillResponse(
        skill=SkillData(
            slug=skill.slug,
            displayName=skill.display_name,
            summary=skill.summary,
            tags=skill.tags,
            stats=skill.stats,
            createdAt=skill.created_at,
            updatedAt=skill.updated_at,
        ),
        latestVersion=_to_latest(latest),
        owner=Owner(
            handle=owner.handle if owner else None,
            displayName=owner.display_name if owner else None,
            image=owner.image if owner else None,
        )
        if owner
        else None,
        moderation=_to_moderation(mod),
    )


@router.delete("/skills/{slug}", response_model=DeleteResponse, tags=["skills"], summary="Soft-delete a skill", description="Mark a skill as deleted. Requires bearer token auth and ownership.")
async def delete_skill(
    slug: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ok = await skill_service.soft_delete_skill(session, slug, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Skill not found")
    return DeleteResponse(ok=True)


@router.post("/skills/{slug}/undelete", response_model=DeleteResponse, tags=["skills"], summary="Restore a deleted skill", description="Undo a soft-delete. Requires bearer token auth and ownership.")
async def undelete_skill(
    slug: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    ok = await skill_service.undelete_skill(session, slug, user)
    if not ok:
        raise HTTPException(status_code=404, detail="Skill not found")
    return DeleteResponse(ok=True)


@router.get("/skills/{slug}/versions", response_model=SkillVersionListResponse, tags=["versions"], summary="List versions", description="Paginated list of versions for a skill.")
async def list_versions(
    slug: str,
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    result = await skill_service.list_versions(session, slug, limit, cursor)
    if result is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    versions, next_cursor = result
    return SkillVersionListResponse(
        items=[
            SkillVersionSchema(
                version=v.version,
                createdAt=v.created_at,
                changelog=v.changelog,
                changelogSource=v.changelog_source,
            )
            for v in versions
        ],
        nextCursor=next_cursor,
    )


@router.get("/skills/{slug}/versions/{version}", response_model=SkillVersionResponse, tags=["versions"], summary="Get version details", description="Return full details for a specific skill version including files and security info.")
async def get_version(
    slug: str,
    version: str,
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.get_version(session, slug, version)
    if data is None:
        raise HTTPException(status_code=404, detail="Version not found")

    skill = data["skill"]
    sv = data["version"]

    return SkillVersionResponse(
        skill=SkillVersionResponseSkill(
            slug=skill.slug,
            displayName=skill.display_name,
        ),
        version=VersionDetail(
            version=sv.version,
            createdAt=sv.created_at,
            changelog=sv.changelog,
            changelogSource=sv.changelog_source,
            files=[
                VersionFile(
                    path=f.get("path", ""),
                    size=f.get("size", 0),
                    sha256=f.get("sha256", ""),
                    contentType=f.get("contentType"),
                )
                for f in sv.files
            ],
            security=SecuritySnapshot(**sv.security) if sv.security else SecuritySnapshot(),
        ),
    )


@router.get("/skills/{slug}/moderation", tags=["moderation"], summary="Get moderation info", description="Return moderation details for a skill.")
async def get_moderation(
    slug: str,
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.get_moderation(session, slug)
    if data is None:
        raise HTTPException(status_code=404, detail="Moderation details unavailable")

    mod = data["moderation"]
    return {"moderation": _to_moderation(mod)}


@router.get("/skills/{slug}/scan", response_model=SkillScanResponse, tags=["moderation"], summary="Get scan report", description="Return security scan results for a skill version.")
async def get_scan(
    slug: str,
    version: str | None = Query(None),
    tag: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.get_scan(session, slug, version)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")

    skill = data["skill"]
    sv = data["version"]
    mod = data["moderation"]

    scan_mod = None
    if mod:
        scan_mod = ScanModeration(
            isSuspicious=mod.is_suspicious,
            isMalwareBlocked=mod.is_malware_blocked,
            isRemoved=skill.is_deleted,
        )

    return SkillScanResponse(
        skill=ScanSkill(slug=skill.slug, displayName=skill.display_name),
        version=ScanVersion(
            version=sv.version,
            createdAt=sv.created_at,
            changelogSource=sv.changelog_source,
        ),
        moderation=scan_mod,
        security=SecuritySnapshot(**sv.security) if sv.security else None,
    )


@router.get("/skills/{slug}/file", response_class=PlainTextResponse, tags=["files"], summary="Get file content", description="Return the content of a single file from a skill version.")
async def get_file(
    slug: str,
    path: str = Query(...),
    version: str | None = Query(None),
    tag: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    content = await skill_service.get_file_content(session, slug, path, version)
    if content is None:
        raise HTTPException(status_code=404, detail="Not found")
    return PlainTextResponse(content)


@router.get("/download", tags=["files"], summary="Download skill as ZIP", description="Download all files of a skill version as a ZIP archive.")
async def download_zip(
    slug: str = Query(...),
    version: str | None = Query(None),
    tag: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.get_download_data(session, slug, version)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")

    sv = data["version"]
    buf = BytesIO()
    with ZipFile(buf, "w") as zf:
        for f in sv.files:
            file_path = f.get("path", "unknown")
            content = await skill_service.get_file_content(
                session, slug, file_path, sv.version
            )
            zf.writestr(file_path, content or "")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{slug}-{sv.version}.zip"'
        },
    )


# --- helpers ---

def _to_latest(sv) -> LatestVersion | None:
    if sv is None:
        return None
    return LatestVersion(
        version=sv.version,
        createdAt=sv.created_at,
        changelog=sv.changelog,
    )


def _to_moderation(mod) -> ModerationInfo | None:
    if mod is None:
        return None
    return ModerationInfo(
        isSuspicious=mod.is_suspicious,
        isMalwareBlocked=mod.is_malware_blocked,
        verdict=mod.verdict,
        reasonCodes=mod.reason_codes,
        summary=mod.summary,
        engineVersion=mod.engine_version,
        updatedAt=mod.updated_at,
    )
