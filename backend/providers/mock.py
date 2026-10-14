"""
providers/mock.py — Mock AI provider for testing and no-key development.

Returns a pre-built sample result instantly (with a tiny simulated delay)
and always sets mock=True so the frontend shows the mock banner.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict

MOCK_RESULT: Dict[str, Any] = {
    "summary": (
        "The team synced on the Smart Meeting Action Extractor project. "
        "Sai Harish is responsible for building the action-item dashboard by Friday, "
        "pending API details from Abhilash. Abhilash will test the Qualcomm AI endpoint "
        "today with a Thursday deadline for full integration. Preetham is investigating "
        "an authentication bug with no deadline set. The team agreed on a navy-and-violet "
        "colour scheme. Key risks include potential API rate limits during the demo, and "
        "several architectural decisions remain unresolved."
    ),
    "decisions": [
        {
            "description": "Use a clean navy and violet colour palette for the application interface.",
            "status": "confirmed",
            "evidence": "The team agreed to use a clean navy and violet colour palette.",
        },
        {
            "description": "Prepare an offline fallback using cached sample data to mitigate API rate limit risks.",
            "status": "proposed",
            "evidence": "The team should prepare an offline fallback using cached sample data.",
        },
    ],
    "action_items": [
        {
            "task": "Build the action-item dashboard",
            "owner": "Sai Harish",
            "deadline": "Friday",
            "priority": "high",
            "status": "open",
            "evidence": "Sai Harish will build the action-item dashboard by Friday.",
            "missing_information": ["Requires API integration details from Abhilash before frontend can be connected"],
            "review_status": "needs_review",
        },
        {
            "task": "Test the Qualcomm Cloud AI endpoint",
            "owner": "Abhilash",
            "deadline": "Today",
            "priority": "high",
            "status": "open",
            "evidence": "Abhilash will test the Qualcomm Cloud AI endpoint today.",
            "missing_information": [],
            "review_status": "needs_review",
        },
        {
            "task": "Complete full API integration",
            "owner": "Abhilash",
            "deadline": "End of day Thursday",
            "priority": "high",
            "status": "open",
            "evidence": "The deadline for full API integration is end of day Thursday.",
            "missing_information": [],
            "review_status": "needs_review",
        },
        {
            "task": "Investigate the authentication bug",
            "owner": "Preetham",
            "deadline": "Not specified",
            "priority": "medium",
            "status": "open",
            "evidence": "Preetham will investigate the authentication bug.",
            "missing_information": ["Deadline not set — depends on root cause complexity"],
            "review_status": "needs_review",
        },
        {
            "task": "Prepare sample screenshots of the design",
            "owner": "Divya",
            "deadline": "Wednesday",
            "priority": "low",
            "status": "open",
            "evidence": "Divya will prepare sample screenshots by Wednesday.",
            "missing_information": [],
            "review_status": "needs_review",
        },
    ],
    "risks": [
        {
            "description": "Qualcomm Cloud AI may impose rate limits during the hackathon live demo.",
            "severity": "high",
            "evidence": "Qualcomm Cloud AI may impose rate limits during the hackathon demo.",
        }
    ],
    "missing_information": [
        "No decision made on REST vs GraphQL for the API architecture",
        "Database schema for storing meeting results is not yet finalised",
        "No deadline assigned to the authentication bug investigation",
    ],
    "open_questions": [
        "Should the API use REST or GraphQL?",
        "What is the database schema for storing meeting results?",
    ],
    "mock": True,
    "model_used": "mock",
}


class MockProvider:
    """Simulates an AI provider. Used when no API key is configured."""

    async def analyze(self, notes: str) -> Dict[str, Any]:  # noqa: ARG002
        await asyncio.sleep(0.3)  # small delay to simulate network
        return MOCK_RESULT.copy()
