# 🧠 Smart Meeting Action Extractor

> **Infosys Hack-AI-Thon 2026 · Problem Statement EP-01**  
> Team: **DEV FORCE** · B V Raju Institute of Technology, Narsapur

---

## 📌 Problem Statement

Professionals lose hours every week manually reviewing meeting recordings and notes to extract tasks, decisions, and follow-ups. Important action items get missed, deadlines are forgotten, and accountability is unclear.

**EP-01** asks: *Can AI automatically convert unstructured meeting notes into structured, actionable intelligence?*

---

## 💡 Our Solution

**Smart Meeting Action Extractor** is a web application that transforms raw, unstructured meeting notes into a complete meeting intelligence report — in seconds.

Paste your meeting notes → click **Analyse Meeting** → instantly get:

| Output | Description |
|---|---|
| 📝 **Meeting Summary** | 2–4 sentence factual overview of the meeting |
| ✅ **Action Items** | Every task with owner, deadline, and priority |
| 🏛️ **Key Decisions** | Confirmed, proposed, or pending decisions |
| ⚠️ **Risks** | Identified blockers and concerns with severity |
| ❓ **Missing Information** | Gaps, ambiguities, and unanswered questions |

---

## 🎥 Live Demo Flow

> Follow these steps during the demo:

### Step 1 — Create a Meeting
- Click **+ New Meeting** on the Meetings page
- Enter a title (e.g. `Project Sync - Oct 2026`), date, and meeting type
- Click **Create Meeting**

### Step 2 — Enter Meeting Notes
- Paste unstructured meeting notes into the text editor
- Use the **Load Sample Notes** button to demonstrate with pre-built data

### Step 3 — Analyse with AI
- Click **Analyse Meeting**
- Wait ~5–10 seconds for the Qualcomm Llama-3.1-8B model to process
- The app navigates automatically to the **Meeting Insights** page

### Step 4 — Review Results
- Show the **Summary**, **Action Items table**, **Key Decisions**, and **Risks & Missing Information**
- Point out how the AI identified owners, deadlines, and gaps from free-form text

### Step 5 — Track Progress
- Navigate to **My Progress**
- Show the stats dashboard and pending task list
- Tick a task checkbox → use **Complete** or **Delete** buttons

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Frontend (Browser)      │
│  index.html · style.css         │
│  script.js  (Vanilla JS)        │
│  localStorage persistence       │
└────────────┬────────────────────┘
             │ POST /api/v1/meetings/analyze
             │ (fetch — no API key in browser)
             ▼
┌─────────────────────────────────┐
│      Backend (FastAPI · Python) │
│  routers/analysis.py            │
│  providers/qualcomm.py          │
│  config.py  (reads .env)        │
└────────────┬────────────────────┘
             │ HTTPS · Bearer Token
             │ POST /apis/v2/completions
             ▼
┌─────────────────────────────────┐
│  Qualcomm Cirrascale AI Suite   │
│  Model: Llama-3.1-8B            │
│  https://aisuite.cirrascale.com │
└─────────────────────────────────┘
```

### Why this architecture?
- **API key never reaches the browser** — secured on the backend only
- **Stateless backend** — each analysis request is independent; no database needed
- **Frontend uses localStorage** — meetings and tasks persist between sessions without a server

---

## 🛠️ Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | HTML5 · CSS3 · Vanilla JavaScript | Zero dependencies, instant load |
| Backend | Python 3.11 · FastAPI · uvicorn | Lightweight async API server |
| AI Provider | Qualcomm Cirrascale AI Inference Suite | Runs on Qualcomm AI100 hardware |
| AI Model | Llama-3.1-8B (instruction-tuned) | Fast, accurate structured extraction |
| HTTP Client | httpx (async) | Non-blocking AI requests |
| Validation | Pydantic v2 | Schema enforcement on all AI responses |
| Persistence | localStorage (browser) | No database setup required |
| Version Control | Git · GitHub | Full history, team collaboration |

---

## 🚀 Setup & Run (Windows)

### Prerequisites
- Python 3.11 or later
- Git

### 1. Clone the repository
```powershell
git clone https://github.com/saiharish587/Smart-Meeting-Action-Extractor.git
cd "Smart-Meeting-Action-Extractor"
```

### 2. Create the virtual environment
```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 3. Configure the API key
```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```
Set your credentials:
```env
QUALCOMM_API_KEY=your_api_key_here
QUALCOMM_ENDPOINT=https://aisuite.cirrascale.com/apis/v2
QUALCOMM_MODEL=Llama-3.1-8B
```

### 4. Start the backend
```powershell
uvicorn backend.main:app --reload --port 8000
```
✅ You should see:
```
Mode  : QUALCOMM
Model : Llama-3.1-8B
Application startup complete.
```

### 5. Open the frontend
Double-click **`index.html`** — no server needed.

---

## 🧪 Running Tests

```powershell
.\backend\.venv\Scripts\Activate.ps1
python -m pytest backend/tests/ -v
```

```
16 passed in 1.66s
```

All 16 tests run **without a real API key** — they use the built-in mock provider.

---

## 📐 API Reference

### `GET /health`
Returns current mode and model.
```json
{ "status": "ok", "mode": "qualcomm", "model": "Llama-3.1-8B" }
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
    { "description": "...", "status": "confirmed", "evidence": "..." }
  ],
  "action_items": [
    {
      "task": "...", "owner": "...", "deadline": "...",
      "priority": "high", "status": "open",
      "evidence": "...", "missing_information": [],
      "review_status": "needs_review"
    }
  ],
  "risks": [
    { "description": "...", "severity": "high", "evidence": "..." }
  ],
  "missing_information": ["..."],
  "open_questions": ["..."],
  "mock": false,
  "model_used": "Llama-3.1-8B"
}
```

**Error Codes:**

| Code | Meaning |
|---|---|
| `422` | Empty notes or exceeds 16,000 character limit |
| `401` | Invalid API key |
| `429` | Rate limit exceeded |
| `502` | AI provider error or malformed response |
| `504` | Request timed out (>90s) |

---

## 🔒 Security Design

- ✅ API key stored only in `backend/.env` — never committed to git (`.gitignore` enforced)
- ✅ API key never appears in any browser request or response
- ✅ Error responses never include stack traces or credentials
- ✅ `mock: true` flag in response triggers a visible warning banner on the frontend
- ✅ Input validated server-side (empty notes, length limits)

---

## 📁 Project Structure

```
Smart-Meeting-Action-Extractor/
├── index.html              ← Single-page frontend (3 views)
├── style.css               ← Design system (soft palette)
├── script.js               ← All frontend logic + AI hook
├── README.md
├── pytest.ini
├── test_live.py            ← Real inference verification script
│
└── backend/
    ├── main.py             ← FastAPI app, CORS, startup logging
    ├── config.py           ← Settings (reads backend/.env)
    ├── models.py           ← Pydantic request/response schemas
    ├── prompt.py           ← Llama extraction prompt (INST format)
    ├── requirements.txt
    ├── .env                ← 🔒 Not committed — your credentials
    ├── .env.example        ← Template for setup
    │
    ├── providers/
    │   ├── qualcomm.py     ← Real Qualcomm AI adapter (async httpx)
    │   └── mock.py         ← Mock provider (no key required)
    │
    ├── routers/
    │   └── analysis.py     ← POST /api/v1/meetings/analyze, GET /health
    │
    └── tests/
        ├── conftest.py     ← pytest fixtures
        └── test_api.py     ← 16 test cases
```

---

## 👥 Team

| Name | Role |
|---|---|
| **Sai Harish** | Frontend · UI/UX · AI Integration |
| **Abhilash** | Qualcomm AI API · Backend Support |
| **Preetham** | Testing · Documentation |
| **Divya** | Design · Presentation |

---

## 🔑 Key Technical Decisions

### Why `/v2/completions` instead of `/v2/chat/completions`?
During integration we discovered that the Cirrascale deployment auto-triggers tool-calling mode on the chat completions endpoint for all models, returning empty content. The text completions endpoint (`/v2/completions`) works correctly and produces valid structured output. We use the Llama `[INST]` instruction format to guide the model.

### Why mock mode?
If no API key is configured, the backend automatically falls back to a sample result. This allows the frontend to be demoed and tested without credentials. A visible ⚠️ amber banner appears to clearly distinguish simulated from real results.

### Why localStorage instead of a database?
For hackathon scope, localStorage gives instant persistence without setup — no PostgreSQL, no migrations. The backend is fully stateless (one request = one AI call), which makes it trivially scalable.

---

## 🌐 Repository

**GitHub:** https://github.com/saiharish587/Smart-Meeting-Action-Extractor
