import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.models.oauth_account import OAuthAccount
from app.models.refresh_token import RefreshToken
from app.models.user import User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        sub = payload.get("sub")
        if sub is None:
            return None
        return uuid.UUID(sub)
    except (JWTError, ValueError):
        return None


async def create_refresh_token(user_id: uuid.UUID, session: AsyncSession) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw_token)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)).timestamp()
    rt = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    session.add(rt)
    await session.commit()
    return raw_token


async def register_email_user(
    email: str, password: str, session: AsyncSession
) -> tuple[User, str, str]:
    handle = email.split("@")[0] if "@" in email else None
    user = User(
        email=email,
        password_hash=hash_password(password),
        auth_provider="email",
        handle=handle,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    access = create_access_token(user.id)
    refresh = await create_refresh_token(user.id, session)
    return user, access, refresh


async def authenticate_email_user(
    email: str, password: str, session: AsyncSession
) -> tuple[User, str, str] | None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None or user.password_hash is None:
        return None
    if not verify_password(password, user.password_hash):
        return None

    access = create_access_token(user.id)
    refresh = await create_refresh_token(user.id, session)
    return user, access, refresh


async def get_or_create_oauth_user(
    provider: str,
    provider_account_id: str,
    email: str | None,
    name: str | None,
    handle: str | None,
    avatar: str | None,
    session: AsyncSession,
) -> tuple[User, str, str]:
    # Check if OAuth account already linked
    result = await session.execute(
        select(OAuthAccount).where(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_account_id == provider_account_id,
        )
    )
    oauth_account = result.scalars().first()

    if oauth_account:
        user = await session.get(User, oauth_account.user_id)
        # Backfill handle if missing
        if user and not user.handle and handle:
            user.handle = handle
            session.add(user)
            await session.commit()
            await session.refresh(user)
    else:
        # Check if a user with this email already exists
        user = None
        if email:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalars().first()

        if user is None:
            user = User(
                email=email,
                handle=handle,
                display_name=name,
                image=avatar,
                auth_provider=provider,
                email_verified=bool(email),
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        elif not user.handle and handle:
            # Backfill handle for existing user linked by email
            user.handle = handle
            session.add(user)
            await session.commit()
            await session.refresh(user)

        # Link the OAuth account
        oauth_link = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_account_id=provider_account_id,
            provider_email=email,
        )
        session.add(oauth_link)
        await session.commit()

    access = create_access_token(user.id)
    refresh = await create_refresh_token(user.id, session)
    return user, access, refresh


async def refresh_access_token(
    raw_refresh_token: str, session: AsyncSession
) -> tuple[str, str] | None:
    token_hash = _hash_token(raw_refresh_token)
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    rt = result.scalars().first()
    if rt is None:
        return None

    now = datetime.now(timezone.utc).timestamp()
    if rt.expires_at < now:
        return None

    # Revoke old token
    rt.revoked = True
    session.add(rt)
    await session.commit()

    # Issue new tokens
    access = create_access_token(rt.user_id)
    new_refresh = await create_refresh_token(rt.user_id, session)
    return access, new_refresh


async def revoke_user_refresh_tokens(user_id: uuid.UUID, session: AsyncSession) -> None:
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    for rt in result.scalars().all():
        rt.revoked = True
        session.add(rt)
    await session.commit()
