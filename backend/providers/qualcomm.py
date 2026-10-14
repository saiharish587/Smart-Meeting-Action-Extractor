"""
providers/qualcomm.py — Real Qualcomm Cirrascale AI Inference Suite provider.

Endpoint: POST https://aisuite.cirrascale.com/apis/v2/chat/completions
Auth:     Bearer <API_KEY>
Format:   OpenAI-compatible chat completions (non-streaming)
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict

import httpx

from backend.prompt import SYSTEM_PROMPT


# ── Custom exceptions ─────────────────────────────────────────────────────────

class QualcommAuthError(Exception):
    """Raised when the API key is invalid (HTTP 401)."""


class QualcommRateLimitError(Exception):
    """Raised when the provider returns HTTP 429."""


class QualcommProviderError(Exception):
    """Raised for 5xx errors or unexpected provider failures."""


class QualcommTimeoutError(Exception):
    """Raised when the request exceeds the configured timeout."""


class QualcommParseError(Exception):
    """Raised when the model response does not contain valid JSON."""


# ── Provider ──────────────────────────────────────────────────────────────────

class QualcommProvider:
    """Async HTTP adapter for the Qualcomm Cirrascale AI Inference Suite."""

    def __init__(self, api_key: str, endpoint: str, model: str, timeout_s: int = 90) -> None:
        self._api_key  = api_key
        self._endpoint = endpoint.rstrip("/")
        self._model    = model
        self._timeout  = timeout_s

    async def analyze(self, notes: str) -> Dict[str, Any]:
        """
        Call the Qualcomm chat completions endpoint with the extraction prompt.

        Returns a dict that conforms to the AnalysisResponse schema.
        Raises specific exceptions for auth errors, rate limits, timeouts, and parse failures.
        """
        url = f"{self._endpoint}/chat/completions"
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": notes},
            ],
            "stream": False,
            "temperature": 0.1,   # low temperature for deterministic extraction
            "max_tokens": 4096,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type":  "application/json",
            "Accept":        "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise QualcommTimeoutError(
                f"Request to Qualcomm AI timed out after {self._timeout}s."
            ) from exc
        except httpx.RequestError as exc:
            raise QualcommProviderError(
                f"Network error when contacting Qualcomm AI: {exc}"
            ) from exc

        # ── Status-code handling ───────────────────────────────────────────────
        if response.status_code == 401:
            raise QualcommAuthError(
                "The Qualcomm API key is invalid or expired. "
                "Check QUALCOMM_API_KEY in backend/.env."
            )
        if response.status_code == 429:
            raise QualcommRateLimitError(
                "Qualcomm AI rate limit reached. Please wait before retrying."
            )
        if response.status_code >= 500:
            raise QualcommProviderError(
                f"Qualcomm AI returned a server error (HTTP {response.status_code}). "
                "The service may be temporarily unavailable."
            )
        if not response.is_success:
            raise QualcommProviderError(
                f"Qualcomm AI returned HTTP {response.status_code}: {response.text[:300]}"
            )

        # ── Parse response ────────────────────────────────────────────────────
        try:
            data = response.json()
        except Exception as exc:
            raise QualcommParseError(
                "Qualcomm AI returned a non-JSON response body."
            ) from exc

        # Extract the model's text content (OpenAI-compatible format)
        content = ""
        try:
            choices = data.get("choices", [])
            if choices:
                msg = choices[0].get("message", {})
                raw_content = msg.get("content", "")
                # Content can be a string or Qualcomm's Content enum variant
                if isinstance(raw_content, str):
                    content = raw_content
                elif isinstance(raw_content, dict):
                    # Handle {"String": "..."} variant
                    content = raw_content.get("String", "") or str(raw_content)
                else:
                    content = str(raw_content)
        except (KeyError, IndexError, TypeError) as exc:
            raise QualcommParseError(
                f"Unexpected response structure from Qualcomm AI: {exc}"
            ) from exc

        if not content.strip():
            raise QualcommParseError("Qualcomm AI returned an empty response content.")

        # ── Extract JSON from content ──────────────────────────────────────────
        # The model may wrap output in markdown fences despite instructions.
        extracted = _extract_json(content)
        if extracted is None:
            raise QualcommParseError(
                "AI response did not contain a valid JSON object. "
                f"Response preview: {content[:200]}"
            )

        extracted["mock"]       = False
        extracted["model_used"] = self._model
        return extracted


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> Dict[str, Any] | None:
    """
    Try to extract a JSON object from text that may contain markdown fences or prose.
    Returns the parsed dict or None if no valid JSON object is found.
    """
    # 1. Try the entire text first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Find the outermost { ... } by bracket matching
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    end   = -1
    for i, ch in enumerate(text[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
