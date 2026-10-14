"""
tests/test_api.py — Automated tests for the Smart Meeting Action Extractor backend.

All tests run in mock mode (no real API key required).
Run with:  pytest tests/ -v  (from the backend/ directory after activating .venv)
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from backend.providers.mock import MOCK_RESULT
from backend.providers.qualcomm import (
    QualcommAuthError,
    QualcommParseError,
    QualcommProviderError,
    QualcommRateLimitError,
    QualcommTimeoutError,
)


# ════════════════════════════════════════════════════════════════════════════
# Health endpoint
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient) -> None:
    """GET /health should return 200 with status=ok."""
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "mode"  in body
    assert "model" in body


@pytest.mark.asyncio
async def test_health_reports_mock_mode(client: AsyncClient) -> None:
    """In test environment (no API key), mode should be 'mock'."""
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "mock"


# ════════════════════════════════════════════════════════════════════════════
# Analyse endpoint — happy path (mock mode)
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_analyze_returns_200_with_valid_notes(client: AsyncClient, sample_notes: str) -> None:
    """POST /api/v1/meetings/analyze with valid notes should return 200."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": sample_notes},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_analyze_response_schema(client: AsyncClient, sample_notes: str) -> None:
    """Response must include all required top-level fields."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": sample_notes},
    )
    body = response.json()
    assert isinstance(body["summary"],             str)
    assert isinstance(body["decisions"],           list)
    assert isinstance(body["action_items"],        list)
    assert isinstance(body["risks"],               list)
    assert isinstance(body["missing_information"], list)
    assert isinstance(body["open_questions"],      list)
    assert isinstance(body["mock"],                bool)


@pytest.mark.asyncio
async def test_analyze_mock_flag_is_true(client: AsyncClient, sample_notes: str) -> None:
    """Mock mode should set mock=True in the response."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": sample_notes},
    )
    assert response.json()["mock"] is True


@pytest.mark.asyncio
async def test_analyze_action_items_have_required_fields(client: AsyncClient, sample_notes: str) -> None:
    """Each action item must have task, owner, deadline, priority, status, review_status."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": sample_notes},
    )
    items = response.json()["action_items"]
    assert len(items) > 0
    for item in items:
        assert "task"          in item
        assert "owner"         in item
        assert "deadline"      in item
        assert "priority"      in item
        assert "status"        in item
        assert "review_status" in item


# ════════════════════════════════════════════════════════════════════════════
# Analyse endpoint — input validation
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_analyze_rejects_empty_notes(client: AsyncClient) -> None:
    """Empty notes should return 422."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": ""},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_rejects_whitespace_only_notes(client: AsyncClient) -> None:
    """Whitespace-only notes should return 422."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": "   \n\t  "},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_rejects_notes_over_limit(client: AsyncClient, long_notes: str) -> None:
    """Notes exceeding 16 000 chars should return 422."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": long_notes},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_rejects_missing_notes_field(client: AsyncClient) -> None:
    """Missing 'notes' field should return 422."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={},
    )
    assert response.status_code == 422


# ════════════════════════════════════════════════════════════════════════════
# Analyse endpoint — Qualcomm provider error handling
# ════════════════════════════════════════════════════════════════════════════

class _FakeSettings:
    """Minimal settings stub that routes through the Qualcomm provider."""
    use_mock           = False
    qualcomm_api_key   = "test_key"
    qualcomm_endpoint  = "https://aisuite.cirrascale.com/apis/v2"
    qualcomm_model     = "Llama-3.1-8B"
    request_timeout_s  = 90
    max_notes_chars    = 16_000


def _qualcomm_raises(exc: Exception):
    """Return a context manager that patches the router to use Qualcomm provider and raises exc."""
    import contextlib

    @contextlib.asynccontextmanager
    async def _ctx():
        with (
            patch("backend.routers.analysis.settings", new=_FakeSettings()),
            patch(
                "backend.providers.qualcomm.QualcommProvider.analyze",
                new_callable=AsyncMock,
                side_effect=exc,
            ),
        ):
            yield

    return _ctx()


@pytest.mark.asyncio
async def test_analyze_auth_error_returns_401(client: AsyncClient, sample_notes: str) -> None:
    """QualcommAuthError → HTTP 401."""
    async with _qualcomm_raises(QualcommAuthError("Invalid key")):
        response = await client.post(
            "/api/v1/meetings/analyze",
            json={"notes": sample_notes},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_analyze_rate_limit_returns_429(client: AsyncClient, sample_notes: str) -> None:
    """QualcommRateLimitError → HTTP 429."""
    async with _qualcomm_raises(QualcommRateLimitError("Rate limit")):
        response = await client.post(
            "/api/v1/meetings/analyze",
            json={"notes": sample_notes},
        )
    assert response.status_code == 429


@pytest.mark.asyncio
async def test_analyze_timeout_returns_504(client: AsyncClient, sample_notes: str) -> None:
    """QualcommTimeoutError → HTTP 504."""
    async with _qualcomm_raises(QualcommTimeoutError("Timed out")):
        response = await client.post(
            "/api/v1/meetings/analyze",
            json={"notes": sample_notes},
        )
    assert response.status_code == 504


@pytest.mark.asyncio
async def test_analyze_provider_error_returns_502(client: AsyncClient, sample_notes: str) -> None:
    """QualcommProviderError → HTTP 502."""
    async with _qualcomm_raises(QualcommProviderError("Server error")):
        response = await client.post(
            "/api/v1/meetings/analyze",
            json={"notes": sample_notes},
        )
    assert response.status_code == 502


@pytest.mark.asyncio
async def test_analyze_parse_error_returns_502(client: AsyncClient, sample_notes: str) -> None:
    """QualcommParseError → HTTP 502."""
    async with _qualcomm_raises(QualcommParseError("Bad JSON")):
        response = await client.post(
            "/api/v1/meetings/analyze",
            json={"notes": sample_notes},
        )
    assert response.status_code == 502


# ════════════════════════════════════════════════════════════════════════════
# Security: no credentials in response
# ════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_api_key_not_in_response(client: AsyncClient, sample_notes: str) -> None:
    """The API key must never appear in any response body."""
    response = await client.post(
        "/api/v1/meetings/analyze",
        json={"notes": sample_notes},
    )
    text = response.text
    # Even in mock mode there is no real key, but verify anyway
    assert "QUALCOMM_API_KEY" not in text
    assert "your_api_key_here" not in text
