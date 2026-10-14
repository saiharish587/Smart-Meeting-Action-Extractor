"""
tests/conftest.py — pytest fixtures for Smart Meeting Action Extractor backend tests.
All tests run without a real API key using the mock provider and httpx.AsyncClient.

MOCK_MODE is forced via environment variable before any backend module is imported,
so the Settings singleton always reports use_mock=True during the test session,
even when a real .env file is present in the developer's environment.
"""
from __future__ import annotations

import os

# Force mock mode before importing any backend module.
# config.py reads env vars at import time — this must come first.
os.environ["MOCK_MODE"] = "true"

import pytest                                         # noqa: E402
import pytest_asyncio                                 # noqa: E402
from httpx import ASGITransport, AsyncClient          # noqa: E402

from backend.main import app                          # noqa: E402


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    """Async test client wired to the FastAPI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_notes() -> str:
    return (
        "Project Sync — 14 October 2026\n"
        "Attendees: Sai Harish, Abhilash\n\n"
        "1. Sai Harish will build the dashboard by Friday.\n"
        "2. Abhilash will test the Qualcomm endpoint today.\n"
        "3. The team agreed to use a navy colour palette.\n"
        "4. Risk: API rate limits may affect the live demo.\n"
        "5. Open: No decision on REST vs GraphQL."
    )


@pytest.fixture
def long_notes() -> str:
    return "A" * 16_001  # exceeds max_notes_chars=16000
