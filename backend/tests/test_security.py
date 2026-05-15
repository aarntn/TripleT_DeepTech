import pytest
from fastapi.testclient import TestClient

from core.security import sha256_text
from main import app, create_app

AUTH_HEADERS = {"Authorization": "Bearer test-api-key"}


def test_health_route_stays_public():
    response = TestClient(app).get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_missing_api_key_returns_401():
    response = TestClient(app).get("/api/market/hormuz")
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "UNAUTHORIZED", "message": "Unauthorized."}}


def test_invalid_api_key_returns_401():
    response = TestClient(app).get(
        "/api/market/hormuz",
        headers={"Authorization": "Bearer wrong-key"},
    )
    assert response.status_code == 401


def test_malformed_api_keys_return_401():
    client = TestClient(app)
    cases = [
        {"Authorization": ""},
        {"Authorization": "Bearer "},
        {"Authorization": "Basic test-api-key"},
        {"Authorization": f"Bearer {'x' * 5000}"},
        {"Authorization": "Bearer wrong\nkey"},
    ]

    for headers in cases:
        response = client.get("/api/market/hormuz", headers=headers)
        assert response.status_code == 401


def test_duplicate_authorization_headers_are_rejected():
    client = TestClient(app)
    for headers in [
        [("Authorization", "Bearer wrong"), ("Authorization", "Bearer test-api-key")],
        [("Authorization", "Bearer test-api-key"), ("Authorization", "Bearer wrong")],
    ]:
        response = client.get("/api/market/hormuz", headers=headers)
        assert response.status_code == 401


def test_multiple_active_keys_and_rotation(monkeypatch):
    monkeypatch.setenv("SOLARGUARD_API_KEYS", "old-key,new-key")
    client = TestClient(create_app())

    assert client.get("/api/market/hormuz", headers={"Authorization": "Bearer old-key"}).status_code == 200
    assert client.get("/api/market/hormuz", headers={"Authorization": "Bearer new-key"}).status_code == 200

    monkeypatch.setenv("SOLARGUARD_API_KEYS", "new-key")
    rotated_client = TestClient(create_app())
    assert rotated_client.get("/api/market/hormuz", headers={"Authorization": "Bearer old-key"}).status_code == 401
    assert rotated_client.get("/api/market/hormuz", headers={"Authorization": "Bearer new-key"}).status_code == 200


def test_hashed_api_key_auth(monkeypatch):
    monkeypatch.delenv("SOLARGUARD_API_KEYS", raising=False)
    monkeypatch.delenv("SOLARGUARD_API_KEY", raising=False)
    monkeypatch.setenv("SOLARGUARD_API_KEY_SHA256S", sha256_text("hashed-key"))
    client = TestClient(create_app())

    assert client.get("/api/market/hormuz", headers={"Authorization": "Bearer hashed-key"}).status_code == 200
    assert client.get("/api/market/hormuz", headers=AUTH_HEADERS).status_code == 401


def test_production_requires_hashed_api_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("SOLARGUARD_API_KEYS", raising=False)
    monkeypatch.delenv("SOLARGUARD_API_KEY", raising=False)
    monkeypatch.delenv("SOLARGUARD_API_KEY_SHA256S", raising=False)

    with pytest.raises(ValueError):
        create_app()


def test_docs_are_disabled_by_default():
    response = TestClient(app).get("/docs", headers=AUTH_HEADERS)
    assert response.status_code == 404


def test_cors_preflight_does_not_require_auth():
    response = TestClient(app).options(
        "/api/roi/calculate",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]


def test_security_headers_are_added():
    response = TestClient(app).get("/")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["cache-control"] == "no-store, no-cache"
    assert "geolocation=()" in response.headers["permissions-policy"]


def test_trusted_host_rejects_unknown_host():
    response = TestClient(app).get("/", headers={"Host": "evil.example"})
    assert response.status_code == 400


def test_cors_wildcard_configuration_is_rejected(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")
    with pytest.raises(ValueError):
        create_app()


def test_request_body_size_limit_returns_413(monkeypatch):
    monkeypatch.setenv("MAX_REQUEST_BYTES", "20")
    client = TestClient(create_app())
    response = client.post(
        "/api/roi/calculate",
        headers=AUTH_HEADERS,
        json={
            "mw": 5,
            "location": "malaysia",
            "tariff_rm_per_kwh": 0.39,
            "hormuz": False,
        },
    )
    assert response.status_code == 413


def test_rate_limit_returns_429(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    client = TestClient(create_app())

    first = client.get("/api/market/hormuz", headers=AUTH_HEADERS)
    second = client.get("/api/market/hormuz", headers=AUTH_HEADERS)

    assert first.status_code == 200
    assert second.status_code == 429


def test_rate_limit_bucket_includes_api_key(monkeypatch):
    monkeypatch.setenv("SOLARGUARD_API_KEYS", "key-one,key-two")
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    client = TestClient(create_app())

    first = client.get("/api/market/hormuz", headers={"Authorization": "Bearer key-one"})
    second = client.get("/api/market/hormuz", headers={"Authorization": "Bearer key-two"})
    third = client.get("/api/market/hormuz", headers={"Authorization": "Bearer key-one"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429


def test_forwarded_for_is_ignored_without_trusted_proxy(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    client = TestClient(create_app())

    first = client.get(
        "/api/market/hormuz",
        headers={**AUTH_HEADERS, "X-Forwarded-For": "203.0.113.10"},
    )
    second = client.get(
        "/api/market/hormuz",
        headers={**AUTH_HEADERS, "X-Forwarded-For": "203.0.113.11"},
    )

    assert first.status_code == 200
    assert second.status_code == 429


def test_forwarded_for_is_used_for_trusted_proxy(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    monkeypatch.setenv("TRUSTED_PROXY_IPS", "testclient")
    client = TestClient(create_app())

    first = client.get(
        "/api/market/hormuz",
        headers={**AUTH_HEADERS, "X-Forwarded-For": "203.0.113.10"},
    )
    second = client.get(
        "/api/market/hormuz",
        headers={**AUTH_HEADERS, "X-Forwarded-For": "203.0.113.11"},
    )

    assert first.status_code == 200
    assert second.status_code == 200


def test_request_id_is_returned_and_sanitized():
    client = TestClient(app)
    response = client.get("/", headers={"X-Request-ID": "demo-request-1"})
    assert response.headers["x-request-id"] == "demo-request-1"

    response = client.get("/", headers={"X-Request-ID": "bad request id"})
    assert response.headers["x-request-id"] != "bad request id"
    assert len(response.headers["x-request-id"]) == 32


def test_extra_request_fields_return_422():
    response = TestClient(app).post(
        "/api/roi/calculate",
        headers=AUTH_HEADERS,
        json={
            "mw": 5,
            "location": "malaysia",
            "tariff_rm_per_kwh": 0.39,
            "hormuz": False,
            "unexpected": "value",
        },
    )
    assert response.status_code == 422
    assert response.json() == {
        "error": {"code": "INVALID_REQUEST", "message": "Request body is invalid."}
    }
