from pydantic import BaseModel


class SearchResult(BaseModel):
    score: float
    slug: str | None = None
    displayName: str | None = None
    summary: str | None = None
    version: str | None = None
    updatedAt: float | None = None
    downloads: int = 0
    stars: int = 0
    views: int = 0
    ownerHandle: str | None = None
    ownerImage: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]
