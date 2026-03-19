from fastapi import APIRouter

from app.routers.skills import router as skills_router
from app.routers.search import router as search_router
from app.routers.resolve import router as resolve_router
from app.routers.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(skills_router)
api_router.include_router(search_router)
api_router.include_router(resolve_router)
api_router.include_router(auth_router)

__all__ = ["api_router"]
