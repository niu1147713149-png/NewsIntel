from __future__ import annotations

import base64
import hashlib
import hmac
import os

from itsdangerous import BadSignature, URLSafeSerializer

from app.core.config import get_settings

PASSWORD_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt_text, digest_text = password_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.b64decode(salt_text.encode())
    expected_digest = base64.b64decode(digest_text.encode())
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iteration_text))
    return hmac.compare_digest(candidate, expected_digest)


def create_session_token(user_id: int) -> str:
    serializer = URLSafeSerializer(get_settings().session_secret_key, salt="auth-session")
    return serializer.dumps({"user_id": user_id})


def decode_session_token(token: str) -> int | None:
    serializer = URLSafeSerializer(get_settings().session_secret_key, salt="auth-session")
    try:
        payload = serializer.loads(token)
    except BadSignature:
        return None
    user_id = payload.get("user_id")
    return int(user_id) if isinstance(user_id, int) else None
