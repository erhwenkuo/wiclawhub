from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.user import Owner


class EmailRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    agree_tos: bool

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes")
        return v

    @field_validator("agree_tos")
    @classmethod
    def must_agree_tos(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to the Terms of Service")
        return v


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_max_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes")
        return v


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Owner


class RefreshRequest(BaseModel):
    refresh_token: str
