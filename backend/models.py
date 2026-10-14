"""
models.py — Pydantic request/response schemas for the Smart Meeting Action Extractor API.
These models define the agreed contract between frontend and backend.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Enums ─────────────────────────────────────────────────────────────────────

class DecisionStatus(str, Enum):
    confirmed    = "confirmed"
    proposed     = "proposed"
    needs_review = "needs_review"


class Priority(str, Enum):
    high          = "high"
    medium        = "medium"
    low           = "low"
    not_specified = "not_specified"


class TaskStatus(str, Enum):
    open        = "open"
    in_progress = "in_progress"
    completed   = "completed"


class ReviewStatus(str, Enum):
    needs_review = "needs_review"
    approved     = "approved"
    rejected     = "rejected"


class RiskSeverity(str, Enum):
    high   = "high"
    medium = "medium"
    low    = "low"


# ── Sub-models ────────────────────────────────────────────────────────────────

class Decision(BaseModel):
    description: str = Field(..., description="What was decided")
    status:      DecisionStatus = DecisionStatus.confirmed
    evidence:    str = Field(default="", description="Verbatim or paraphrased quote from notes")


class ActionItem(BaseModel):
    task:                str   = Field(..., description="What needs to be done")
    owner:               str   = Field(default="Not specified", description="Who is responsible")
    deadline:            str   = Field(default="Not specified", description="When it is due")
    priority:            Priority    = Priority.not_specified
    status:              TaskStatus  = TaskStatus.open
    evidence:            str         = Field(default="", description="Supporting quote from notes")
    missing_information: List[str]   = Field(default_factory=list)
    review_status:       ReviewStatus = ReviewStatus.needs_review


class Risk(BaseModel):
    description: str = Field(..., description="Description of the risk")
    severity:    RiskSeverity = RiskSeverity.medium
    evidence:    str = Field(default="")


# ── Top-level request/response ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    notes: str = Field(..., description="Raw meeting notes text")

    @field_validator("notes")
    @classmethod
    def notes_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Meeting notes must not be empty.")
        return stripped


class AnalysisResponse(BaseModel):
    summary:             str
    decisions:           List[Decision]   = Field(default_factory=list)
    action_items:        List[ActionItem] = Field(default_factory=list)
    risks:               List[Risk]       = Field(default_factory=list)
    missing_information: List[str]        = Field(default_factory=list)
    open_questions:      List[str]        = Field(default_factory=list)
    mock:                bool             = Field(default=False, description="True when result is simulated, not from real AI")
    model_used:          Optional[str]    = Field(default=None, description="Model identifier that produced this result")


# ── Error response (matches FastAPI HTTPException detail format) ───────────────

class ErrorDetail(BaseModel):
    detail: str
