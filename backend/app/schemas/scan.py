from pydantic import BaseModel

from app.schemas.version import SecuritySnapshot


class ScanSkill(BaseModel):
    slug: str
    displayName: str


class ScanVersion(BaseModel):
    version: str
    createdAt: float
    changelogSource: str | None = None


class ScanSourceVersion(BaseModel):
    version: str
    createdAt: float


class ScanModeration(BaseModel):
    scope: str = "skill"
    sourceVersion: ScanSourceVersion | None = None
    matchesRequestedVersion: bool = True
    isPendingScan: bool = False
    isMalwareBlocked: bool = False
    isSuspicious: bool = False
    isHiddenByMod: bool = False
    isRemoved: bool = False


class SkillScanResponse(BaseModel):
    skill: ScanSkill
    version: ScanVersion
    moderation: ScanModeration | None = None
    security: SecuritySnapshot | None = None
