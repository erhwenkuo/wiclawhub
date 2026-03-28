import uuid
from datetime import datetime, timezone

from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.models.skill import Skill
from app.models.skill_moderation import SkillModeration
from app.models.skill_version import SkillVersion
from app.models.user import User


def _now() -> float:
    return datetime.now(timezone.utc).timestamp()


async def count_skills(
    session: AsyncSession,
    non_suspicious_only: bool = False,
) -> int:
    query = select(func.count(Skill.id)).where(Skill.is_deleted == False)  # noqa: E712
    if non_suspicious_only:
        suspicious_ids = select(SkillModeration.skill_id).where(
            SkillModeration.is_suspicious == True  # noqa: E712
        )
        query = query.where(Skill.id.notin_(suspicious_ids))
    result = await session.execute(query)
    return result.scalar_one()


async def list_skills(
    session: AsyncSession,
    limit: int = 20,
    cursor: str | None = None,
    non_suspicious_only: bool = False,
    owner_id: uuid.UUID | None = None,
    sort: str = "updated",
) -> tuple[list[dict], str | None]:
    query = select(Skill).where(Skill.is_deleted == False)  # noqa: E712

    if owner_id is not None:
        query = query.where(Skill.owner_id == owner_id)

    if non_suspicious_only:
        suspicious_ids = select(SkillModeration.skill_id).where(
            SkillModeration.is_suspicious == True  # noqa: E712
        )
        query = query.where(Skill.id.notin_(suspicious_ids))

    # Sorting
    if sort == "downloads":
        # stats is JSON; sort by extracting downloads key
        # For SQLite/PG compatibility, fetch all and sort in Python
        pass
    else:
        query = query.order_by(Skill.updated_at.desc())

    if sort != "downloads" and cursor:
        try:
            cursor_ts = float(cursor)
            query = query.where(Skill.updated_at < cursor_ts)
        except ValueError:
            pass

    if sort == "downloads":
        # Fetch all matching, sort in Python by stats.downloads
        result = await session.execute(query)
        all_skills = list(result.scalars().all())
        all_skills.sort(
            key=lambda s: (s.stats or {}).get("downloads", 0), reverse=True
        )
        # Apply cursor-based pagination using index offset
        start = 0
        if cursor:
            try:
                start = int(cursor)
            except ValueError:
                pass
        page = all_skills[start : start + limit + 1]
        next_cursor = None
        if len(page) > limit:
            page = page[:limit]
            next_cursor = str(start + limit)

        items = []
        for skill in page:
            latest = await _get_latest_version(session, skill.id)
            owner = await _get_owner(session, skill.owner_id)
            items.append({"skill": skill, "latestVersion": latest, "owner": owner})
        return items, next_cursor

    query = query.limit(limit + 1)
    result = await session.execute(query)
    skills = list(result.scalars().all())

    next_cursor = None
    if len(skills) > limit:
        skills = skills[:limit]
        next_cursor = str(skills[-1].updated_at)

    items = []
    for skill in skills:
        latest = await _get_latest_version(session, skill.id)
        owner = await _get_owner(session, skill.owner_id)
        items.append({
            "skill": skill,
            "latestVersion": latest,
            "owner": owner,
        })

    return items, next_cursor


async def get_skill(session: AsyncSession, slug: str, increment_view: bool = True) -> dict | None:
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_deleted == False)  # noqa: E712
    )
    skill = result.scalars().first()
    if skill is None:
        return None

    # Increment view count
    if increment_view:
        stats = dict(skill.stats or {})
        stats["views"] = stats.get("views", 0) + 1
        skill.stats = stats
        session.add(skill)
        await session.commit()
        await session.refresh(skill)

    owner = await _get_owner(session, skill.owner_id)
    latest = await _get_latest_version(session, skill.id)
    moderation = await _get_moderation(session, skill.id)

    return {
        "skill": skill,
        "owner": owner,
        "latestVersion": latest,
        "moderation": moderation,
    }


async def create_or_update_skill(
    session: AsyncSession,
    owner: User,
    slug: str,
    display_name: str,
    version: str,
    changelog: str,
    files: list[dict],
    tags: list[str] | dict | None = None,
    summary: str | None = None,
) -> tuple[Skill, SkillVersion]:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()

    now = _now()
    tag_map: dict = {}
    if isinstance(tags, list):
        tag_map = {t: t for t in tags}
    elif isinstance(tags, dict):
        tag_map = tags

    if skill is None:
        skill = Skill(
            slug=slug,
            display_name=display_name,
            summary=summary,
            tags=tag_map,
            owner_id=owner.id,
            created_at=now,
            updated_at=now,
        )
        session.add(skill)
        await session.flush()
    else:
        skill.display_name = display_name
        skill.updated_at = now
        skill.is_deleted = False
        if summary is not None:
            skill.summary = summary
        if tag_map:
            skill.tags = tag_map
        session.add(skill)
        await session.flush()

    # Check if this version already exists — update instead of duplicating
    existing_sv = await session.execute(
        select(SkillVersion).where(
            SkillVersion.skill_id == skill.id,
            SkillVersion.version == version,
        )
    )
    sv = existing_sv.scalars().first()
    if sv is not None:
        sv.changelog = changelog
        sv.changelog_source = "user"
        sv.files = files
        sv.created_at = now
    else:
        sv = SkillVersion(
            skill_id=skill.id,
            version=version,
            changelog=changelog,
            changelog_source="user",
            files=files,
            security={
                "status": "pending",
                "hasWarnings": False,
                "hasScanResult": False,
            },
            created_at=now,
        )
    session.add(sv)
    await session.flush()

    return skill, sv


async def soft_delete_skill(
    session: AsyncSession, slug: str, owner: User
) -> bool:
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.owner_id == owner.id)
    )
    skill = result.scalars().first()
    if skill is None:
        return False
    skill.is_deleted = True
    skill.updated_at = _now()
    session.add(skill)
    await session.commit()
    return True


async def undelete_skill(
    session: AsyncSession, slug: str, owner: User
) -> bool:
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.owner_id == owner.id)
    )
    skill = result.scalars().first()
    if skill is None:
        return False
    skill.is_deleted = False
    skill.updated_at = _now()
    session.add(skill)
    await session.commit()
    return True


async def list_versions(
    session: AsyncSession,
    slug: str,
    limit: int = 20,
    cursor: str | None = None,
) -> tuple[list[SkillVersion], str | None] | None:
    result = await session.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_deleted == False)  # noqa: E712
    )
    skill = result.scalars().first()
    if skill is None:
        return None

    query = (
        select(SkillVersion)
        .where(SkillVersion.skill_id == skill.id)
        .order_by(SkillVersion.created_at.desc())
    )

    if cursor:
        try:
            cursor_ts = float(cursor)
            query = query.where(SkillVersion.created_at < cursor_ts)
        except ValueError:
            pass

    query = query.limit(limit + 1)
    result = await session.execute(query)
    versions = list(result.scalars().all())

    next_cursor = None
    if len(versions) > limit:
        versions = versions[:limit]
        next_cursor = str(versions[-1].created_at)

    return versions, next_cursor


async def get_version(
    session: AsyncSession, slug: str, version: str
) -> dict | None:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()
    if skill is None:
        return None

    result = await session.execute(
        select(SkillVersion).where(
            SkillVersion.skill_id == skill.id,
            SkillVersion.version == version,
        )
    )
    sv = result.scalars().first()
    if sv is None:
        return None

    return {"skill": skill, "version": sv}


async def get_moderation(
    session: AsyncSession, slug: str
) -> dict | None:
    result = await session.execute(
        select(Skill).where(Skill.slug == slug)
    )
    skill = result.scalars().first()
    if skill is None:
        return None

    mod = await _get_moderation(session, skill.id)
    return {"moderation": mod}


async def get_scan(
    session: AsyncSession,
    slug: str,
    version: str | None = None,
) -> dict | None:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()
    if skill is None:
        return None

    if version:
        result = await session.execute(
            select(SkillVersion)
            .where(
                SkillVersion.skill_id == skill.id,
                SkillVersion.version == version,
            )
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    else:
        result = await session.execute(
            select(SkillVersion)
            .where(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    sv = result.scalars().first()
    if sv is None:
        return None

    mod = await _get_moderation(session, skill.id)
    return {"skill": skill, "version": sv, "moderation": mod}


async def get_file_content(
    session: AsyncSession,
    slug: str,
    path: str,
    version: str | None = None,
) -> str | None:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()
    if skill is None:
        return None

    if version:
        result = await session.execute(
            select(SkillVersion)
            .where(
                SkillVersion.skill_id == skill.id,
                SkillVersion.version == version,
            )
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    else:
        result = await session.execute(
            select(SkillVersion)
            .where(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    sv = result.scalars().first()
    if sv is None:
        return None

    from app.models.file_storage import FileStorage

    for f in sv.files:
        if f.get("path") == path:
            sha = f.get("sha256")
            if sha:
                res = await session.execute(
                    select(FileStorage).where(FileStorage.sha256 == sha)
                )
                storage = res.scalars().first()
                if storage:
                    return storage.content.decode("utf-8", errors="replace")
            return f"# {path}\n\n(File content not stored)"

    return None


async def search_skills(
    session: AsyncSession,
    q: str = "",
    limit: int = 20,
    offset: int = 0,
    sort: str = "updated",
    highlighted_only: bool = False,
    non_suspicious_only: bool = False,
) -> list[dict]:
    search_term = q.strip()

    if search_term:
        if settings.is_sqlite:
            skills_with_rank = await _search_fts5(session, search_term, limit, offset, non_suspicious_only)
        else:
            skills_with_rank = await _search_tsvector(session, search_term, limit, offset, non_suspicious_only)
    else:
        skills_with_rank = await _search_fallback(session, limit, offset, non_suspicious_only)

    items = []
    for skill, rank_score in skills_with_rank:
        latest = await _get_latest_version(session, skill.id)
        owner = await _get_owner(session, skill.owner_id)

        stats = skill.stats or {}
        items.append({
            "score": rank_score,
            "slug": skill.slug,
            "displayName": skill.display_name,
            "summary": skill.summary,
            "version": latest.version if latest else None,
            "updatedAt": skill.updated_at,
            "downloads": stats.get("downloads", 0),
            "stars": stats.get("stars", 0),
            "views": stats.get("views", 0),
            "ownerHandle": owner.handle if owner else None,
            "ownerImage": owner.image if owner else None,
        })

    if sort == "downloads":
        items.sort(key=lambda x: x["downloads"], reverse=True)

    return items


async def _search_fts5(
    session: AsyncSession,
    q: str,
    limit: int,
    offset: int,
    non_suspicious_only: bool,
) -> list[tuple[Skill, float]]:
    """Full-text search using SQLite FTS5."""
    # Tokenize: split on non-alphanumeric, filter empty, build FTS5 query
    import re
    tokens = [t for t in re.split(r"[^a-zA-Z0-9]+", q) if t]
    if not tokens:
        return await _search_like_fallback(session, q, limit, offset, non_suspicious_only)
    # Match each token as prefix (word*) joined with implicit AND
    fts_query = " ".join(f'"{t}"*' for t in tokens)

    # Get matching rowids and scores from FTS5
    sql = text(
        "SELECT fts.rowid AS rid, -fts.rank AS score "
        "FROM skills_fts fts "
        "WHERE skills_fts MATCH :q "
        "ORDER BY fts.rank "
        "LIMIT :limit OFFSET :offset"
    )
    result = await session.execute(sql, {"q": fts_query, "limit": limit, "offset": offset})
    fts_rows = result.mappings().all()

    if not fts_rows:
        return await _search_like_fallback(session, q, limit, offset, non_suspicious_only)

    # Load actual Skill objects by rowid
    rowid_to_score = {row["rid"]: float(row["score"]) for row in fts_rows}
    rowids = list(rowid_to_score.keys())

    # SQLite rowid lookup via raw SQL, then load Skills by slug
    slug_result = await session.execute(
        text("SELECT rowid, slug FROM skills WHERE rowid IN ({})".format(
            ",".join(str(r) for r in rowids)
        ))
    )
    rowid_slug_map = {row[0]: row[1] for row in slug_result}

    slugs = list(rowid_slug_map.values())
    skill_result = await session.execute(
        select(Skill).where(Skill.slug.in_(slugs), Skill.is_deleted == False)  # noqa: E712
    )
    skill_map = {s.slug: s for s in skill_result.scalars().all()}

    skills_with_rank: list[tuple[Skill, float]] = []
    q_lower = q.lower()
    for rowid in rowids:
        slug = rowid_slug_map.get(rowid)
        if not slug or slug not in skill_map:
            continue
        skill = skill_map[slug]
        score = rowid_to_score[rowid]
        # Boost exact/partial slug match
        if skill.slug.lower() == q_lower:
            score += 100.0
        elif q_lower in skill.slug.lower():
            score += 10.0
        skills_with_rank.append((skill, score))

    if non_suspicious_only:
        skills_with_rank = await _filter_suspicious(session, skills_with_rank)

    return skills_with_rank


async def _search_tsvector(
    session: AsyncSession,
    q: str,
    limit: int,
    offset: int,
    non_suspicious_only: bool,
) -> list[tuple[Skill, float]]:
    """Full-text search using PostgreSQL tsvector."""
    # Get matching skill slugs and scores
    sql = text(
        "SELECT s.slug, ts_rank(s.search_vector, query) AS score "
        "FROM skills s, plainto_tsquery('english', :q) query "
        "WHERE s.search_vector @@ query AND s.is_deleted = false "
        "ORDER BY score DESC "
        "LIMIT :limit OFFSET :offset"
    )
    result = await session.execute(sql, {"q": q, "limit": limit, "offset": offset})
    rows = result.mappings().all()

    if not rows:
        return await _search_like_fallback(session, q, limit, offset, non_suspicious_only)

    slug_to_score = {row["slug"]: float(row["score"]) for row in rows}
    slugs = list(slug_to_score.keys())

    skill_result = await session.execute(
        select(Skill).where(Skill.slug.in_(slugs), Skill.is_deleted == False)  # noqa: E712
    )
    skill_map = {s.slug: s for s in skill_result.scalars().all()}

    skills_with_rank: list[tuple[Skill, float]] = []
    for slug in slugs:
        if slug in skill_map:
            skills_with_rank.append((skill_map[slug], slug_to_score[slug]))

    if non_suspicious_only:
        skills_with_rank = await _filter_suspicious(session, skills_with_rank)

    return skills_with_rank


async def _search_like_fallback(
    session: AsyncSession,
    q: str,
    limit: int,
    offset: int,
    non_suspicious_only: bool,
) -> list[tuple[Skill, float]]:
    """ILIKE fallback when FTS returns no results (e.g. partial substring match)."""
    search_term = f"%{q}%"
    query = (
        select(Skill)
        .where(Skill.is_deleted == False)  # noqa: E712
        .where(
            (Skill.slug.ilike(search_term))
            | (Skill.display_name.ilike(search_term))
            | (Skill.summary.ilike(search_term))
        )
        .order_by(Skill.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if non_suspicious_only:
        suspicious_ids = select(SkillModeration.skill_id).where(
            SkillModeration.is_suspicious == True  # noqa: E712
        )
        query = query.where(Skill.id.notin_(suspicious_ids))

    result = await session.execute(query)
    skills = list(result.scalars().all())

    q_lower = q.lower()
    scored: list[tuple[Skill, float]] = []
    for skill in skills:
        score = 1.0
        if q_lower in (skill.slug or "").lower():
            score = 2.0
        if q_lower == (skill.slug or "").lower():
            score = 3.0
        scored.append((skill, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


async def _search_fallback(
    session: AsyncSession,
    limit: int,
    offset: int,
    non_suspicious_only: bool,
) -> list[tuple[Skill, float]]:
    """No search query — return all skills sorted by updated_at."""
    query = (
        select(Skill)
        .where(Skill.is_deleted == False)  # noqa: E712
        .order_by(Skill.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if non_suspicious_only:
        suspicious_ids = select(SkillModeration.skill_id).where(
            SkillModeration.is_suspicious == True  # noqa: E712
        )
        query = query.where(Skill.id.notin_(suspicious_ids))

    result = await session.execute(query)
    skills = list(result.scalars().all())
    return [(skill, 1.0) for skill in skills]


async def _filter_suspicious(
    session: AsyncSession,
    skills_with_rank: list[tuple[Skill, float]],
) -> list[tuple[Skill, float]]:
    """Remove suspicious skills from results."""
    if not skills_with_rank:
        return skills_with_rank
    skill_ids = [s.id for s, _ in skills_with_rank]
    result = await session.execute(
        select(SkillModeration.skill_id).where(
            SkillModeration.skill_id.in_(skill_ids),
            SkillModeration.is_suspicious == True,  # noqa: E712
        )
    )
    suspicious_ids = set(result.scalars().all())
    return [(s, r) for s, r in skills_with_rank if s.id not in suspicious_ids]


async def resolve_version(
    session: AsyncSession, slug: str, hash: str
) -> dict | None:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()
    if skill is None:
        return None

    # Find version matching the hash (prefix match on any file sha256)
    result = await session.execute(
        select(SkillVersion)
        .where(SkillVersion.skill_id == skill.id)
        .order_by(SkillVersion.created_at.desc())
    )
    versions = result.scalars().all()

    match = None
    for v in versions:
        for f in v.files:
            if f.get("sha256", "").startswith(hash):
                match = v
                break
        if match:
            break

    latest = versions[0] if versions else None

    return {
        "match": {"version": match.version} if match else None,
        "latestVersion": {"version": latest.version} if latest else None,
    }


async def get_download_data(
    session: AsyncSession,
    slug: str,
    version: str | None = None,
) -> dict | None:
    result = await session.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalars().first()
    if skill is None:
        return None

    if version:
        result = await session.execute(
            select(SkillVersion)
            .where(
                SkillVersion.skill_id == skill.id,
                SkillVersion.version == version,
            )
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    else:
        result = await session.execute(
            select(SkillVersion)
            .where(SkillVersion.skill_id == skill.id)
            .order_by(SkillVersion.created_at.desc())
            .limit(1)
        )
    sv = result.scalars().first()
    if sv is None:
        return None

    return {"skill": skill, "version": sv}


# --- helpers ---

async def _get_latest_version(
    session: AsyncSession, skill_id: uuid.UUID
) -> SkillVersion | None:
    result = await session.execute(
        select(SkillVersion)
        .where(SkillVersion.skill_id == skill_id)
        .order_by(SkillVersion.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def _get_owner(
    session: AsyncSession, owner_id: uuid.UUID
) -> User | None:
    result = await session.execute(select(User).where(User.id == owner_id))
    return result.scalars().first()


async def _get_moderation(
    session: AsyncSession, skill_id: uuid.UUID
) -> SkillModeration | None:
    result = await session.execute(
        select(SkillModeration).where(SkillModeration.skill_id == skill_id)
    )
    return result.scalars().first()
