"""
test_prompt_fix.py — Test fixed prompt that avoids triggering tool-calling mode.
The Cirrascale platform triggers tool_calls when "JSON" appears in the system prompt.
Fix: move the format instruction to the USER turn and remove the word JSON from system.
"""
import sys, os, json, httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
key      = os.environ.get("QUALCOMM_API_KEY", "")
endpoint = os.environ.get("QUALCOMM_ENDPOINT", "https://aisuite.cirrascale.com/apis/v2")

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# ── Revised system prompt — no "JSON" keyword, no mention of code fences ────
SYSTEM_PROMPT_V2 = (
    "You are a meeting intelligence assistant. "
    "Extract structured information from meeting notes and return it as a "
    "machine-readable object. Follow the user's instructions exactly."
)

SHORT_NOTES = (
    "Team sync - Oct 14 2026. Attendees: Alice, Bob.\n"
    "Alice will prepare the demo slides by Friday.\n"
    "Bob will fix the login bug today.\n"
    "Decision: Use PostgreSQL for the database.\n"
    "Risk: Demo environment may be unstable."
)

# Format instruction goes in the USER turn, not system turn
USER_PROMPT = f"""Analyse these meeting notes and respond with ONLY a structured object (no explanation, no markdown, just the raw object starting with {{ and ending with }}).

Use this exact structure:
{{
  "summary": "<2-3 sentence summary>",
  "decisions": [{{"description": "...", "status": "confirmed", "evidence": "..."}}],
  "action_items": [{{"task": "...", "owner": "...", "deadline": "...", "priority": "high|medium|low", "status": "open", "evidence": "...", "missing_information": [], "review_status": "needs_review"}}],
  "risks": [{{"description": "...", "severity": "high|medium|low", "evidence": "..."}}],
  "missing_information": ["..."],
  "open_questions": ["..."]
}}

Meeting notes:
{SHORT_NOTES}"""

MODELS = ["Llama-3.1-8B", "Llama-3.3-70B"]

for model in MODELS:
    print(f"\n{'='*60}")
    print(f"Model: {model}")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_V2},
            {"role": "user",   "content": USER_PROMPT},
        ],
        "stream": False,
        "temperature": 0.1,
        "max_tokens": 1500,
        "do_sample": False,
    }

    try:
        r = httpx.post(f"{endpoint}/chat/completions", json=payload, headers=headers, timeout=120)
    except Exception as exc:
        print(f"ERROR: {exc}"); continue

    data = r.json()
    finish = data.get("choices", [{}])[0].get("finish_reason", "?")
    print(f"HTTP={r.status_code} | finish_reason={finish}")

    msg = data.get("choices", [{}])[0].get("message", {})
    content = msg.get("content", "")
    if isinstance(content, dict):
        content = content.get("String", "") or str(content)

    if not content:
        tc = msg.get("tool_calls", [])
        if tc:
            print(f"Still triggering tool_calls: {json.dumps(tc[0])[:150]}")
        else:
            print("Empty content, no tool_calls")
        continue

    print(f"Content length: {len(content)} | preview: {content[:300]}")
    start, end = content.find("{"), content.rfind("}")
    if start != -1 and end != -1:
        try:
            parsed = json.loads(content[start:end+1])
            print(f"JSON VALID ✓ | keys={list(parsed.keys())} | action_items={len(parsed.get('action_items',[]))}")
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
    else:
        print("No {{ }} found in content")
