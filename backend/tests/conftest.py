"""
tests/conftest.py — pytest fixtures for Smart Meeting Action Extractor backend tests.
All tests run without a real API key using the mock provider and httpx.AsyncClient.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from backend.main import app


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
