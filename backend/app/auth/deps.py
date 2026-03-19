import hashlib

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.user import User
from app.services.auth_service import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _resolve_user(token: str, session: AsyncSession) -> User | None:
    # Try JWT first (JWTs contain dots)
    if "." in token:
        user_id = decode_access_token(token)
        if user_id:
            user = await session.get(User, user_id)
            if user:
                return user

    # Fall back to API token hash lookup
    token_hash = _hash_token(token)
    result = await session.execute(
        select(User).where(User.api_token_hash == token_hash)
    )
    return result.scalars().first()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )
    user = await _resolve_user(credentials.credentials, session)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    if credentials is None:
        return None
    return await _resolve_user(credentials.credentials, session)
