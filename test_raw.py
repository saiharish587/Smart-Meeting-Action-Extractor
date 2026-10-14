"""
test_raw.py — Dump the full raw API response to understand the actual structure.
"""
import sys, os, json, httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.insert(0, os.getcwd())
from backend.prompt import SYSTEM_PROMPT

key      = os.environ.get("QUALCOMM_API_KEY", "")
endpoint = os.environ.get("QUALCOMM_ENDPOINT", "https://aisuite.cirrascale.com/apis/v2")
model    = os.environ.get("QUALCOMM_MODEL", "Llama-3.1-8B")

headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# Minimal test first — simple question
payload_simple = {
    "model": model,
    "messages": [
        {"role": "system", "content": "You are a helpful assistant. Always respond with valid JSON."},
        {"role": "user",   "content": 'Reply with: {"hello": "world"}'},
    ],
    "stream": False,
    "temperature": 0.1,
    "max_tokens": 64,
}

print("=== SIMPLE TEST ===")
r = httpx.post(f"{endpoint}/chat/completions", json=payload_simple, headers=headers, timeout=60)
print(f"HTTP: {r.status_code}")
print(f"Raw response JSON:\n{json.dumps(r.json(), indent=2)}")

print("\n=== checking choices[0].message structure ===")
data = r.json()
choices = data.get("choices", [])
if choices:
    ch = choices[0]
    print(f"choice keys: {list(ch.keys())}")
    msg = ch.get("message", ch.get("delta", {}))
    print(f"message: {json.dumps(msg, indent=2)}")
    content = msg.get("content", "")
    print(f"content type: {type(content).__name__}")
    print(f"content value: {json.dumps(content)}")
else:
    print("No choices found!")
    print(f"Full data: {json.dumps(data, indent=2)}")
