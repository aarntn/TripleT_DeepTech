from http import HTTPStatus
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    413: "REQUEST_TOO_LARGE",
    422: "INVALID_REQUEST",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}

ERROR_MESSAGES = {
    400: "Request is invalid.",
    401: "Unauthorized.",
    403: "Forbidden.",
    404: "Resource not found.",
    413: "Request body too large.",
    422: "Request body is invalid.",
    429: "Rate limit exceeded.",
    500: "Internal server error.",
    503: "Service unavailable.",
}


def error_payload(code: str, message: str) -> dict[str, dict[str, str]]:
    return {"error": {"code": code, "message": message}}


def error_response(
    status_code: int,
    code: str | None = None,
    message: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=error_payload(
            code or ERROR_CODES.get(status_code, "ERROR"),
            message or ERROR_MESSAGES.get(status_code, "Request failed."),
        ),
        headers=headers,
    )


def status_code_name(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Request failed"


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    status_code = int(exc.status_code)
    message = exc.detail if isinstance(exc.detail, str) else None
    if not message:
        message = ERROR_MESSAGES.get(status_code, status_code_name(status_code))
    return error_response(
        status_code=status_code,
        code=ERROR_CODES.get(status_code, "ERROR"),
        message=message,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return error_response(
        status_code=422,
        code=ERROR_CODES[422],
        message=ERROR_MESSAGES[422],
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response(
        status_code=500,
        code=ERROR_CODES[500],
        message=ERROR_MESSAGES[500],
    )
