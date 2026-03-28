from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["site"])


@router.get(
    "/site-config",
    summary="Site configuration",
    description="Return public site configuration such as the site name.",
)
async def get_site_config():
    return {"siteName": settings.SKILL_SITE_NAME}
