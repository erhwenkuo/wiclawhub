from pydantic import BaseModel, field_validator


class Owner(BaseModel):
    handle: str | None = None
    displayName: str | None = None
    image: str | None = None


class WhoamiResponse(BaseModel):
    user: Owner


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    handle: str | None = None

    @field_validator("display_name")
    @classmethod
    def display_name_length(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) == 0:
            raise ValueError("Display name cannot be empty")
        if v is not None and len(v) > 255:
            raise ValueError("Display name must not exceed 255 characters")
        return v

    @field_validator("handle")
    @classmethod
    def handle_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        v = v.strip()
        if len(v) == 0:
            raise ValueError("Handle cannot be empty")
        if len(v) > 255:
            raise ValueError("Handle must not exceed 255 characters")
        if not re.match(r"^[a-zA-Z0-9._-]+$", v):
            raise ValueError("Handle may only contain letters, numbers, dots, hyphens, and underscores")
        return v
