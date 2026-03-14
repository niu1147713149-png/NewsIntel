"""Dependency providers for FastAPI route/service wiring."""

from collections.abc import AsyncGenerator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_async_session
from app.core.security import decode_session_token
from app.models.user import User


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide SQLAlchemy async session to route dependencies.

    Yields:
        AsyncSession: Database session scoped to current request lifecycle.
    """
    async for session in get_async_session():
        yield session


async def get_current_user(
    db: AsyncSession = Depends(get_db_session),
    session_token: str | None = Cookie(default=None, alias=get_settings().session_cookie_name),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user_id = decode_session_token(session_token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    user = await db.get(User, user_id)
    if user is None or user.is_deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
