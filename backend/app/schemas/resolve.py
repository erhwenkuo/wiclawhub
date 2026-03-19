from pydantic import BaseModel


class VersionRef(BaseModel):
    version: str


class ResolveResponse(BaseModel):
    match: VersionRef | None = None
    latestVersion: VersionRef | None = None
