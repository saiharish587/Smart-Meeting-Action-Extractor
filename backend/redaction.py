"""
redaction.py — Best-effort PII redaction for meeting notes.

Detects and replaces common PII patterns before text is sent to an external
AI provider.

WARNING: This is regex-based and is NOT exhaustive.
- Detected:   email addresses, phone numbers, card-like digit sequences.
- NOT detected: full names, postal/home addresses, national IDs (SSN, passport),
                usernames, account numbers, dates of birth, or any other
                context-dependent sensitive values.

Do not claim this module fully anonymises data. Use it as a best-effort
pre-processing step only.
"""
from __future__ import annotations

import re

# ── Patterns ──────────────────────────────────────────────────────────────────

# Standard email addresses (RFC 5321 subset)
_EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'
)

# Card-like sequences: 13–19 contiguous digits, optionally separated by spaces
# or hyphens (matches Visa 13/16, Mastercard 16, Amex 15, etc.)
# Applied BEFORE phone regex to prevent card numbers being partially consumed.
_CARD_RE = re.compile(
    r'\b(?:\d[ \-]?){12,18}\d\b'
)

# Phone numbers: international (+XX) and local formats, 7–15 digits,
# optionally separated by spaces, hyphens, or parentheses (NOT dots, to avoid
# matching version strings like 3.1.4.1).
_PHONE_RE = re.compile(
    r'(?<![.\d])'                           # not preceded by a digit or dot (avoids versions)
    r'(\+?[\d][\d\s\-()]{5,18}[\d])'       # body: spaces/dashes/parens allowed, NOT dots
    r'(?![.\d])'                            # not followed by a digit or dot
)


# ── Public API ────────────────────────────────────────────────────────────────

def redact_pii(text: str) -> str:
    """
    Replace detected PII patterns in *text* with placeholder tokens.

    Processing order:
      1. Email addresses  → [EMAIL]
      2. Card numbers     → [CARD_NUMBER]  (before phone to avoid partial overlap)
      3. Phone numbers    → [PHONE]

    Returns the redacted string. The original string is never stored or logged.

    Limitations:
      - Regex patterns may produce false positives or false negatives.
      - Names, addresses, and other context-sensitive PII are NOT detected.
      - Do not rely on this function as the sole privacy control.
    """
    if not isinstance(text, str):
        return text

    text = _EMAIL_RE.sub('[EMAIL]', text)
    text = _CARD_RE.sub('[CARD_NUMBER]', text)
    text = _PHONE_RE.sub('[PHONE]', text)
    return text
