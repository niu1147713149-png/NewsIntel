from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.models.user import User


class AuthService:
    def __init__(self, db_session: AsyncSession) -> None:
        self._db = db_session

    async def register(self, email: str, password: str, name: str | None) -> User:
        existing_user = await self._db.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            raise ValueError("email_in_use")

        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            role="user",
            settings=None,
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self._db.scalar(select(User).where(User.email == email, User.is_deleted.is_(False)))
        if user is None or not verify_password(password, user.password_hash):
            raise ValueError("invalid_credentials")
        return user

    async def change_password(self, user: User, current_password: str, new_password: str) -> User:
        if not verify_password(current_password, user.password_hash):
            raise ValueError("invalid_current_password")
        user.password_hash = hash_password(new_password)
        await self._db.commit()
        await self._db.refresh(user)
        return user

    async def update_profile(self, user: User, name: str | None) -> User:
        user.name = name.strip() if isinstance(name, str) and name.strip() else None
        await self._db.commit()
        await self._db.refresh(user)
        return user
