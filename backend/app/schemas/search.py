from pydantic import BaseModel


class SearchResult(BaseModel):
    score: float
    slug: str | None = None
    displayName: str | None = None
    summary: str | None = None
    version: str | None = None
    updatedAt: float | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
