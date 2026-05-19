"""
Day Pilot – FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.settings_router import settings_router
from app.api.voice import voice_router
from app.api.shopping_router import shopping_router
from app.api.family_router import family_router
from app.config import settings
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Day Pilot API",
    description=(
        "AI-powered daily planner: calendar sync, weather, to-dos, "
        "birthdays, push notifications and voice control."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

def _parse_cors_origins() -> list[str]:
    raw = (settings.CORS_ALLOW_ORIGINS or "").strip()
    if not raw:
        return ["http://localhost:3000", "http://localhost:5173"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router, prefix="/api")
app.include_router(settings_router, prefix="/api")
if settings.VOICE_WEBHOOK_SECRET:
    app.include_router(voice_router, prefix="/api")
else:
    logger = logging.getLogger(__name__)
    logger.warning(
        "VOICE_WEBHOOK_SECRET is empty — voice webhook endpoints are DISABLED. "
        "Set a strong secret in .env (e.g. openssl rand -hex 32) to enable them."
    )
app.include_router(shopping_router, prefix="/api")
app.include_router(family_router, prefix="/api")


@app.get("/", tags=["health"])
def root():
    return {"service": "Day Pilot API", "status": "ok"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
