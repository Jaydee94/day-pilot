"""
Day Pilot – FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.api.voice import voice_router
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(voice_router, prefix="/api")


@app.get("/", tags=["health"])
def root():
    return {"service": "Day Pilot API", "status": "ok"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
