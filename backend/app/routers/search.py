from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.search import SearchResponse, SearchResult
from app.services import skill_service

router = APIRouter()


@router.get("/search", response_model=SearchResponse, tags=["search"], summary="Search skills", description="Full-text search across skill slugs, display names, and summaries.")
async def search_skills(
    q: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
    highlightedOnly: bool = Query(False),
    nonSuspiciousOnly: bool = Query(False),
    nonSuspicious: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    non_sus = nonSuspiciousOnly or nonSuspicious
    items = await skill_service.search_skills(
        session,
        q=q,
        limit=limit,
        highlighted_only=highlightedOnly,
        non_suspicious_only=non_sus,
    )
    return SearchResponse(
        results=[SearchResult(**item) for item in items]
    )
