"""Health endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    """Verify health endpoint returns standardized success payload.

    Returns:
        None: This test validates HTTP status and response body fields.
    """
    client = TestClient(app)
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["service"] == "NewsIntel API"
