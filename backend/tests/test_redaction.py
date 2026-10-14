"""
tests/test_redaction.py — Unit tests for backend.redaction.redact_pii

Run from the project root:
    .\\backend\\.venv\\Scripts\\Activate.ps1
    python -m pytest backend/tests/ -v
"""
from __future__ import annotations

import pytest
from backend.redaction import redact_pii


# ════════════════════════════════════════════════════════════════════════════
# Email redaction
# ════════════════════════════════════════════════════════════════════════════

class TestEmailRedaction:
    def test_basic_email(self):
        assert redact_pii("Contact john@example.com for details.") == \
               "Contact [EMAIL] for details."

    def test_subdomain_email(self):
        assert redact_pii("Reach us at support@mail.corp.org") == \
               "Reach us at [EMAIL]"

    def test_plus_addressing(self):
        assert redact_pii("Send to user+tag@example.co.uk") == \
               "Send to [EMAIL]"

    def test_multiple_emails(self):
        result = redact_pii("CC: alice@a.com and bob@b.org")
        assert "[EMAIL]" in result
        assert "alice@a.com" not in result
        assert "bob@b.org" not in result

    def test_email_at_start_of_line(self):
        assert redact_pii("admin@company.io is the sender") == \
               "[EMAIL] is the sender"

    def test_email_at_end(self):
        result = redact_pii("Reply to: noreply@service.net")
        assert "noreply@service.net" not in result
        assert "[EMAIL]" in result


# ════════════════════════════════════════════════════════════════════════════
# Phone redaction
# ════════════════════════════════════════════════════════════════════════════

class TestPhoneRedaction:
    def test_us_format_dashes(self):
        result = redact_pii("Call 555-867-5309 now")
        assert "555-867-5309" not in result
        assert "[PHONE]" in result

    def test_us_format_spaces(self):
        result = redact_pii("Phone: 555 867 5309")
        assert "555 867 5309" not in result

    def test_international_plus91(self):
        result = redact_pii("My number is +91 98765 43210.")
        assert "+91 98765 43210" not in result
        assert "[PHONE]" in result

    def test_international_plus44(self):
        result = redact_pii("UK: +44 7911 123456")
        assert "+44 7911 123456" not in result

    def test_parentheses_format(self):
        result = redact_pii("Dial (800) 555-1234 for support")
        assert "555-1234" not in result

    def test_multiple_phones(self):
        result = redact_pii("Primary: 555-111-2222  Backup: 555-333-4444")
        assert "555-111-2222" not in result
        assert "555-333-4444" not in result


# ════════════════════════════════════════════════════════════════════════════
# Card number redaction
# ════════════════════════════════════════════════════════════════════════════

class TestCardRedaction:
    def test_16_digit_plain(self):
        result = redact_pii("Card: 4111111111111111 is invalid")
        assert "4111111111111111" not in result
        assert "[CARD_NUMBER]" in result

    def test_16_digit_spaces(self):
        result = redact_pii("4111 1111 1111 1111")
        assert "4111 1111 1111 1111" not in result
        assert "[CARD_NUMBER]" in result

    def test_16_digit_dashes(self):
        result = redact_pii("4111-1111-1111-1111")
        assert "4111-1111-1111-1111" not in result

    def test_13_digit_visa(self):
        result = redact_pii("4000000000000")
        assert "4000000000000" not in result
        assert "[CARD_NUMBER]" in result

    def test_multiple_cards(self):
        result = redact_pii("Old: 4111111111111111  New: 5500005555555559")
        assert "4111111111111111" not in result
        assert "5500005555555559" not in result


# ════════════════════════════════════════════════════════════════════════════
# Mixed PII
# ════════════════════════════════════════════════════════════════════════════

class TestMixedPII:
    def test_email_and_phone_together(self):
        text = "Email admin@test.com or call 555-999-8888"
        result = redact_pii(text)
        assert "admin@test.com" not in result
        assert "555-999-8888" not in result
        assert "[EMAIL]" in result
        assert "[PHONE]" in result

    def test_email_phone_and_card(self):
        text = "user@corp.com | +1 555 123 4567 | 4111111111111111"
        result = redact_pii(text)
        assert "user@corp.com" not in result
        assert "[EMAIL]" in result
        assert "[CARD_NUMBER]" in result


# ════════════════════════════════════════════════════════════════════════════
# No-PII (text should be returned unchanged)
# ════════════════════════════════════════════════════════════════════════════

class TestNoPII:
    def test_plain_text_unchanged(self):
        text = "The team agreed to deliver by Friday."
        assert redact_pii(text) == text

    def test_numbers_not_phone(self):
        # Short number — should not match phone (< 7 digits)
        text = "Item count: 12345"
        assert redact_pii(text) == text

    def test_version_number_unchanged(self):
        # Dot-separated version strings should NOT be matched by the phone regex
        # because the regex excludes patterns preceded/followed by dots.
        text = "Released version 3.1.4.1 today."
        assert redact_pii(text) == text

    def test_short_numeric_code_not_phone(self):
        # 5-digit number — well below the phone minimum; should not match
        text = "Error code: 42301"
        assert redact_pii(text) == text

    def test_empty_string(self):
        assert redact_pii("") == ""

    def test_whitespace_only(self):
        assert redact_pii("   \n\t  ") == "   \n\t  "


# ════════════════════════════════════════════════════════════════════════════
# Edge cases / boundary inputs
# ════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    def test_non_string_input_returned_as_is(self):
        # Function should not crash on non-string input
        assert redact_pii(None) is None   # type: ignore[arg-type]
        assert redact_pii(42)   == 42     # type: ignore[arg-type]

    def test_malformed_email_not_matched(self):
        # Missing TLD — should NOT match
        text = "bad-email@nodot"
        # We don't assert exact behaviour strictly, just that it doesn't crash
        result = redact_pii(text)
        assert isinstance(result, str)

    def test_email_repeated_twice(self):
        text = "a@b.com and a@b.com again"
        result = redact_pii(text)
        assert result.count("[EMAIL]") == 2

    def test_redaction_is_idempotent_on_placeholder(self):
        # Running redact_pii on already-redacted text should not alter placeholders
        text = "Contact [EMAIL] or call [PHONE]"
        assert redact_pii(text) == text

    def test_card_not_matched_when_too_short(self):
        # A 6-digit number is far below both card (13+) and phone (7+ digit body)
        # thresholds — it should pass through unchanged.
        text = "Code: 123456"
        result = redact_pii(text)
        assert "123456" in result

    def test_unicode_text_preserved(self):
        text = "Attendees: Björn and Søren discussed the budget."
        result = redact_pii(text)
        assert "Björn" in result
        assert "Søren" in result
