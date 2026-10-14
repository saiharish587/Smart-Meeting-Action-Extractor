# Smart Meeting Action Extractor

**Infosys Hack-AI-Thon 2026 · Problem Statement EP-01 · Team: DEV FORCE**  
Institution: B V Raju Institute of Technology, Narsapur

Converts unstructured meeting notes into structured intelligence:
- Concise meeting summary
- Key decisions (confirmed / proposed / needs review)
- Action items with owners, deadlines, and priorities
- Risk alerts with severity levels
- Missing / ambiguous information flags
- Open questions raised but not resolved

Powered by the **Qualcomm Cirrascale AI Inference Suite** (Llama-3.1-8B).

---

## Architecture

```
index.html + style.css + script.js   ← Vanilla HTML/CSS/JS frontend (no framework)
        │
        │  POST /api/v1/meetings/analyze
        ▼
backend/main.py (FastAPI)
  └── routers/analysis.py
        ├── providers/qualcomm.py    ← Real Qualcomm AI (Bearer token, httpx async)
        └── providers/mock.py        ← Mock provider (no API key required)
```

The frontend **never** holds the API key. The key lives only in `backend/.env`.

---

## Quick Start (Windows PowerShell)

### Prerequisites

- Python 3.11 or later — `python --version`
- Git — `git --version`

### 1. Clone / open the project

```powershell
cd "c:\Smart Meeting Action Extractor"
```

### 2. Set up the backend virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> If you see a script execution policy error, run:  
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 3. Configure the API key

```powershell
# Still inside backend\
Copy-Item .env.example .env
notepad .env          # Replace 'your_api_key_here' with the real key
```

**If you have no API key yet**, leave the file as-is. The backend will run in **mock mode** and return sample data. A ⚠ banner will appear in the frontend.

`.env` is already in `.gitignore` — it will never be committed.

### 4. Start the backend

```powershell
# From the project root (one directory up from backend\)
cd "c:\Smart Meeting Action Extractor"
.\.venv\Scripts\Activate.ps1          # if not already active
uvicorn backend.main:app --reload --port 8000
```

You should see:

```
Smart Meeting Action Extractor — Backend starting
  Mode  : MOCK   (or QUALCOMM if key is set)
  Model : mock   (or Llama-3.1-8B)
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Leave this terminal open.

### 5. Open the frontend

Open `index.html` directly in your browser (double-click or drag into browser), **or** use VS Code Live Server at `http://localhost:5500`.

Both origins are allowed by CORS.

### 6. Use the application

1. Click **+ New Meeting** on the Meetings page.
2. Fill in title, date, and type → **Create Meeting**.
3. Paste your meeting notes in the editor.
4. Click **Analyse Meeting**.
5. Results appear on the **Meeting Insights** page.
6. Track tasks on the **My Progress** page.

---

## Running Tests

```powershell
cd "c:\Smart Meeting Action Extractor\backend"
.\.venv\Scripts\Activate.ps1
pytest tests/ -v
```

All 12 tests pass without a real API key (they use the mock provider and patching).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `QUALCOMM_API_KEY` | _(none)_ | Bearer token for Cirrascale API. Leave empty for mock mode. |
| `QUALCOMM_ENDPOINT` | `https://aisuite.cirrascale.com/apis/v2` | API base URL |
| `QUALCOMM_MODEL` | `Llama-3.1-8B` | Model identifier |
| `MOCK_MODE` | `false` | Force mock mode even when a key is present |
| `MAX_NOTES_CHARS` | `16000` | Maximum input length |
| `REQUEST_TIMEOUT_S` | `90` | HTTP timeout for AI calls (seconds) |
| `ALLOWED_ORIGINS` | `http://localhost:5500,...,null` | Comma-separated CORS origins |

---

## API Reference

### `GET /health`

```json
{ "status": "ok", "mode": "mock", "model": "mock" }
```

### `POST /api/v1/meetings/analyze`

**Request:**
```json
{ "notes": "Raw meeting notes text..." }
```

**Response:**
```json
{
  "summary": "...",
  "decisions": [
    { "description": "...", "status": "confirmed|proposed|needs_review", "evidence": "..." }
  ],
  "action_items": [
    {
      "task": "...", "owner": "...", "deadline": "...",
      "priority": "high|medium|low|not_specified",
      "status": "open|in_progress|completed",
      "evidence": "...",
      "missing_information": ["..."],
      "review_status": "needs_review|approved|rejected"
    }
  ],
  "risks": [
    { "description": "...", "severity": "high|medium|low", "evidence": "..." }
  ],
  "missing_information": ["..."],
  "open_questions": ["..."],
  "mock": false,
  "model_used": "Llama-3.1-8B"
}
```

**Error codes:**

| Code | Cause |
|---|---|
| 422 | Empty notes, whitespace-only, or exceeds 16 000 characters |
| 401 | Invalid Qualcomm API key |
| 429 | Rate limit exceeded |
| 502 | Provider error or malformed AI response |
| 504 | Request timed out |

---

## Project Structure

```
c:\Smart Meeting Action Extractor\
├── index.html           Frontend (single-page, 3 views)
├── style.css            Soft palette design system
├── script.js            Frontend logic + AI hook (A4 connected)
├── .gitignore
├── README.md
└── backend\
    ├── main.py          FastAPI app entry point
    ├── config.py        Settings (pydantic-settings, reads .env)
    ├── models.py        Pydantic request/response schemas
    ├── prompt.py        Extraction system prompt
    ├── requirements.txt
    ├── pytest.ini
    ├── .env.example     Template — copy to .env and add API key
    ├── providers\
    │   ├── qualcomm.py  Real Qualcomm AI adapter (async httpx)
    │   └── mock.py      Mock provider (for testing / no-key dev)
    ├── routers\
    │   └── analysis.py  POST /api/v1/meetings/analyze, GET /health
    └── tests\
        ├── conftest.py  pytest fixtures
        └── test_api.py  12 test cases (all pass without real key)
```

---

## Team

| Role | Name |
|---|---|
| Frontend + AI integration | Sai Harish |
| Qualcomm API + Backend support | Abhilash |

---

## Security Notes

- The `QUALCOMM_API_KEY` lives **only** in `backend/.env`, which is gitignored.
- The frontend JS contains **no credentials**. It only calls `http://localhost:8000`.
- Error responses never include the API key, stack traces, or internal implementation details.
- Mock mode results are clearly labelled with `"mock": true` and a visible frontend banner.
