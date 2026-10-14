"""
test_live.py — Real Qualcomm inference test. Run from project root:
  python test_live.py
"""
import sys, os, json, httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.insert(0, os.getcwd())

from backend.prompt import build_completion_prompt

key      = os.environ.get("QUALCOMM_API_KEY", "")
endpoint = os.environ.get("QUALCOMM_ENDPOINT", "https://aisuite.cirrascale.com/apis/v2")
model    = os.environ.get("QUALCOMM_MODEL", "Llama-3.1-8B")

if not key or key == "your_actual_api_key":
    print("ERROR: QUALCOMM_API_KEY not configured in backend/.env")
    sys.exit(1)

TEST_NOTES = (
    "Project Sync - 14 October 2026\n"
    "Attendees: Sai Harish, Abhilash, Preetham\n\n"
    "1. Sai Harish will build the dashboard by Friday.\n"
    "2. Abhilash will complete the API integration by end of day Thursday.\n"
    "3. Preetham will investigate the authentication bug - no deadline set.\n"
    "4. The team agreed to use a navy colour palette.\n"
    "5. Risk: API rate limits may affect the live demo.\n"
    "6. Open: No decision on REST vs GraphQL yet."
)

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

prompt  = build_completion_prompt(TEST_NOTES)
payload = {
    "model":       model,
    "prompt":      prompt,
    "stream":      False,
    "temperature": 0.1,
    "max_tokens":  2048,
    "do_sample":   False,
}

print(f"Endpoint : {endpoint}/completions")
print(f"Model    : {model}")
print("-" * 60)

try:
    r = httpx.post(f"{endpoint}/completions", json=payload, headers=headers, timeout=120)
except httpx.TimeoutException:
    print("ERROR: Request timed out after 120s"); sys.exit(1)
except httpx.RequestError as exc:
    print(f"ERROR: Network error — {exc}"); sys.exit(1)

print(f"HTTP status: {r.status_code}")
if r.status_code == 401:
    print("ERROR: Invalid API key (401)"); sys.exit(1)
if r.status_code != 200:
    print(f"ERROR body: {r.text[:500]}"); sys.exit(1)

data = r.json()
try:
    content = data["choices"][0].get("text", "")
    if not isinstance(content, str):
        content = str(content)
except (KeyError, IndexError, TypeError) as exc:
    print(f"ERROR: Unexpected structure — {exc}\nRaw: {str(data)[:400]}"); sys.exit(1)

print(f"Raw output length: {len(content)} chars")
print(f"Raw output (first 600 chars):\n{content[:600]}\n" + "-"*60)

# Extract first JSON object using bracket depth
start = content.find("{")
end   = -1
if start != -1:
    depth = 0
    for i, ch in enumerate(content[start:], start):
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

if start == -1 or end == -1:
    print("ERROR: No JSON object in response"); sys.exit(1)

try:
    parsed = json.loads(content[start:end+1])
except json.JSONDecodeError as exc:
    print(f"ERROR: JSON parse failed — {exc}")
    print(f"Attempted: {content[start:end+1][:300]}"); sys.exit(1)

print(f"Parsed keys        : {list(parsed.keys())}")
print(f"summary            : {str(parsed.get('summary',''))[:150]}")
print(f"decisions count    : {len(parsed.get('decisions',[]))}")
print(f"action_items count : {len(parsed.get('action_items',[]))}")
print(f"risks count        : {len(parsed.get('risks',[]))}")
print(f"open_questions     : {len(parsed.get('open_questions',[]))}")

required = {"summary", "decisions", "action_items", "risks", "missing_information"}
missing  = required - set(parsed.keys())
print(f"\nSchema: {'ALL REQUIRED KEYS PRESENT ✓' if not missing else f'MISSING: {missing}'}")

items = parsed.get("action_items", [])
if items:
    print(f"\nFirst action item:\n{json.dumps(items[0], indent=2)}")

print("\n" + "="*60)
print(f"SUCCESS — Real Qualcomm inference OK")
print(f"  Endpoint : {endpoint}/completions")
print(f"  Model    : {model}")
print(f"  HTTP     : {r.status_code}")
print(f"  Schema   : {'VALID' if not missing else 'PARTIAL'}")
