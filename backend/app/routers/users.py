import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.auth import get_current_user
from app.database import get_session
from app.models.skill import Skill
from app.models.skill_version import SkillVersion
from app.models.star import Star
from app.models.user import User

router = APIRouter()


@router.get("/users/{handle}", tags=["users"], summary="Get user profile")
async def get_user_profile(
    handle: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.handle == handle))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Published skills
    pub_result = await session.execute(
        select(Skill).where(Skill.owner_id == user.id, Skill.is_deleted == False)  # noqa: E712
        .order_by(Skill.updated_at.desc())
    )
    published_skills = pub_result.scalars().all()

    published = []
    for skill in published_skills:
        sv_result = await session.execute(
            select(SkillVersion)
            .where(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
        latest = sv_result.scalars().first()
        stats = skill.stats or {}
        published.append({
            "slug": skill.slug,
            "displayName": skill.display_name,
            "summary": skill.summary,
            "stars": stats.get("stars", 0),
            "downloads": stats.get("downloads", 0),
            "views": stats.get("views", 0),
            "version": latest.version if latest else None,
        })

    # Starred skills
    star_result = await session.execute(
        select(Star).where(Star.user_id == user.id).order_by(Star.created_at.desc())
    )
    star_rows = star_result.scalars().all()

    starred = []
    for star_row in star_rows:
        skill_result = await session.execute(
            select(Skill).where(Skill.id == star_row.skill_id, Skill.is_deleted == False)  # noqa: E712
        )
        skill = skill_result.scalars().first()
        if skill is None:
            continue
        sv_result = await session.execute(
            select(SkillVersion)
            .where(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
        latest = sv_result.scalars().first()
        stats = skill.stats or {}
        starred.append({
            "slug": skill.slug,
            "displayName": skill.display_name,
            "summary": skill.summary,
            "stars": stats.get("stars", 0),
            "downloads": stats.get("downloads", 0),
            "views": stats.get("views", 0),
            "version": latest.version if latest else None,
        })

    return {
        "handle": user.handle,
        "displayName": user.display_name,
        "image": user.image,
        "createdAt": user.created_at,
        "published": published,
        "starred": starred,
    }


@router.post("/stars/{slug}", tags=["stars"], summary="Star a skill")
async def star_skill(
    slug: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_deleted == False)  # noqa: E712
    )
    skill = result.scalars().first()
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    # Check if already starred
    existing = await session.execute(
        select(Star).where(Star.user_id == user.id, Star.skill_id == skill.id)
    )
    if existing.scalars().first() is not None:
        return {"ok": True, "starred": True, "alreadyStarred": True}

    session.add(Star(user_id=user.id, skill_id=skill.id))

    # Increment stars count in skill stats
    stats = dict(skill.stats or {})
    stats["stars"] = stats.get("stars", 0) + 1
    skill.stats = stats
    session.add(skill)
    await session.commit()

    return {"ok": True, "starred": True, "alreadyStarred": False}


@router.delete("/stars/{slug}", tags=["stars"], summary="Unstar a skill")
async def unstar_skill(
    slug: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_deleted == False)  # noqa: E712
    )
    skill = result.scalars().first()
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    existing = await session.execute(
        select(Star).where(Star.user_id == user.id, Star.skill_id == skill.id)
    )
    star_row = existing.scalars().first()
    if star_row is None:
        return {"ok": True, "unstarred": False, "alreadyUnstarred": True}

    await session.delete(star_row)

    # Decrement stars count
    stats = dict(skill.stats or {})
    stats["stars"] = max(0, stats.get("stars", 0) - 1)
    skill.stats = stats
    session.add(skill)
    await session.commit()

    return {"ok": True, "unstarred": True, "alreadyUnstarred": False}


@router.get("/stars/{slug}", tags=["stars"], summary="Check if current user starred a skill")
async def check_star(
    slug: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_deleted == False)  # noqa: E712
    )
    skill = result.scalars().first()
    if skill is None:
        raise HTTPException(status_code=404, detail="Skill not found")

    existing = await session.execute(
        select(Star).where(Star.user_id == user.id, Star.skill_id == skill.id)
    )
    starred = existing.scalars().first() is not None
    return {"starred": starred}
