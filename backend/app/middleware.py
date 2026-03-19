import logging
import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger("wiclawhub")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s %d %.1fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory per-IP rate limiter using a sliding window."""

    def __init__(self, app, read_limit: int = 120, write_limit: int = 30, window: int = 60):  # type: ignore[no-untyped-def]
        super().__init__(app)
        self.read_limit = read_limit
        self.write_limit = write_limit
        self.window = window
        self._hits: dict[str, list[float]] = defaultdict(list)

    def _clean(self, key: str, now: float) -> list[float]:
        cutoff = now - self.window
        self._hits[key] = [t for t in self._hits[key] if t > cutoff]
        return self._hits[key]

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        client_ip = request.client.host if request.client else "unknown"
        is_write = request.method in ("POST", "PUT", "PATCH", "DELETE")
        limit = self.write_limit if is_write else self.read_limit
        key = f"{client_ip}:{'w' if is_write else 'r'}"

        now = time.time()
        hits = self._clean(key, now)

        if len(hits) >= limit:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )

        self._hits[key].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - len(hits) - 1))
        return response
