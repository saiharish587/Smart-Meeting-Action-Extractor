/**
 * script.js — Smart Meeting Action Extractor
 *
 * Task A1 ✅ Project structure (index.html + style.css + script.js)
 * Task A2 ✅ Meeting input interface — textarea, validation, character count
 * Task A3 ✅ Results dashboard — 4 sections rendered from sample JSON
 * Task A4 🔜 AI integration — waiting for teammate's endpoint details
 *            Search for "A4:" below to find the integration hook.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// A3 — SAMPLE JSON  (temporary data used until real AI output arrives)
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_NOTES = `Project Sync — Oct 14, 2026

Attendees: Sai Harish, Abhilash, Preetham, Divya

1. Dashboard UI
   Sai Harish will build the action-item dashboard by Friday. He needs the API
   integration details from Abhilash before he can connect the frontend.

2. API Testing
   Abhilash will test the Qualcomm AI endpoint today. The deadline for full API
   integration is end of day Thursday.

3. Authentication Issue
   Preetham will investigate the authentication bug. The team has not yet decided
   on a deadline — it depends on how complex the root cause turns out to be.

4. Database Migration
   The team discussed migrating to a new database for better performance.
   No decision was made — Divya will research options and bring a proposal
   to the next meeting.

5. Risk
   If the Qualcomm API access is blocked, the frontend demo will not show live
   AI output. The team agreed to use mock data as a fallback but did not assign
   a specific owner for maintaining that fallback.`;

const SAMPLE_JSON = {
  summary:
    "The team held a project sync covering the dashboard UI, API integration, an " +
    "authentication bug, and a proposed database migration. Sai Harish is building " +
    "the dashboard and needs API details from Abhilash by Thursday. Preetham is " +
    "investigating an authentication issue with no deadline agreed yet. A database " +
    "migration was discussed but no decision was made — Divya will research and report back.",

  decisions: [
    {
      description:
        "Use mock data as a fallback if the Qualcomm API is unavailable during the demo.",
      status: "confirmed",
    },
    {
      description:
        "Abhilash will deliver API integration details by end of day Thursday.",
      status: "confirmed",
    },
  ],

  action_items: [
    {
      task: "Build the action-item dashboard UI",
      owner: "Sai Harish",
      deadline: "Friday",
      missing_information: [
        "Awaiting API integration details from Abhilash before frontend can connect to live AI",
      ],
      review_status: "needs_review",
    },
    {
      task: "Test the Qualcomm AI endpoint and deliver integration details",
      owner: "Abhilash",
      deadline: "Thursday (end of day)",
      missing_information: [],
      review_status: "confirmed",
    },
    {
      task: "Investigate and resolve the authentication bug",
      owner: "Preetham",
      deadline: "Not specified",
      missing_information: [
        "Deadline depends on root cause complexity — not yet agreed by the team",
      ],
      review_status: "needs_review",
    },
    {
      task: "Research database migration options and prepare a proposal",
      owner: "Divya",
      deadline: "Not specified",
      missing_information: ["No deadline was set for the research deliverable"],
      review_status: "needs_review",
    },
  ],

  risks: [
    {
      description:
        "Qualcomm API access may be blocked, preventing live AI output in the demo.",
      severity: "high",
    },
    {
      description:
        "No owner assigned for maintaining the mock-data fallback if the API fails.",
      severity: "medium",
    },
    {
      description:
        "Authentication bug has no deadline — could delay dependent features.",
      severity: "medium",
    },
  ],

  missing_information: [
    "Deadline for authentication bug resolution has not been set.",
    "No deadline assigned for the database migration research.",
    "Ownership of the mock-data fallback maintenance is unclear.",
    "Database migration was discussed but not decided — outcome is unresolved.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// A4 🔜 — AI INTEGRATION HOOK  (fill in when teammate delivers endpoint details)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * analyzeMeeting(notes)
 *
 * RIGHT NOW (A1–A3):  returns SAMPLE_JSON after a short fake delay
 *                     so the full UI can be developed and tested.
 *
 * WHEN A4 STARTS:     replace the body below with a real fetch() call
 *                     to the Qualcomm endpoint your teammate provides.
 *
 * @param   {string}  notes  Raw meeting notes from the textarea
 * @returns {Promise<object>} Parsed + normalised result object
 */
async function analyzeMeeting(notes) {
  // ── A4: replace this block with the real API call ──────────────────────────
  await delay(1800); // simulate network latency
  return normalise(SAMPLE_JSON);
  // ── End A4 replacement block ───────────────────────────────────────────────
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns a promise that resolves after `ms` milliseconds */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Escape HTML to prevent XSS */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Make sure every field in the result object exists and has the right type */
function normalise(raw) {
  const safe = (v, fb) => (v !== undefined && v !== null ? v : fb);

  const normItem = (i) => ({
    task: safe(i.task, "Unspecified task"),
    owner: safe(i.owner, "Not specified"),
    deadline: safe(i.deadline, "Not specified"),
    missing_information: Array.isArray(i.missing_information) ? i.missing_information : [],
    review_status: ["confirmed", "needs_review"].includes(i.review_status)
      ? i.review_status
      : "needs_review",
  });

  const normDecision = (d) => ({
    description: safe(d.description, "Unspecified decision"),
    status: ["confirmed", "proposed", "unresolved"].includes(d.status) ? d.status : "unresolved",
  });

  const normRisk = (r) => ({
    description: safe(r.description, "Unspecified risk"),
    severity: ["high", "medium", "low"].includes(r.severity) ? r.severity : "medium",
  });

  return {
    summary: safe(raw.summary, "No summary available."),
    decisions: Array.isArray(raw.decisions) ? raw.decisions.map(normDecision) : [],
    action_items: Array.isArray(raw.action_items) ? raw.action_items.map(normItem) : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(normRisk) : [],
    missing_information: Array.isArray(raw.missing_information) ? raw.missing_information : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOM REFERENCES
// ═══════════════════════════════════════════════════════════════════════════════

const notesInput      = document.getElementById("notes-input");
const analyzeBtn      = document.getElementById("analyze-btn");
const loadSampleBtn   = document.getElementById("load-sample-btn");
const copyResultsBtn  = document.getElementById("copy-results-btn");
const charCount       = document.getElementById("char-count");
const validationMsg   = document.getElementById("validation-msg");
const errorBanner     = document.getElementById("error-banner");
const errorText       = document.getElementById("error-text");
const loadingOverlay  = document.getElementById("loading-overlay");
const resultsSection  = document.getElementById("results-section");

const summaryText     = document.getElementById("summary-text");
const decisionsContent= document.getElementById("decisions-content");
const actionContent   = document.getElementById("action-content");
const risksContent    = document.getElementById("risks-content");

// ═══════════════════════════════════════════════════════════════════════════════
// A2 — STATE & UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let isLoading  = false;
let lastResult = null;

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.hidden = false;
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function clearError()      { errorBanner.hidden = true; errorText.textContent = ""; }

function showValidation(msg) { validationMsg.textContent = msg; validationMsg.hidden = false; }
function clearValidation()   { validationMsg.hidden = true; validationMsg.textContent = ""; }

function setLoading(on) {
  isLoading = on;
  loadingOverlay.hidden = !on;
  analyzeBtn.disabled   = on;
  loadSampleBtn.disabled = on;
  analyzeBtn.textContent = on ? "⏳ Analyzing…" : "🔍 Analyze Meeting";
}

// ═══════════════════════════════════════════════════════════════════════════════
// A3 — RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function renderSummary(summary) {
  summaryText.textContent = summary || "No summary generated.";
}

function renderDecisions(decisions) {
  if (!decisions || decisions.length === 0) {
    decisionsContent.innerHTML =
      `<p class="empty-state">No confirmed decisions were found in these notes.</p>`;
    return;
  }
  decisionsContent.innerHTML = decisions
    .map(
      (d) =>
        `<div class="decision-item">
          <span class="decision-desc">${esc(d.description)}</span>
          <span class="badge badge--${esc(d.status)}">${esc(d.status)}</span>
        </div>`
    )
    .join("");
}

function renderActionItems(items) {
  if (!items || items.length === 0) {
    actionContent.innerHTML =
      `<p class="empty-state">No action items were identified.</p>`;
    return;
  }

  const rows = items.map((item) => {
    const missingHtml =
      item.missing_information.length > 0
        ? `<ul class="missing-list">${item.missing_information
            .map((m) => `<li>⚠ ${esc(m)}</li>`)
            .join("")}</ul>`
        : "";

    const reviewLabel = item.review_status === "needs_review" ? "Needs Review" : "Confirmed";

    return `<tr>
      <td><span class="task-desc">${esc(item.task)}</span>${missingHtml}</td>
      <td>${esc(item.owner)}</td>
      <td>${esc(item.deadline)}</td>
      <td><span class="badge badge--${esc(item.review_status)}">${reviewLabel}</span></td>
    </tr>`;
  }).join("");

  actionContent.innerHTML = `
    <div class="table-wrapper">
      <table class="action-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Owner</th>
            <th>Deadline</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderRisks(risks, missingInfo) {
  let html = "";

  if (risks && risks.length > 0) {
    const icons = { high: "🔴", medium: "🟡", low: "🟢" };
    html += risks.map((r) =>
      `<div class="risk-item risk--${esc(r.severity)}">
        <span class="risk-icon">${icons[r.severity] || "⚪"}</span>
        <div>
          <span class="risk-severity">${esc(r.severity.toUpperCase())}</span>
          <span class="risk-desc">${esc(r.description)}</span>
        </div>
      </div>`
    ).join("");
  }

  if (missingInfo && missingInfo.length > 0) {
    html += `<div class="missing-section">
      <h4 class="missing-heading">Missing Information</h4>
      <ul class="missing-list missing-list--standalone">
        ${missingInfo.map((m) => `<li>${esc(m)}</li>`).join("")}
      </ul>
    </div>`;
  }

  risksContent.innerHTML =
    html || `<p class="empty-state">No risks or missing information identified.</p>`;
}

function renderResults(result) {
  renderSummary(result.summary);
  renderDecisions(result.decisions);
  renderActionItems(result.action_items);
  renderRisks(result.risks, result.missing_information);

  resultsSection.hidden = false;
  copyResultsBtn.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// A2 — EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// Character count
notesInput.addEventListener("input", () => {
  const len = notesInput.value.length;
  charCount.textContent = `${len.toLocaleString()} character${len !== 1 ? "s" : ""}`;
  if (notesInput.value.trim()) clearValidation();
});

// Analyze button
analyzeBtn.addEventListener("click", async () => {
  if (isLoading) return;

  clearError();
  clearValidation();

  const notes = notesInput.value;

  // A2: empty / whitespace rejection
  if (!notes || !notes.trim()) {
    showValidation("Please enter your meeting notes before analyzing.");
    notesInput.focus();
    return;
  }

  setLoading(true);
  try {
    const result = await analyzeMeeting(notes); // A4 hook
    lastResult = result;
    renderResults(result);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
    console.error("[Meeting Extractor]", err);
  } finally {
    setLoading(false);
  }
});

// Load Sample Notes
loadSampleBtn.addEventListener("click", () => {
  if (isLoading) return;
  notesInput.value = SAMPLE_NOTES;
  const len = SAMPLE_NOTES.length;
  charCount.textContent = `${len.toLocaleString()} characters`;
  clearValidation();
  clearError();
  notesInput.focus();
});

// Dismiss error banner
document.getElementById("error-close").addEventListener("click", clearError);

// Copy Results (A5 — available from A3 onwards for demo use)
copyResultsBtn.addEventListener("click", () => {
  if (!lastResult) return;

  const lines = ["=== MEETING ANALYSIS RESULTS ===\n"];

  lines.push("SUMMARY\n" + lastResult.summary + "\n");

  lines.push("KEY DECISIONS");
  if (lastResult.decisions.length === 0) {
    lines.push("None identified.");
  } else {
    lastResult.decisions.forEach((d) =>
      lines.push(`• [${d.status.toUpperCase()}] ${d.description}`)
    );
  }
  lines.push("");

  lines.push("ACTION ITEMS");
  lastResult.action_items.forEach((item) => {
    lines.push(`• ${item.task}`);
    lines.push(`  Owner: ${item.owner}  |  Deadline: ${item.deadline}  |  Status: ${item.review_status}`);
    item.missing_information.forEach((m) => lines.push(`  ⚠ ${m}`));
  });
  lines.push("");

  lines.push("RISKS & MISSING INFORMATION");
  lastResult.risks.forEach((r) =>
    lines.push(`• [${r.severity.toUpperCase()}] ${r.description}`)
  );
  lastResult.missing_information.forEach((m) => lines.push(`• MISSING: ${m}`));

  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => {
      copyResultsBtn.textContent = "✓ Copied!";
      setTimeout(() => (copyResultsBtn.textContent = "📋 Copy Results"), 2000);
    })
    .catch(() => showError("Could not copy to clipboard — please select and copy manually."));
});
