/**
 * app.js — UI Logic
 *
 * Handles:
 * - Input validation
 * - Loading / error state management
 * - Calling analyzeMeeting() from api.js
 * - Rendering all 4 dashboard sections
 * - "Load Sample Notes" and "Copy Results" features
 */

// ─── DOM References ──────────────────────────────────────────────────────────

const notesInput       = document.getElementById("notes-input");
const analyzeBtn       = document.getElementById("analyze-btn");
const loadSampleBtn    = document.getElementById("load-sample-btn");
const copyResultsBtn   = document.getElementById("copy-results-btn");
const charCount        = document.getElementById("char-count");
const validationMsg    = document.getElementById("validation-msg");
const errorBanner      = document.getElementById("error-banner");
const errorText        = document.getElementById("error-text");
const loadingOverlay   = document.getElementById("loading-overlay");
const resultsSection   = document.getElementById("results-section");

// Result containers
const summaryText      = document.getElementById("summary-text");
const decisionsContent = document.getElementById("decisions-content");
const actionContent    = document.getElementById("action-content");
const risksContent     = document.getElementById("risks-content");
const missingContent   = document.getElementById("missing-content");

// ─── State ───────────────────────────────────────────────────────────────────

let isLoading = false;
let lastResult = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.hidden = false;
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
  errorBanner.hidden = true;
  errorText.textContent = "";
}

function showValidation(message) {
  validationMsg.textContent = message;
  validationMsg.hidden = false;
}

function clearValidation() {
  validationMsg.hidden = true;
  validationMsg.textContent = "";
}

function setLoading(loading) {
  isLoading = loading;
  loadingOverlay.hidden = !loading;
  analyzeBtn.disabled = loading;
  loadSampleBtn.disabled = loading;
  analyzeBtn.textContent = loading ? "Analyzing…" : "Analyze Meeting";
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderSummary(summary) {
  summaryText.textContent = summary || "No summary generated.";
}

function renderDecisions(decisions) {
  if (!decisions || decisions.length === 0) {
    decisionsContent.innerHTML = `
      <p class="empty-state">No confirmed decisions were found in these notes.</p>`;
    return;
  }

  decisionsContent.innerHTML = decisions
    .map((d) => {
      const badge = `<span class="badge badge--${escHtml(d.status)}">${escHtml(d.status)}</span>`;
      return `<div class="decision-item">
        <span class="decision-desc">${escHtml(d.description)}</span>
        ${badge}
      </div>`;
    })
    .join("");
}

function renderActionItems(items) {
  if (!items || items.length === 0) {
    actionContent.innerHTML = `
      <p class="empty-state">No action items were identified.</p>`;
    return;
  }

  const rows = items
    .map((item) => {
      const missingHtml =
        item.missing_information && item.missing_information.length > 0
          ? `<ul class="missing-list">${item.missing_information
              .map((m) => `<li>⚠ ${escHtml(m)}</li>`)
              .join("")}</ul>`
          : "";

      const reviewBadge = `<span class="badge badge--${escHtml(item.review_status)}">${
        item.review_status === "needs_review" ? "Needs Review" : "Confirmed"
      }</span>`;

      return `<tr>
        <td>
          <span class="task-desc">${escHtml(item.task)}</span>
          ${missingHtml}
        </td>
        <td>${escHtml(item.owner)}</td>
        <td>${escHtml(item.deadline)}</td>
        <td>${reviewBadge}</td>
      </tr>`;
    })
    .join("");

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
    html += risks
      .map(
        (r) => `<div class="risk-item risk--${escHtml(r.severity)}">
          <span class="risk-icon">${r.severity === "high" ? "🔴" : r.severity === "medium" ? "🟡" : "🟢"}</span>
          <div>
            <span class="risk-severity">${escHtml(r.severity.toUpperCase())}</span>
            <span class="risk-desc">${escHtml(r.description)}</span>
          </div>
        </div>`
      )
      .join("");
  }

  if (missingInfo && missingInfo.length > 0) {
    html += `<div class="missing-section">
      <h4 class="missing-heading">Missing Information</h4>
      <ul class="missing-list missing-list--standalone">
        ${missingInfo.map((m) => `<li>${escHtml(m)}</li>`).join("")}
      </ul>
    </div>`;
  }

  if (!html) {
    risksContent.innerHTML = `<p class="empty-state">No risks or missing information identified.</p>`;
  } else {
    risksContent.innerHTML = html;
  }
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

// ─── Event Handlers ───────────────────────────────────────────────────────────

notesInput.addEventListener("input", () => {
  const len = notesInput.value.length;
  charCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
  if (notesInput.value.trim()) clearValidation();
});

analyzeBtn.addEventListener("click", async () => {
  if (isLoading) return;

  clearError();
  clearValidation();

  const notes = notesInput.value;

  // FR-01: Input validation
  if (!notes || !notes.trim()) {
    showValidation("Please enter meeting notes before analyzing.");
    notesInput.focus();
    return;
  }

  setLoading(true);

  try {
    const result = await analyzeMeeting(notes);
    lastResult = result;
    renderResults(result);
  } catch (err) {
    showError(
      err.message || "An unexpected error occurred. Please try again."
    );
    console.error("[Smart Meeting Extractor] Error:", err);
  } finally {
    setLoading(false);
  }
});

loadSampleBtn.addEventListener("click", () => {
  if (isLoading) return;
  notesInput.value = SAMPLE_MEETING_NOTES;
  const len = notesInput.value.length;
  charCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
  clearValidation();
  clearError();
  notesInput.focus();
});

copyResultsBtn.addEventListener("click", () => {
  if (!lastResult) return;

  const lines = [];
  lines.push("=== MEETING ANALYSIS RESULTS ===\n");

  lines.push("SUMMARY");
  lines.push(lastResult.summary);
  lines.push("");

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
  if (lastResult.action_items.length === 0) {
    lines.push("None identified.");
  } else {
    lastResult.action_items.forEach((item) => {
      lines.push(`• ${item.task}`);
      lines.push(`  Owner: ${item.owner}  |  Deadline: ${item.deadline}  |  Status: ${item.review_status}`);
      if (item.missing_information.length > 0) {
        item.missing_information.forEach((m) => lines.push(`  ⚠ ${m}`));
      }
    });
  }
  lines.push("");

  lines.push("RISKS & MISSING INFORMATION");
  if (lastResult.risks.length === 0 && lastResult.missing_information.length === 0) {
    lines.push("None identified.");
  } else {
    lastResult.risks.forEach((r) =>
      lines.push(`• [${r.severity.toUpperCase()}] ${r.description}`)
    );
    lastResult.missing_information.forEach((m) => lines.push(`• MISSING: ${m}`));
  }

  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => {
      copyResultsBtn.textContent = "✓ Copied!";
      setTimeout(() => (copyResultsBtn.textContent = "Copy Results"), 2000);
    })
    .catch(() => {
      showError("Could not copy to clipboard. Please select and copy manually.");
    });
});

// Close error banner
document.getElementById("error-close").addEventListener("click", clearError);
