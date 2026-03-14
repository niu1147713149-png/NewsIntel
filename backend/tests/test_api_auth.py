from __future__ import annotations


def test_register_login_me_logout_flow(client) -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "password": "StrongPass123", "name": "Test User"},
    )
    assert register_response.status_code == 200
    assert register_response.json()["data"]["email"] == "user@example.com"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["data"]["email"] == "user@example.com"

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200

    after_logout = client.get("/api/v1/auth/me")
    assert after_logout.status_code == 401

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "StrongPass123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["data"]["email"] == "user@example.com"


def test_login_rejects_invalid_password(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "user2@example.com", "password": "StrongPass123", "name": "Test User 2"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "user2@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_change_password_flow(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "change@example.com", "password": "StrongPass123", "name": "Change User"},
    )

    change_response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "StrongPass123", "new_password": "NewStrongPass456"},
    )
    assert change_response.status_code == 200

    client.post("/api/v1/auth/logout")
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "change@example.com", "password": "NewStrongPass456"},
    )
    assert login_response.status_code == 200


def test_update_profile_name(client) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "profile@example.com", "password": "StrongPass123", "name": "Profile User"},
    )

    response = client.post("/api/v1/auth/profile", json={"name": "Updated User"})

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "Updated User"
