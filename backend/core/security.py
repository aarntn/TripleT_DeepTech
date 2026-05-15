import hashlib
import hmac
import json
import logging
import os
import re
import time
import uuid
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from core.errors import error_payload
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger(__name__)
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,64}$")
AUTHORIZATION_HEADER_LIMIT = 4096


class RequestBodyTooLarge(Exception):
    """Raised when a streaming request body exceeds the configured limit."""


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    value = int(raw)
    if value < 0:
        raise ValueError(f"{name} must be zero or greater.")
    return value


def env_csv(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def sanitize_log_value(value: Any, max_length: int = 120) -> str:
    text = str(value)
    cleaned = "".join(
        ch if ch.isprintable() and ch not in {"\r", "\n", "\t"} else "_"
        for ch in text
    )
    if len(cleaned) <= max_length:
        return cleaned
    return f"{cleaned[:max_length]}..."


def sha256_file(path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def valid_hash(value: str) -> bool:
    return bool(re.fullmatch(r"[a-fA-F0-9]{64}", value))


@dataclass(frozen=True)
class AuthResult:
    authenticated: bool
    key_fingerprint: str = "anonymous"


@dataclass(frozen=True)
class SecurityConfig:
    app_env: str
    api_key_hashes: tuple[str, ...]
    max_request_bytes: int
    default_rate_limit_per_minute: int
    sensitive_rate_limit_per_minute: int
    trusted_hosts: list[str]
    trusted_proxy_ips: list[str]
    cors_origins: list[str]
    enable_hsts: bool

    @classmethod
    def from_env(cls) -> "SecurityConfig":
        app_env = os.getenv("APP_ENV", "development").strip().lower() or "development"
        cors_origins = env_csv("CORS_ORIGINS", "http://localhost:5173")
        if "*" in cors_origins:
            raise ValueError("CORS_ORIGINS must not contain '*' when credentials are enabled.")

        api_key_hashes = cls._api_key_hashes_from_env(app_env)
        if app_env == "production" and not env_csv("SOLARGUARD_API_KEY_SHA256S", ""):
            raise ValueError("SOLARGUARD_API_KEY_SHA256S is required when APP_ENV=production.")

        return cls(
            app_env=app_env,
            api_key_hashes=api_key_hashes,
            max_request_bytes=env_int("MAX_REQUEST_BYTES", 65_536),
            default_rate_limit_per_minute=env_int("RATE_LIMIT_PER_MINUTE", 120),
            sensitive_rate_limit_per_minute=env_int("SENSITIVE_RATE_LIMIT_PER_MINUTE", 20),
            trusted_hosts=env_csv("TRUSTED_HOSTS", "localhost,127.0.0.1,testserver"),
            trusted_proxy_ips=env_csv("TRUSTED_PROXY_IPS", ""),
            cors_origins=cors_origins,
            enable_hsts=env_bool("ENABLE_HSTS", False),
        )

    @staticmethod
    def _api_key_hashes_from_env(app_env: str) -> tuple[str, ...]:
        configured_hashes = env_csv("SOLARGUARD_API_KEY_SHA256S", "")
        invalid_hashes = [value for value in configured_hashes if not valid_hash(value)]
        if invalid_hashes:
            raise ValueError("SOLARGUARD_API_KEY_SHA256S must contain SHA-256 hex digests.")

        plaintext_keys = env_csv("SOLARGUARD_API_KEYS", "")
        legacy_key = os.getenv("SOLARGUARD_API_KEY")
        if legacy_key and app_env != "production":
            plaintext_keys.append(legacy_key)

        hashes = {value.lower() for value in configured_hashes}
        hashes.update(sha256_text(value) for value in plaintext_keys if value)
        return tuple(sorted(hashes))


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp, enable_hsts: bool = False) -> None:
        self.app = app
        self.enable_hsts = enable_hsts

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("X-Content-Type-Options", "nosniff")
                headers.setdefault("X-Frame-Options", "DENY")
                headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
                headers.setdefault("Cache-Control", "no-store, no-cache")
                headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
                if self.enable_hsts:
                    headers.setdefault(
                        "Strict-Transport-Security",
                        "max-age=31536000; includeSubDomains",
                    )
            await send(message)

        await self.app(scope, receive, send_with_headers)


class AppSecurityMiddleware:
    _SENSITIVE_ROUTES = {
        ("POST", "/api/sensor/classify"),
        ("POST", "/api/roi/calculate"),
    }

    def __init__(self, app: ASGIApp, config: SecurityConfig) -> None:
        self.app = app
        self.config = config
        self._hits: dict[tuple[str, str, str], deque[float]] = defaultdict(deque)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        method = scope["method"].upper()
        path = scope["path"]
        request_id = self._request_id(headers)
        scope.setdefault("state", {})["request_id"] = request_id
        client_ip = self._client_ip(scope, headers)
        start = time.perf_counter()
        response_status: int | None = None
        response_started = False

        async def send_with_status(message: Message) -> None:
            nonlocal response_status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                response_status = int(message["status"])
                MutableHeaders(scope=message).setdefault("X-Request-ID", request_id)
            await send(message)

        async def send_json(status_code: int, code: str, message: str) -> None:
            nonlocal response_status, response_started
            body = json.dumps(error_payload(code, message)).encode("utf-8")
            response_started = True
            response_status = status_code
            await send({
                "type": "http.response.start",
                "status": status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode("ascii")),
                    (b"x-request-id", request_id.encode("ascii")),
                ],
            })
            await send({"type": "http.response.body", "body": body})

        try:
            content_length = headers.get("content-length")
            if content_length and self.config.max_request_bytes:
                try:
                    if int(content_length) > self.config.max_request_bytes:
                        await send_json(413, "REQUEST_TOO_LARGE", "Request body too large.")
                        return
                except ValueError:
                    await send_json(400, "BAD_REQUEST", "Invalid Content-Length header.")
                    return

            if not self._is_public(method, path):
                auth_result = self._authenticate(scope)
                if not auth_result.authenticated:
                    await send_json(401, "UNAUTHORIZED", "Unauthorized.")
                    return
                if self._is_rate_limited(
                    client_ip,
                    auth_result.key_fingerprint,
                    method,
                    path,
                ):
                    await send_json(429, "RATE_LIMITED", "Rate limit exceeded.")
                    return

            limited_receive = self._limited_receive(receive)
            try:
                await self.app(scope, limited_receive, send_with_status)
            except RequestBodyTooLarge:
                if not response_started:
                    await send_json(413, "REQUEST_TOO_LARGE", "Request body too large.")
                    return
                raise
        finally:
            latency_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "%s %s %s %.2fms %s request_id=%s",
                method,
                sanitize_log_value(path),
                response_status if response_status is not None else 0,
                latency_ms,
                sanitize_log_value(client_ip),
                sanitize_log_value(request_id),
            )

    def _limited_receive(self, receive: Receive) -> Callable[[], Awaitable[Message]]:
        received = 0

        async def receive_with_limit() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request" and self.config.max_request_bytes:
                body = message.get("body", b"")
                received += len(body)
                if received > self.config.max_request_bytes:
                    raise RequestBodyTooLarge()
            return message

        return receive_with_limit

    def _is_public(self, method: str, path: str) -> bool:
        return method == "OPTIONS" or (method == "GET" and path == "/")

    def _authenticate(self, scope: Scope) -> AuthResult:
        if not self.config.api_key_hashes:
            return AuthResult(False)
        authorization_headers = self._raw_header_values(scope, b"authorization")
        if len(authorization_headers) != 1:
            return AuthResult(False)

        authorization = authorization_headers[0]
        if len(authorization) > AUTHORIZATION_HEADER_LIMIT:
            return AuthResult(False)
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return AuthResult(False)

        token_hash = sha256_text(token)
        for configured_hash in self.config.api_key_hashes:
            if hmac.compare_digest(token_hash, configured_hash):
                return AuthResult(True, token_hash[:16])
        return AuthResult(False)

    def _is_rate_limited(
        self,
        client_ip: str,
        key_fingerprint: str,
        method: str,
        path: str,
    ) -> bool:
        limit = (
            self.config.sensitive_rate_limit_per_minute
            if (method, path) in self._SENSITIVE_ROUTES
            else self.config.default_rate_limit_per_minute
        )
        if limit == 0:
            return False

        key = (
            client_ip,
            key_fingerprint,
            "sensitive" if (method, path) in self._SENSITIVE_ROUTES else "default",
        )
        now = time.monotonic()
        window_start = now - 60
        hits = self._hits[key]
        while hits and hits[0] <= window_start:
            hits.popleft()
        if len(hits) >= limit:
            return True
        hits.append(now)
        return False

    def _client_ip(self, scope: Scope, headers: Headers) -> str:
        client = scope.get("client")
        if not client:
            return "unknown"
        direct_ip = str(client[0])
        if direct_ip in self.config.trusted_proxy_ips:
            forwarded_for = headers.get("x-forwarded-for", "")
            first_hop = forwarded_for.split(",", 1)[0].strip()
            if first_hop:
                return sanitize_log_value(first_hop, max_length=64)
        return direct_ip

    def _request_id(self, headers: Headers) -> str:
        incoming = headers.get("x-request-id", "")
        if REQUEST_ID_PATTERN.fullmatch(incoming):
            return incoming
        return uuid.uuid4().hex

    def _raw_header_values(self, scope: Scope, name: bytes) -> list[str]:
        values = []
        for raw_name, raw_value in scope.get("headers", []):
            if raw_name.lower() == name:
                values.append(raw_value.decode("latin-1"))
        return values
