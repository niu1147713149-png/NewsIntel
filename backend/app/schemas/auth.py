from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ApiResponse


class AuthUserData(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    role: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, max_length=255)


class AuthResponse(ApiResponse[AuthUserData]):
    pass
