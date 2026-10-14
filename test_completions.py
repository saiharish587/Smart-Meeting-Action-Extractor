"""
test_completions.py — Test the /v2/completions (text completion) endpoint as alternative
to chat completions which is stuck in tool-call mode.
Also test passing tools:null to chat completions.
"""
import sys, os, json, httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
key      = os.environ.get("QUALCOMM_API_KEY", "")
endpoint = os.environ.get("QUALCOMM_ENDPOINT", "https://aisuite.cirrascale.com/apis/v2")
headers  = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "Accept": "application/json"}

SHORT_NOTES = (
    "Team sync Oct 14. Alice will prepare demo slides by Friday. "
    "Bob will fix the login bug today. Decision: use PostgreSQL. "
    "Risk: demo environment may be unstable."
)

EXTRACTION_PROMPT = (
    'Extract from these meeting notes and respond with ONLY a structured object starting with { and ending with }.\n'
    'Required structure: {"summary":"...","action_items":[{"task":"...","owner":"...","deadline":"..."}],'
    '"decisions":[{"description":"...","status":"confirmed"}],"risks":[{"description":"...","severity":"medium"}],'
    '"missing_information":[],"open_questions":[]}\n\n'
    f'Meeting notes: {SHORT_NOTES}'
)

# ── Test 1: Chat completions with tools=null explicitly ──────────────────────
print("="*60)
print("TEST 1: Chat completions with tools=null")
r1 = httpx.post(f"{endpoint}/chat/completions", headers=headers, timeout=60, json={
    "model": "Llama-3.1-8B",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": EXTRACTION_PROMPT},
    ],
    "stream": False,
    "temperature": 0.1,
    "max_tokens": 800,
    "tools": None,
})
data1 = r1.json()
fr1 = data1.get("choices",[{}])[0].get("finish_reason","?")
c1  = data1.get("choices",[{}])[0].get("message",{}).get("content","")
print(f"HTTP={r1.status_code} | finish={fr1} | content_len={len(str(c1))}")
if c1:
    print(f"Content preview: {str(c1)[:300]}")

# ── Test 2: Text /v2/completions (raw completion, not chat) ──────────────────
print("\n" + "="*60)
print("TEST 2: /v2/completions (text completion)")

FULL_PROMPT = (
    "[INST] You are a meeting intelligence assistant. Extract structured data from meeting notes.\n"
    f"{EXTRACTION_PROMPT}\n[/INST]\n"
)

r2 = httpx.post(f"{endpoint}/completions", headers=headers, timeout=60, json={
    "model": "Llama-3.1-8B",
    "prompt": FULL_PROMPT,
    "stream": False,
    "temperature": 0.1,
    "max_tokens": 800,
})
print(f"HTTP={r2.status_code}")
if r2.status_code == 200:
    data2 = r2.json()
    choices2 = data2.get("choices", [])
    if choices2:
        text2 = choices2[0].get("text","")
        print(f"text len: {len(text2)} | preview: {text2[:400]}")
        if "{" in text2:
            s, e = text2.find("{"), text2.rfind("}")
            try:
                p2 = json.loads(text2[s:e+1])
                print(f"JSON VALID ✓ | keys={list(p2.keys())}")
            except Exception as ex:
                print(f"JSON parse fail: {ex}")
        else:
            print("No JSON found")
    else:
        print(f"No choices: {json.dumps(data2)[:300]}")
else:
    print(f"Error: {r2.text[:300]}")

# ── Test 3: Chat with explicit tool_choice=none ──────────────────────────────
print("\n" + "="*60)
print("TEST 3: Chat completions with tool_choice=none")
r3 = httpx.post(f"{endpoint}/chat/completions", headers=headers, timeout=60, json={
    "model": "Llama-3.1-8B",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user",   "content": EXTRACTION_PROMPT},
    ],
    "stream": False,
    "temperature": 0.1,
    "max_tokens": 800,
})
# Note: tool_choice is not in the Cirrascale schema but testing if it affects behaviour
data3 = r3.json()
fr3 = data3.get("choices",[{}])[0].get("finish_reason","?")
c3  = data3.get("choices",[{}])[0].get("message",{}).get("content","")
print(f"HTTP={r3.status_code} | finish={fr3} | content_len={len(str(c3))}")
if c3:
    print(f"Content: {str(c3)[:300]}")
