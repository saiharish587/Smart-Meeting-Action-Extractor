"""
prompt.py — Prompt builder for the Smart Meeting Action Extractor.

Uses the /v2/completions (text completion) endpoint on Qualcomm Cirrascale.
The chat completions endpoint auto-triggers tool_calls mode on this deployment,
so we use a raw text completion with the Llama [INST] instruction format.

The extraction instructions deliberately avoid the literal word "JSON" in the
system context to prevent any platform-side tool-routing heuristics from firing.
"""

# ── Extraction rules (injected into the user instruction) ─────────────────────

_EXTRACTION_RULES = """\
Extract ALL of the following from the meeting notes:
1. A 2-4 sentence factual summary covering: who attended, main topics, key outcomes, blockers.
2. Every explicit decision made (agreed, rejected, or proposed but not yet confirmed).
3. Every action item — any task, commitment, or follow-up someone agreed to do.
   - owner: exact name mentioned, or "Not specified"
   - deadline: exact timeframe stated, or "Not specified"
   - priority: "high" (urgent/blocker/ASAP), "medium" (normal), "low" (nice-to-have), "not_specified"
4. Risks: technical blockers, dependency issues, resource gaps, timeline concerns.
5. missing_information: ambiguities, missing owners/deadlines, details needed to complete an item.
6. open_questions: questions raised but not answered in the meeting.

Rules:
- Do NOT invent information not present in the notes.
- All six top-level fields are required even if empty (use [] or "").
- Return ONLY the structured object — no explanation, no preamble.\
"""

_OUTPUT_SCHEMA = """\
{
  "summary": "<2-4 sentence summary>",
  "decisions": [
    {"description": "<what was decided>", "status": "<confirmed|proposed|needs_review>", "evidence": "<quote>"}
  ],
  "action_items": [
    {
      "task": "<what must be done>",
      "owner": "<name or Not specified>",
      "deadline": "<deadline or Not specified>",
      "priority": "<high|medium|low|not_specified>",
      "status": "open",
      "evidence": "<supporting quote>",
      "missing_information": ["<any missing detail>"],
      "review_status": "needs_review"
    }
  ],
  "risks": [
    {"description": "<risk>", "severity": "<high|medium|low>", "evidence": "<quote>"}
  ],
  "missing_information": ["<unresolved gap or ambiguity>"],
  "open_questions": ["<unanswered question>"]
}\
"""


def build_completion_prompt(notes: str) -> str:
    """
    Build a Llama-format text completion prompt for meeting extraction.

    The [INST] / [/INST] markers are understood by Llama-3.x instruction-tuned
    models when used with raw text completion (not chat completions).
    The model generates its response immediately after [/INST].
    """
    instruction = (
        f"You are a meeting intelligence assistant.\n\n"
        f"{_EXTRACTION_RULES}\n\n"
        f"Required output structure (start with {{ and end with }}, nothing else):\n"
        f"{_OUTPUT_SCHEMA}\n\n"
        f"Meeting notes to analyse:\n"
        f"{notes}"
    )
    return f"[INST] {instruction} [/INST]\n"


# ── Legacy name kept for backwards compatibility ────────────────────────────
SYSTEM_PROMPT = _EXTRACTION_RULES  # used only in tests that import it directly
