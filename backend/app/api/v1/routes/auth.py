from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db_session
from app.core.security import create_session_token
from app.models.user import User
from app.schemas.auth import AuthResponse, AuthUserData, ChangePasswordRequest, LoginRequest, RegisterRequest, UpdateProfileRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_user_data(user: User) -> AuthUserData:
    return AuthUserData(id=user.id, email=user.email, name=user.name, role=user.role)


def _set_session_cookie(response: Response, user_id: int) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=create_session_token(user_id),
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )


@router.post("/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    service = AuthService(db_session=db)
    try:
        user = await service.register(email=payload.email.lower(), password=payload.password, name=payload.name)
    except ValueError as exc:
        if str(exc) == "email_in_use":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use") from exc
        raise
    _set_session_cookie(response, user.id)
    return AuthResponse(status="success", data=_build_user_data(user))


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    service = AuthService(db_session=db)
    try:
        user = await service.authenticate(email=payload.email.lower(), password=payload.password)
    except ValueError as exc:
        if str(exc) == "invalid_credentials":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials") from exc
        raise
    _set_session_cookie(response, user.id)
    return AuthResponse(status="success", data=_build_user_data(user))


@router.post("/logout", response_model=AuthResponse)
async def logout(response: Response, current_user: User = Depends(get_current_user)) -> AuthResponse:
    settings = get_settings()
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    return AuthResponse(status="success", data=_build_user_data(current_user))


@router.get("/me", response_model=AuthResponse)
async def me(current_user: User = Depends(get_current_user)) -> AuthResponse:
    return AuthResponse(status="success", data=_build_user_data(current_user))


@router.post("/change-password", response_model=AuthResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    service = AuthService(db_session=db)
    try:
        user = await service.change_password(
            user=current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except ValueError as exc:
        if str(exc) == "invalid_current_password":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect") from exc
        raise
    return AuthResponse(status="success", data=_build_user_data(user))


@router.post("/profile", response_model=AuthResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> AuthResponse:
    service = AuthService(db_session=db)
    user = await service.update_profile(user=current_user, name=payload.name)
    return AuthResponse(status="success", data=_build_user_data(user))
