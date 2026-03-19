from pydantic import BaseModel


class SecuritySnapshot(BaseModel):
    status: str = "pending"
    hasWarnings: bool = False
    checkedAt: float | None = None
    model: str | None = None
    hasScanResult: bool = False
    sha256hash: str | None = None
    virustotalUrl: str | None = None
    scanners: dict = {}


class VersionFile(BaseModel):
    path: str
    size: int
    sha256: str
    contentType: str | None = None


class SkillVersion(BaseModel):
    version: str
    createdAt: float
    changelog: str
    changelogSource: str | None = None


class SkillVersionListResponse(BaseModel):
    items: list[SkillVersion]
    nextCursor: str | None = None


class VersionDetail(BaseModel):
    version: str
    createdAt: float
    changelog: str
    changelogSource: str | None = None
    files: list[VersionFile] = []
    security: SecuritySnapshot = SecuritySnapshot()


class SkillVersionResponseSkill(BaseModel):
    slug: str
    displayName: str


class SkillVersionResponse(BaseModel):
    skill: SkillVersionResponseSkill | None = None
    version: VersionDetail | None = None
