from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.resolve import ResolveResponse, VersionRef
from app.services import skill_service

router = APIRouter()


@router.get("/resolve", response_model=ResolveResponse, tags=["search"], summary="Resolve version by hash", description="Resolve a skill version by slug and SHA-256 hash prefix.")
async def resolve_version(
    slug: str = Query(...),
    hash: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    data = await skill_service.resolve_version(session, slug, hash)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")

    return ResolveResponse(
        match=VersionRef(**data["match"]) if data["match"] else None,
        latestVersion=VersionRef(**data["latestVersion"]) if data["latestVersion"] else None,
    )
