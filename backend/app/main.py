import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.errors import register_error_handlers
from app.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.routers import api_router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    await init_db()
    yield


app = FastAPI(
    title="ClawHub API",
    version="1.0.0",
    description="Public REST API for skills. Rate limits: read 120/min per IP + 600/min per key; write 30/min per IP + 120/min per key.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- Middleware (order matters: last added = first executed) ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    RateLimitMiddleware,
    read_limit=settings.RATE_LIMIT_READ,
    write_limit=settings.RATE_LIMIT_WRITE,
)

app.add_middleware(RequestLoggingMiddleware)

# --- Error handlers ---

register_error_handlers(app)

# --- Routes ---

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# --- Static file serving (uploaded avatars, etc.) ---
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok"}


# --- Custom OpenAPI schema matching ClawHub spec format ---

def custom_openapi():  # type: ignore[no-untyped-def]
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title="ClawHub API",
        version="1.0.0",
        description="Public REST API for skills. Rate limits: read 120/min per IP + 600/min per key; write 30/min per IP + 120/min per key.",
        routes=app.routes,
    )
    schema["openapi"] = "3.1.0"
    schema["servers"] = [{"url": settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:8000"}]
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["bearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "API token",
    }
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore[method-assign]
