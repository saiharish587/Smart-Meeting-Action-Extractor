"""
main.py — FastAPI application entry point for Smart Meeting Action Extractor backend.

Run with:
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routers.analysis import router

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:  # noqa: ARG001
    mode  = "MOCK" if settings.use_mock else "QUALCOMM"
    model = "mock"  if settings.use_mock else settings.qualcomm_model
    logger.info("=" * 60)
    logger.info("Smart Meeting Action Extractor — Backend starting")
    logger.info("  Mode  : %s", mode)
    logger.info("  Model : %s", model)
    if settings.use_mock:
        logger.warning(
            "  ⚠  No QUALCOMM_API_KEY found — running in MOCK MODE. "
            "Add QUALCOMM_API_KEY to backend/.env for real AI inference."
        )
    logger.info("  CORS  : %s", settings.origins_list)
    logger.info("=" * 60)
    yield
    logger.info("Backend shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Smart Meeting Action Extractor API",
    description = "Converts unstructured meeting notes into structured intelligence using Qualcomm AI.",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the frontend whether opened via Live Server (http://localhost:5500)
# or directly as a file (origin: null).

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.origins_list,
    allow_credentials = False,
    allow_methods     = ["GET", "POST", "OPTIONS"],
    allow_headers     = ["Content-Type", "Accept"],
)

# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(router)
