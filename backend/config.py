"""
config.py — Application settings for Smart Meeting Action Extractor backend.
Reads from environment variables / .env file. Never exposes the API key in responses.
"""
from __future__ import annotations

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Qualcomm Cirrascale AI credentials ────────────────────────────────────
    qualcomm_api_key: Optional[str] = None
    qualcomm_endpoint: str = "https://aisuite.cirrascale.com/apis/v2"
    qualcomm_model: str = "Llama-3.1-8B"

    # ── Behaviour flags ───────────────────────────────────────────────────────
    # Set MOCK_MODE=true to force mock mode even when a key is present (testing).
    mock_mode: bool = False

    # ── Limits ────────────────────────────────────────────────────────────────
    max_notes_chars: int = 16_000
    request_timeout_s: int = 90

    # ── CORS origins ─────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # "null" covers file:// protocol (double-click index.html).
    allowed_origins: str = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,null"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def use_mock(self) -> bool:
        """True when no API key is set or mock_mode flag is on."""
        return self.mock_mode or not self.qualcomm_api_key


settings = Settings()
