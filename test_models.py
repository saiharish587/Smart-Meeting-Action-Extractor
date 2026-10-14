"""
test_models.py — Test all available LLMs with the extraction prompt to find which works best.
"""
import sys, os, json, httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.insert(0, os.getcwd())
from backend.prompt import SYSTEM_PROMPT

key      = os.environ.get("QUALCOMM_API_KEY", "")
endpoint = os.environ.get("QUALCOMM_ENDPOINT", "https://aisuite.cirrascale.com/apis/v2")

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

MODELS = ["Llama-3.1-8B", "Llama-3.3-70B"]

SHORT_NOTES = (
    "Team sync - Oct 14 2026. Attendees: Alice, Bob.\n"
    "Alice will prepare the demo slides by Friday.\n"
    "Bob will fix the login bug today.\n"
    "Decision: Use PostgreSQL for the database.\n"
    "Risk: Demo environment may be unstable."
)

for model in MODELS:
    print(f"\n{'='*60}")
    print(f"Testing model: {model}")
    print("="*60)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": SHORT_NOTES},
        ],
        "stream": False,
        "temperature": 0.1,
        "max_tokens": 1024,
    }

    try:
        r = httpx.post(f"{endpoint}/chat/completions", json=payload, headers=headers, timeout=120)
    except Exception as exc:
        print(f"ERROR: {exc}")
        continue

    print(f"HTTP: {r.status_code} | finish_reason: {r.json().get('choices',[{}])[0].get('finish_reason','?')}")
    
    data = r.json()
    try:
        msg = data["choices"][0]["message"]
        content = msg.get("content", "")
        if isinstance(content, dict):
            content = content.get("String", "") or str(content)
        print(f"content length: {len(content)} chars")
        if content:
            print(f"content preview: {content[:300]}")
            # Try parse
            start, end = content.find("{"), content.rfind("}")
            if start != -1 and end != -1:
                try:
                    parsed = json.loads(content[start:end+1])
                    print(f"JSON VALID ✓ | keys: {list(parsed.keys())}")
                    print(f"action_items: {len(parsed.get('action_items',[]))}")
                except json.JSONDecodeError as e:
                    print(f"JSON INVALID: {e}")
            else:
                print("No JSON found in content")
        else:
            # Check tool_calls
            tc = msg.get("tool_calls", [])
            if tc:
                print(f"tool_calls triggered (not text): {json.dumps(tc[0])[:200]}")
            else:
                print("Empty content, no tool_calls either")
    except Exception as exc:
        print(f"Parse error: {exc}")
        print(f"Raw data: {json.dumps(data)[:400]}")
