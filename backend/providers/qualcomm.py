"""
providers/qualcomm.py — Qualcomm Cirrascale AI Inference Suite provider.

Uses the /v2/completions (text completion) endpoint because the chat completions
endpoint on this deployment auto-triggers tool_calls mode, returning empty content.

The prompt is formatted using Llama's [INST] format for instruction-tuned models.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict

import httpx

from backend.prompt import build_completion_prompt


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
    """
    Async HTTP adapter for the Qualcomm Cirrascale AI Inference Suite.

    Uses /v2/completions (raw text completion) because the /v2/chat/completions
    endpoint on this deployment auto-triggers tool-calling mode, producing empty
    message content regardless of the request payload.
    """

    def __init__(self, api_key: str, endpoint: str, model: str, timeout_s: int = 90) -> None:
        self._api_key  = api_key
        self._endpoint = endpoint.rstrip("/")
        self._model    = model
        self._timeout  = timeout_s

    async def analyze(self, notes: str) -> Dict[str, Any]:
        """
        Call the Qualcomm text completions endpoint with the extraction prompt.

        Returns a dict that conforms to the AnalysisResponse schema.
        """
        url     = f"{self._endpoint}/completions"
        prompt  = build_completion_prompt(notes)
        payload = {
            "model":       self._model,
            "prompt":      prompt,
            "stream":      False,
            "temperature": 0.1,
            "max_tokens":  2048,
            "do_sample":   False,
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

        # ── Status-code handling ──────────────────────────────────────────────
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

        # Extract text from the completions response
        content = ""
        try:
            choices = data.get("choices", [])
            if choices:
                content = choices[0].get("text", "")
                if not isinstance(content, str):
                    content = str(content)
        except (KeyError, IndexError, TypeError) as exc:
            raise QualcommParseError(
                f"Unexpected response structure from Qualcomm AI: {exc}"
            ) from exc

        if not content.strip():
            raise QualcommParseError("Qualcomm AI returned an empty response content.")

        # ── Extract JSON from content ─────────────────────────────────────────
        # The model may echo the prompt before the output — find the FIRST { and
        # the matching closing } using bracket-depth counting.
        extracted = _extract_json(content)
        if extracted is None:
            raise QualcommParseError(
                "AI response did not contain a valid JSON object. "
                f"Response preview: {content[:300]}"
            )

        extracted["mock"]       = False
        extracted["model_used"] = self._model
        return extracted


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> Dict[str, Any] | None:
    """
    Extract the FIRST complete JSON object from text (handles echoed prompts,
    markdown fences, and trailing content after the closing brace).
    Uses bracket-depth counting so nested objects are handled correctly.
    """
    # 1. Try parsing the whole string as-is
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 2. Strip markdown fences
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Bracket-depth matching — find first { and its matching }
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
