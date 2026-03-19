from pydantic import BaseModel

from app.schemas.user import Owner


class LatestVersion(BaseModel):
    version: str
    createdAt: float
    changelog: str


class ModerationInfo(BaseModel):
    isSuspicious: bool = False
    isMalwareBlocked: bool = False
    verdict: str = "clean"
    reasonCodes: list[str] = []
    summary: str | None = None
    engineVersion: str | None = None
    updatedAt: float | None = None


class SkillListItem(BaseModel):
    slug: str
    displayName: str
    summary: str | None = None
    tags: dict = {}
    stats: dict = {}
    createdAt: float
    updatedAt: float
    latestVersion: LatestVersion | None = None


class SkillListResponse(BaseModel):
    items: list[SkillListItem]
    nextCursor: str | None = None


class SkillData(BaseModel):
    slug: str
    displayName: str
    summary: str | None = None
    tags: dict = {}
    stats: dict = {}
    createdAt: float
    updatedAt: float


class SkillResponse(BaseModel):
    skill: SkillData
    latestVersion: LatestVersion | None = None
    owner: Owner | None = None
    moderation: ModerationInfo | None = None


class PublishPayload(BaseModel):
    slug: str
    displayName: str
    version: str
    changelog: str
    files: list[dict] = []
    tags: list[str] | dict = {}
    forkOf: dict | None = None


class PublishResponse(BaseModel):
    ok: bool
    skillId: str
    versionId: str
