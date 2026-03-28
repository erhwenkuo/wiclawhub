import hashlib
import os
import secrets
import uuid as uuid_mod
from pathlib import Path
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth import get_current_user
from app.config import settings
from app.database import get_session
from app.models.user import User
from app.schemas.auth import (
    AuthTokenResponse,
    EmailLoginRequest,
    EmailRegisterRequest,
    RefreshRequest,
)
from app.schemas.user import Owner, UpdateProfileRequest, WhoamiResponse
from app.services.auth_service import (
    authenticate_email_user,
    create_access_token,
    refresh_access_token,
    register_email_user,
    revoke_user_refresh_tokens,
    get_or_create_oauth_user,
)

router = APIRouter()

OAUTH_PROVIDERS = {"github", "google"}


def _make_owner(user: User) -> Owner:
    return Owner(
        handle=user.handle,
        displayName=user.display_name,
        image=user.image,
    )


def _make_auth_response(user: User, access: str, refresh: str) -> AuthTokenResponse:
    return AuthTokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=_make_owner(user),
    )


# ── Existing endpoint ──


@router.get(
    "/whoami",
    response_model=WhoamiResponse,
    tags=["auth"],
    summary="Who am I",
    description="Return the authenticated user's profile. Requires bearer token.",
)
async def whoami(user: User = Depends(get_current_user)):
    return WhoamiResponse(user=_make_owner(user))


# ── CLI Token ──


@router.post(
    "/auth/cli-token",
    tags=["auth"],
    summary="Generate API token for CLI",
    description="Generate a new API token for the authenticated user. Used by CLI browser flow.",
)
async def generate_cli_token(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Generate a new random API token
    raw_token = secrets.token_hex(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    # Store the hash on the user
    user.api_token_hash = token_hash
    session.add(user)
    await session.commit()

    return {"token": raw_token}


# ── Profile ──

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.patch(
    "/profile",
    response_model=WhoamiResponse,
    tags=["auth"],
    summary="Update profile",
    description="Update the authenticated user's display name and/or handle.",
)
async def update_profile(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if body.handle is not None and body.handle != user.handle:
        # Check uniqueness
        result = await session.execute(select(User).where(User.handle == body.handle))
        if result.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This handle is already taken.",
            )
        user.handle = body.handle
    if body.display_name is not None:
        user.display_name = body.display_name
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return WhoamiResponse(user=_make_owner(user))


@router.post(
    "/profile/avatar",
    response_model=WhoamiResponse,
    tags=["auth"],
    summary="Upload avatar",
    description="Upload or replace the authenticated user's avatar image. Max 2 MB. Accepts JPEG, PNG, GIF, WebP.",
)
async def upload_avatar(
    file: UploadFile,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_AVATAR_TYPES)}",
        )

    contents = await file.read()
    if len(contents) > settings.MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_AVATAR_SIZE // (1024 * 1024)} MB",
        )

    # Determine file extension from content type
    ext = file.content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{uuid_mod.uuid4().hex}.{ext}"

    avatar_dir = Path(settings.UPLOAD_DIR) / "avatars"
    avatar_dir.mkdir(parents=True, exist_ok=True)

    # Delete old avatar file if it was a local upload
    if user.image and user.image.startswith("/uploads/avatars/"):
        old_path = Path(settings.UPLOAD_DIR) / user.image.removeprefix("/uploads/")
        if old_path.exists():
            os.remove(old_path)

    filepath = avatar_dir / filename
    filepath.write_bytes(contents)

    user.image = f"/uploads/avatars/{filename}"
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return WhoamiResponse(user=_make_owner(user))


# ── Email/Password ──


@router.post(
    "/auth/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
    summary="Register with email and password",
)
async def register(
    body: EmailRegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    # Check if email already exists
    result = await session.execute(select(User).where(User.email == body.email))
    if result.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user, access, refresh = await register_email_user(body.email, body.password, session)
    return _make_auth_response(user, access, refresh)


@router.post(
    "/auth/login",
    response_model=AuthTokenResponse,
    tags=["auth"],
    summary="Login with email and password",
)
async def login(
    body: EmailLoginRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await authenticate_email_user(body.email, body.password, session)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    user, access, refresh = result
    return _make_auth_response(user, access, refresh)


@router.post(
    "/auth/refresh",
    response_model=AuthTokenResponse,
    tags=["auth"],
    summary="Refresh access token",
)
async def refresh(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await refresh_access_token(body.refresh_token, session)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )
    access, new_refresh = result
    # Decode the new access token to get the user
    from app.services.auth_service import decode_access_token

    user_id = decode_access_token(access)
    user = await session.get(User, user_id)
    return _make_auth_response(user, access, new_refresh)


@router.post(
    "/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["auth"],
    summary="Logout (revoke refresh tokens)",
)
async def logout(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await revoke_user_refresh_tokens(user.id, session)


# ── OAuth ──


def _create_oauth_state() -> str:
    """Create a signed state JWT for CSRF protection."""
    import time

    payload = {"exp": int(time.time()) + 600, "type": "oauth_state"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.JWT_ALGORITHM)


def _verify_oauth_state(state: str) -> bool:
    """Verify the OAuth state token."""
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("type") == "oauth_state"
    except Exception:
        return False


@router.get(
    "/auth/oauth/{provider}/authorize",
    tags=["auth"],
    summary="Start OAuth flow",
)
async def oauth_authorize(provider: str):
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    state = _create_oauth_state()
    callback_url = f"{settings.FRONTEND_URL.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"

    if provider == "github":
        params = urlencode({
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": callback_url,
            "scope": "read:user user:email",
            "state": state,
        })
        return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")

    if provider == "google":
        params = urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": callback_url,
            "scope": "openid email profile",
            "response_type": "code",
            "state": state,
        })
        return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get(
    "/auth/oauth/{provider}/callback",
    tags=["auth"],
    summary="OAuth callback",
)
async def oauth_callback(
    provider: str,
    code: str,
    state: str,
    session: AsyncSession = Depends(get_session),
):
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    if not _verify_oauth_state(state):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    callback_url = f"{settings.FRONTEND_URL.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"

    async with httpx.AsyncClient() as client:
        if provider == "github":
            # Exchange code for access token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": callback_url,
                },
                headers={"Accept": "application/json"},
            )
            token_data = token_resp.json()
            gh_token = token_data.get("access_token")
            if not gh_token:
                raise HTTPException(status_code=400, detail="Failed to get GitHub access token")

            # Fetch user profile
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {gh_token}"},
            )
            profile = user_resp.json()

            # Fetch emails
            emails_resp = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {gh_token}"},
            )
            emails = emails_resp.json()
            primary_email = next(
                (e["email"] for e in emails if e.get("primary") and e.get("verified")),
                None,
            )

            provider_id = str(profile["id"])
            name = profile.get("name") or profile.get("login")
            handle = profile.get("login")
            avatar = profile.get("avatar_url")
            email = primary_email

        elif provider == "google":
            # Exchange code for access token
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": callback_url,
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_resp.json()
            g_token = token_data.get("access_token")
            if not g_token:
                raise HTTPException(status_code=400, detail="Failed to get Google access token")

            # Fetch user profile
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {g_token}"},
            )
            profile = user_resp.json()

            provider_id = str(profile["id"])
            name = profile.get("name")
            handle = None
            avatar = profile.get("picture")
            email = profile.get("email")

    # Derive handle: GitHub login > email prefix > None
    if not handle and email and "@" in email:
        handle = email.split("@")[0]

    user, access, refresh_tok = await get_or_create_oauth_user(
        provider=provider,
        provider_account_id=provider_id,
        email=email,
        name=name,
        handle=handle,
        avatar=avatar,
        session=session,
    )

    # Redirect back to frontend with tokens
    params = urlencode({"access_token": access, "refresh_token": refresh_tok})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?{params}")
