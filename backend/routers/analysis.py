"""
routers/analysis.py — API routes for meeting note analysis.

Routes:
  GET  /health                     → health check
  POST /api/v1/meetings/analyze    → analyse meeting notes with AI
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status

from backend.config import settings
from backend.models import AnalysisResponse, AnalyzeRequest
from backend.providers.mock import MockProvider
from backend.redaction import redact_pii
from backend.providers.qualcomm import (
    QualcommAuthError,
    QualcommParseError,
    QualcommProvider,
    QualcommProviderError,
    QualcommRateLimitError,
    QualcommTimeoutError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health() -> Dict[str, Any]:
    """Simple health check. Returns current mode and model."""
    return {
        "status": "ok",
        "mode":   "mock" if settings.use_mock else "qualcomm",
        "model":  "mock" if settings.use_mock else settings.qualcomm_model,
    }


# ── Analysis ──────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/meetings/analyze",
    response_model=AnalysisResponse,
    summary="Analyse meeting notes",
    description="Submit raw meeting notes and receive structured AI-extracted intelligence.",
)
async def analyze_meeting(body: AnalyzeRequest) -> AnalysisResponse:
    """
    Analyse meeting notes using either the real Qualcomm AI provider or
    the mock provider (when no API key is configured).
    """
    # Guard: length limit
    if len(body.notes) > settings.max_notes_chars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Meeting notes exceed the maximum allowed length "
                f"({settings.max_notes_chars:,} characters). "
                f"Your input is {len(body.notes):,} characters."
            ),
        )

    # Select provider
    if settings.use_mock:
        provider = MockProvider()
        logger.info("Using mock provider (no API key configured).")
    else:
        provider = QualcommProvider(
            api_key   = settings.qualcomm_api_key,  # type: ignore[arg-type]
            endpoint  = settings.qualcomm_endpoint,
            model     = settings.qualcomm_model,
            timeout_s = settings.request_timeout_s,
        )
        logger.info("Using Qualcomm provider (model=%s).", settings.qualcomm_model)

    # Redact PII before sending to AI provider (best-effort; see redaction.py)
    # Do NOT log the original or redacted transcript content.
    redacted_notes = redact_pii(body.notes)
    logger.info(
        "Analysis request: provider=%s notes_len=%d redacted_len=%d",
        "mock" if settings.use_mock else "qualcomm",
        len(body.notes),
        len(redacted_notes),
    )

    # Call provider
    try:
        raw: Dict[str, Any] = await provider.analyze(redacted_notes)
    except QualcommAuthError as exc:
        logger.error("Qualcomm auth error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except QualcommRateLimitError as exc:
        logger.warning("Qualcomm rate limit: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(exc),
        ) from exc
    except QualcommTimeoutError as exc:
        logger.error("Qualcomm timeout: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc
    except QualcommParseError as exc:
        logger.error("Qualcomm parse error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except QualcommProviderError as exc:
        logger.error("Qualcomm provider error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        # Catch-all: never leak stack traces or credentials
        logger.error("Unexpected error during analysis: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        ) from exc

    # Validate with Pydantic (coerce any extra / missing fields gracefully)
    try:
        result = AnalysisResponse(**raw)
    except Exception as exc:
        logger.error("Response validation error: %s | raw keys: %s", exc, list(raw.keys()))
        # Best-effort: return what we can
        result = AnalysisResponse(
            summary             = raw.get("summary", "No summary available."),
            decisions           = raw.get("decisions", []),
            action_items        = raw.get("action_items", []),
            risks               = raw.get("risks", []),
            missing_information = raw.get("missing_information", []),
            open_questions      = raw.get("open_questions", []),
            mock                = raw.get("mock", False),
            model_used          = raw.get("model_used"),
        )

    return result
