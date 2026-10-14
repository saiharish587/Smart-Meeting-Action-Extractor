/* ============================================================================
   script.js — Smart Meeting Action Extractor
   Infosys Hack-AI-Thon 2026 · EP-01 · Team: DEV FORCE
   Institution: B V Raju Institute of Technology, Narsapur

   Page 1 ✅  Meetings — create, list, edit notes, draft save
   Page 2 ✅  Meeting Insights — summary, tasks, decisions, risks
   Page 3 ✅  My Progress — stats, completion rate, pending task list
   A4    🔜  AI integration hook — search "A4:" to find the swap point
   ============================================================================ */

'use strict';

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════════════════════

const SAMPLE_NOTES = `Project Sync — Smart Meeting Action Extractor
Date: 14 October 2026
Attendees: Sai Harish, Abhilash, Preetham, Divya

1. Dashboard UI
   Sai Harish will build the action-item dashboard by Friday.
   He needs the API integration details from Abhilash before connecting the frontend.

2. API Testing
   Abhilash will test the Qualcomm Cloud AI endpoint today.
   The deadline for full API integration is end of day Thursday.

3. Authentication Issue
   Preetham will investigate the authentication bug.
   The team has not yet decided on a deadline — it depends on the root cause.

4. Design Review
   The team agreed to use a clean navy and violet colour palette.
   Divya will prepare sample screenshots by Wednesday.

5. Risk: API Rate Limits
   Qualcomm Cloud AI may impose rate limits during the hackathon demo.
   The team should prepare an offline fallback using cached sample data.

6. Open Items
   - No decision has been made on whether to use REST or GraphQL.
   - Database schema for storing meeting results is not yet finalised.`;

// The agreed AI response schema — used as sample output until A4 is connected
const SAMPLE_AI_RESULT = {
  summary: "The team synced on the Smart Meeting Action Extractor project. Sai Harish is responsible for building the action-item dashboard by Friday, pending API details from Abhilash. Abhilash will test the Qualcomm AI endpoint today with a Thursday deadline for full integration. Preetham is investigating an authentication bug with no deadline set. The team agreed on a navy and violet colour scheme. Key risks include potential API rate limits during the demo, and several architectural decisions remain unresolved.",

  decisions: [
    {
      description: "Use a clean navy and violet colour palette for the application interface.",
      status: "confirmed",
      evidence: "The team agreed to use a clean navy and violet colour palette."
    },
    {
      description: "Prepare an offline fallback using cached sample data to mitigate API rate limit risks.",
      status: "proposed",
      evidence: "The team should prepare an offline fallback using cached sample data."
    }
  ],

  action_items: [
    {
      task: "Build the action-item dashboard",
      owner: "Sai Harish",
      deadline: "Friday",
      priority: "high",
      missing_information: ["Requires API integration details from Abhilash before frontend can be connected"],
      evidence: "Sai Harish will build the action-item dashboard by Friday."
    },
    {
      task: "Test the Qualcomm Cloud AI endpoint",
      owner: "Abhilash",
      deadline: "Today",
      priority: "high",
      missing_information: [],
      evidence: "Abhilash will test the Qualcomm Cloud AI endpoint today."
    },
    {
      task: "Complete full API integration",
      owner: "Abhilash",
      deadline: "End of day Thursday",
      priority: "high",
      missing_information: [],
      evidence: "The deadline for full API integration is end of day Thursday."
    },
    {
      task: "Investigate the authentication bug",
      owner: "Preetham",
      deadline: "Not specified",
      priority: "medium",
      missing_information: ["Deadline not set — depends on root cause complexity"],
      evidence: "Preetham will investigate the authentication bug."
    },
    {
      task: "Prepare sample screenshots of the design",
      owner: "Divya",
      deadline: "Wednesday",
      priority: "low",
      missing_information: [],
      evidence: "Divya will prepare sample screenshots by Wednesday."
    }
  ],

  risks: [
    {
      description: "Qualcomm Cloud AI may impose rate limits during the hackathon live demo.",
      severity: "high"
    }
  ],

  missing_information: [
    "No decision made on REST vs GraphQL for the API architecture",
    "Database schema for storing meeting results is not yet finalised",
    "No deadline assigned to the authentication bug investigation"
  ]
};

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY  = 'smae_v1';
const BACKEND_URL  = 'http://localhost:8000'; // FastAPI backend (run: uvicorn backend.main:app --reload)

// ══════════════════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════════════════

let state = {
  meetings:      {},  // { [id]: Meeting }
  tasks:         {},  // { [id]: Task }
  decisions:     {},  // { [id]: Decision }
  openQuestions: {}   // { [id]: OpenQuestion }
};

// UI state (not persisted)
let currentPage          = 'meetings';
let currentMeetingId     = null;
let meetingsSubView      = 'list';  // 'list' | 'notes'
let taskStatusFilter     = 'all';
let meetingStatusFilter  = 'all';
let meetingSearchQuery   = '';
let taskModalIsNew       = false;

// ══════════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════════

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function nowISO() { return new Date().toISOString(); }

/** Format "YYYY-MM-DD" without timezone shift */
function fmtDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function dateParts(dateStr) {
  if (!dateStr) return { day: '--', mon: '---' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    day: d,
    mon: dt.toLocaleDateString('en-US', { month: 'short' })
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Safe HTML-escape */
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function statusLabel(s) {
  return { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }[s] || capitalize(s);
}

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════════════════════════════

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[MeetingAI] localStorage write failed:', e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      meetings:      parsed.meetings      || {},
      tasks:         parsed.tasks         || {},
      decisions:     parsed.decisions     || {},
      openQuestions: parsed.openQuestions || {}
    };
  } catch (e) {
    console.warn('[MeetingAI] localStorage read failed:', e);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STATE MUTATIONS
// ══════════════════════════════════════════════════════════════════════════════

function createMeeting({ title, date, type }) {
  const id = genId();
  state.meetings[id] = {
    id, title,
    date:  date || todayStr(),
    type:  type || '',
    notes: '',
    summary: '',
    status: 'draft',
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  saveState();
  return state.meetings[id];
}

function updateMeeting(id, data) {
  if (!state.meetings[id]) return;
  Object.assign(state.meetings[id], data, { updatedAt: nowISO() });
  saveState();
}

function createTask({ meetingId, task, owner, deadline, priority, status, missing_information, evidence, isManual }) {
  const id = genId();
  state.tasks[id] = {
    id, meetingId,
    task:               task || 'Untitled task',
    owner:              (owner && owner !== 'Not specified') ? owner : 'Not specified',
    deadline:           (deadline && deadline !== 'Not specified') ? deadline : 'Not specified',
    priority:           ['high','medium','low'].includes(priority) ? priority : 'medium',
    status:             ['pending','in_progress','completed','cancelled'].includes(status) ? status : 'pending',
    missing_information: Array.isArray(missing_information) ? missing_information : [],
    evidence:           evidence || '',
    isManual:           !!isManual,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  saveState();
  return state.tasks[id];
}

function updateTask(id, data) {
  if (!state.tasks[id]) return;
  Object.assign(state.tasks[id], data, { updatedAt: nowISO() });
  saveState();
}

function deleteTask(id) {
  if (!state.tasks[id]) return;
  delete state.tasks[id];
  saveState();
}

function createDecision({ meetingId, description, status, evidence }) {
  const id = genId();
  state.decisions[id] = {
    id, meetingId,
    description: description || '',
    status: ['confirmed','proposed','unresolved'].includes(status) ? status : 'confirmed',
    evidence: evidence || '',
    createdAt: nowISO()
  };
  saveState();
  return state.decisions[id];
}

function createOpenQuestion({ meetingId, description, category }) {
  const id = genId();
  state.openQuestions[id] = {
    id, meetingId,
    description: description || '',
    category: category || 'Needs Clarification',
    resolved: false,
    createdAt: nowISO()
  };
  saveState();
  return state.openQuestions[id];
}

/** Remove all AI-generated results for a meeting (decisions, questions, AI tasks).
 *  Manual tasks are optionally preserved — pass keepManual=true. */
function clearAnalysis(meetingId, keepManual = false) {
  Object.keys(state.tasks).forEach(id => {
    if (state.tasks[id].meetingId === meetingId) {
      if (!keepManual || !state.tasks[id].isManual) delete state.tasks[id];
    }
  });
  Object.keys(state.decisions).forEach(id => {
    if (state.decisions[id].meetingId === meetingId) delete state.decisions[id];
  });
  Object.keys(state.openQuestions).forEach(id => {
    if (state.openQuestions[id].meetingId === meetingId) delete state.openQuestions[id];
  });
  saveState();
}

// ══════════════════════════════════════════════════════════════════════════════
// SELECTORS
// ══════════════════════════════════════════════════════════════════════════════

function getMeetingTasks(meetingId) {
  return Object.values(state.tasks)
    .filter(t => t.meetingId === meetingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getMeetingDecisions(meetingId) {
  return Object.values(state.decisions)
    .filter(d => d.meetingId === meetingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getMeetingOpenQuestions(meetingId) {
  return Object.values(state.openQuestions)
    .filter(q => q.meetingId === meetingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getAllPendingTasks() {
  return Object.values(state.tasks)
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getStats() {
  const tasks      = Object.values(state.tasks);
  const active     = tasks.filter(t => t.status !== 'cancelled');
  const completed  = tasks.filter(t => t.status === 'completed');
  const pending    = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const pct        = active.length > 0 ? Math.round(completed.length / active.length * 100) : 0;
  return {
    totalMeetings:  Object.keys(state.meetings).length,
    totalTasks:     tasks.length,
    completedTasks: completed.length,
    pendingTasks:   pending.length,
    activeTasks:    active.length,
    completionPct:  pct
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INTEGRATION (A4 hook)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Analyse meeting notes via the FastAPI backend → Qualcomm Cirrascale AI.
 *
 * The backend at BACKEND_URL handles API key security and AI provider selection.
 * If no API key is configured on the backend, it returns mock results with mock=true.
 *
 * @param  {string} notes  Raw meeting notes from the textarea
 * @returns {Promise<object>} Normalised AI result
 */
async function analyzeMeeting(notes) {
  // A4: connected to FastAPI backend (POST /api/v1/meetings/analyze)
  let response;
  try {
    response = await fetch(`${BACKEND_URL}/api/v1/meetings/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notes }),
    });
  } catch (networkErr) {
    throw new Error(
      'Could not reach the backend server. Make sure it is running:\n' +
      '  cd backend && uvicorn backend.main:app --reload'
    );
  }

  if (!response.ok) {
    let detail = `Server error ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_) { /* ignore parse errors on error body */ }
    throw new Error(detail);
  }

  const data = await response.json();

  // Show a visible banner when the backend is running in mock mode
  if (data.mock) {
    showMockBanner();
  } else {
    hideMockBanner();
  }

  return normaliseAIResult(data);
}

/** Show/hide the mock mode indicator banner */
function showMockBanner() {
  let banner = document.getElementById('mock-mode-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'mock-mode-banner';
    banner.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999',
      'background:#f59e0b', 'color:#1c1917', 'padding:10px 18px',
      'border-radius:8px', 'font-size:13px', 'font-weight:600',
      'box-shadow:0 4px 12px rgba(0,0,0,0.2)', 'display:flex',
      'align-items:center', 'gap:8px'
    ].join(';');
    banner.innerHTML = '&#9888; Mock Mode &#8212; No API key configured. Results are simulated.';
    document.body.appendChild(banner);
    // Auto-dismiss after 8 seconds
    setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 8000);
  }
}

function hideMockBanner() {
  const banner = document.getElementById('mock-mode-banner');
  if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
}

/** Coerce raw AI JSON into the agreed internal schema.
 *  Handles missing fields, wrong types, truncated responses, and new
 *  fields (open_questions, review_status, mock flag) gracefully. */
function normaliseAIResult(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('AI returned an empty or invalid response.');

  const safe = (v, fb) => (v !== null && v !== undefined && v !== '') ? v : fb;

  const normItem = i => ({
    task:                safe(i.task, 'Unspecified task'),
    owner:               safe(i.owner, 'Not specified'),
    deadline:            safe(i.deadline, 'Not specified'),
    priority:            ['high','medium','low','not_specified'].includes(i.priority) ? i.priority : 'medium',
    status:              ['open','in_progress','completed'].includes(i.status) ? i.status : 'open',
    missing_information: Array.isArray(i.missing_information) ? i.missing_information : [],
    evidence:            safe(i.evidence, ''),
    review_status:       ['needs_review','approved','rejected'].includes(i.review_status) ? i.review_status : 'needs_review',
  });

  const normDecision = d => ({
    description: safe(d.description, 'Unspecified decision'),
    status:      ['confirmed','proposed','needs_review','unresolved'].includes(d.status) ? d.status : 'confirmed',
    evidence:    safe(d.evidence, ''),
  });

  const normRisk = r => ({
    description: safe(r.description, 'Unspecified risk'),
    severity:    ['high','medium','low'].includes(r.severity) ? r.severity : 'medium',
    evidence:    safe(r.evidence, ''),
  });

  return {
    summary:             safe(raw.summary, 'No summary available.'),
    decisions:           Array.isArray(raw.decisions)           ? raw.decisions.map(normDecision)     : [],
    action_items:        Array.isArray(raw.action_items)        ? raw.action_items.map(normItem)      : [],
    risks:               Array.isArray(raw.risks)               ? raw.risks.map(normRisk)             : [],
    missing_information: Array.isArray(raw.missing_information) ? raw.missing_information             : [],
    open_questions:      Array.isArray(raw.open_questions)      ? raw.open_questions                  : [],
    mock:                !!raw.mock,
    model_used:          raw.model_used || null,
  };
}


// ══════════════════════════════════════════════════════════════════════════════
// ROUTING / NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Navigate to a page.
 * @param {string} page  'meetings' | 'insights' | 'progress'
 * @param {object} opts  { subView, meetingId }
 */
function navigate(page, opts = {}) {
  currentPage = page;

  // Hide all pages
  ['meetings', 'insights', 'progress'].forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.hidden = (p !== page);
  });

  // Update sidebar nav active state
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === page);
  });

  // Update insights nav enabled state
  const navInsights = document.getElementById('nav-insights');
  if (navInsights) navInsights.classList.toggle('disabled', !currentMeetingId);

  // Page-specific setup
  if (page === 'meetings') {
    if (opts.subView === 'notes' && opts.meetingId) {
      currentMeetingId = opts.meetingId;
      meetingsSubView  = 'notes';
      showNotesView(opts.meetingId);
    } else {
      meetingsSubView = 'list';
      document.getElementById('meetings-list-view').hidden  = false;
      document.getElementById('meetings-notes-view').hidden = true;
      renderMeetingsList();
    }
  } else if (page === 'insights') {
    if (opts.meetingId) currentMeetingId = opts.meetingId;
    renderInsightsPage();
  } else if (page === 'progress') {
    renderProgressPage();
  }

  // Scroll top
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  // Focus first focusable element
  const focusable = el.querySelector('input:not([type=hidden]), select, textarea, button:not(.modal-close)');
  if (focusable) setTimeout(() => focusable.focus(), 60);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
  // Only restore scroll if no other modals are open
  if (!document.querySelector('.modal-overlay:not([hidden])')) {
    document.body.style.overflow = '';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — MEETINGS
// ══════════════════════════════════════════════════════════════════════════════

function renderMeetingsList() {
  const container = document.getElementById('meetings-list-container');

  // Sort: newest date first; ties broken by createdAt descending
  let meetings = Object.values(state.meetings)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  // Search
  if (meetingSearchQuery) {
    const q = meetingSearchQuery.toLowerCase();
    meetings = meetings.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.type || '').toLowerCase().includes(q)
    );
  }

  // Status filter
  if (meetingStatusFilter !== 'all') {
    meetings = meetings.filter(m => m.status === meetingStatusFilter);
  }

  if (meetings.length === 0) {
    const hasFilter = meetingStatusFilter !== 'all' || meetingSearchQuery;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${hasFilter ? '🔍' : '📅'}</div>
        <div class="empty-title">${hasFilter ? 'No meetings match your search' : 'No meetings yet'}</div>
        <p class="empty-sub">
          ${hasFilter
            ? 'Try adjusting your search term or filter.'
            : 'Click <strong>+ New Meeting</strong> to create your first one.'
          }
        </p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="meeting-list">${meetings.map(meetingCardHTML).join('')}</div>`;
}

function meetingCardHTML(m) {
  const { day, mon } = dateParts(m.date);
  const taskCount    = getMeetingTasks(m.id).length;

  const statusBadge = {
    draft:     '<span class="badge badge-draft">Draft</span>',
    analyzing: '<span class="badge badge-analyzing">⏳ Analyzing</span>',
    complete:  '<span class="badge badge-complete">✓ Analyzed</span>',
    error:     '<span class="badge badge-error">⚠ Error</span>'
  }[m.status] || '';

  return `
    <div class="meeting-card" data-mid="${esc(m.id)}">
      <div class="meeting-date-badge" aria-hidden="true">
        <span class="date-day">${esc(String(day))}</span>
        <span class="date-mon">${esc(mon)}</span>
      </div>
      <div class="meeting-info">
        <div class="meeting-title-row">${esc(m.title)}</div>
        <div class="meeting-meta">
          ${m.type ? `<span>${esc(m.type)}</span><span>·</span>` : ''}
          <span>${fmtDate(m.date)}</span>
          ${taskCount > 0 ? `<span>·</span><span>${taskCount} task${taskCount !== 1 ? 's' : ''}</span>` : ''}
          ${statusBadge}
        </div>
      </div>
      <div class="meeting-actions">
        <button class="btn btn-primary btn-sm" data-open-mid="${esc(m.id)}" aria-label="Open ${esc(m.title)}">
          Open →
        </button>
      </div>
    </div>`;
}

function showNotesView(meetingId) {
  const m = state.meetings[meetingId];
  if (!m) return;

  document.getElementById('meetings-list-view').hidden  = true;
  document.getElementById('meetings-notes-view').hidden = false;

  document.getElementById('editor-meeting-title').textContent = m.title;
  document.getElementById('editor-meeting-meta').textContent =
    fmtDate(m.date) + (m.type ? ' · ' + m.type : '');

  const badge = {
    draft:     '<span class="badge badge-draft">Draft</span>',
    analyzing: '<span class="badge badge-analyzing">⏳ Analyzing</span>',
    complete:  '<span class="badge badge-complete">✓ Analyzed</span>',
    error:     '<span class="badge badge-error">⚠ Error</span>'
  }[m.status] || '';
  document.getElementById('editor-status-badge').innerHTML = badge;

  const ta = document.getElementById('notes-textarea');
  ta.value = m.notes || '';
  updateCharCount(ta.value.length);

  document.getElementById('editor-loading').hidden = true;
  document.getElementById('editor-banner').hidden  = true;
}

function updateCharCount(len) {
  document.getElementById('editor-char-count').textContent =
    `${len.toLocaleString()} character${len !== 1 ? 's' : ''}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYSIS WORKFLOW
// ══════════════════════════════════════════════════════════════════════════════

async function runAnalysis(meetingId) {
  const m = state.meetings[meetingId];
  if (!m) return;

  const notes = m.notes || '';
  if (!notes.trim()) {
    showEditorBanner('warning', 'Please enter meeting notes before analyzing.');
    return;
  }

  // Lock UI
  updateMeeting(meetingId, { status: 'analyzing' });
  document.getElementById('editor-status-badge').innerHTML =
    '<span class="badge badge-analyzing">⏳ Analyzing</span>';
  document.getElementById('editor-loading').hidden   = false;
  document.getElementById('editor-banner').hidden    = true;
  document.getElementById('btn-analyze').disabled    = true;
  document.getElementById('btn-save-draft').disabled = true;
  document.getElementById('btn-load-sample').disabled= true;

  try {
    const result = await analyzeMeeting(notes);

    // Persist results
    updateMeeting(meetingId, { summary: result.summary, status: 'complete' });

    // Clear old AI results (keep manual tasks)
    clearAnalysis(meetingId, true);

    // Persist tasks
    (result.action_items || []).forEach(item =>
      createTask({ meetingId, ...item })
    );

    // Persist decisions
    (result.decisions || []).forEach(d =>
      createDecision({ meetingId, ...d })
    );

    // Persist risks as open questions
    (result.risks || []).forEach(r =>
      createOpenQuestion({
        meetingId,
        description: r.description,
        category: r.severity === 'high' ? 'Potential Risk' : 'Potential Risk'
      })
    );

    // Persist missing information as open questions
    (result.missing_information || []).forEach(m => {
      const lower = m.toLowerCase();
      const category =
        lower.includes('owner') || lower.includes('assign') ? 'Owner Missing' :
        lower.includes('deadline') || lower.includes('date') || lower.includes('due') ? 'Deadline Missing' :
        'Needs Clarification';
      createOpenQuestion({ meetingId, description: m, category });
    });

    // Navigate to insights
    navigate('insights', { meetingId });

  } catch (err) {
    updateMeeting(meetingId, { status: 'error' });
    showEditorBanner('error', err.message || 'Analysis failed. Please check your connection and try again.');
    document.getElementById('editor-status-badge').innerHTML =
      '<span class="badge badge-error">⚠ Error</span>';
    console.error('[MeetingAI] Analysis error:', err);
  } finally {
    document.getElementById('editor-loading').hidden    = false;
    document.getElementById('editor-loading').hidden    = true;
    document.getElementById('btn-analyze').disabled     = false;
    document.getElementById('btn-save-draft').disabled  = false;
    document.getElementById('btn-load-sample').disabled = false;
  }
}

function showEditorBanner(type, text) {
  const banner    = document.getElementById('editor-banner');
  const iconEl    = document.getElementById('editor-banner-icon');
  const textEl    = document.getElementById('editor-banner-text');
  const icons     = { error: '⚠', warning: '⚠', success: '✓', info: 'ℹ' };

  banner.className  = `banner banner-${type}`;
  iconEl.textContent = icons[type] || 'ℹ';
  textEl.textContent = text;
  banner.hidden     = false;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — MEETING INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════

function renderInsightsPage() {
  const mid = currentMeetingId;
  if (!mid || !state.meetings[mid]) {
    document.getElementById('insights-header').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">No meeting selected</div>
        <p class="empty-sub">Open a meeting from the Meetings page and analyze its notes first.</p>
      </div>`;
    return;
  }

  const m = state.meetings[mid];

  // ── Header ──
  const statusBadge = {
    draft:     '<span class="badge badge-draft">Draft</span>',
    analyzing: '<span class="badge badge-analyzing">⏳ Analyzing</span>',
    complete:  '<span class="badge badge-complete">✓ Analyzed</span>',
    error:     '<span class="badge badge-error">⚠ Error</span>'
  }[m.status] || '';

  document.getElementById('insights-header').innerHTML = `
    <div class="insights-title">${esc(m.title)}</div>
    <div class="insights-meta">
      <span>📅 ${fmtDate(m.date)}</span>
      ${m.type ? `<span>· ${esc(m.type)}</span>` : ''}
      ${statusBadge}
    </div>
    <div class="insights-actions">
      <button class="btn btn-secondary btn-sm" id="btn-view-notes">📝 View Notes</button>
      ${m.status === 'complete'
        ? '<button class="btn btn-secondary btn-sm" id="btn-reanalyze">↻ Re-analyze</button>'
        : ''}
      <button class="btn btn-secondary btn-sm" data-nav="meetings">← All Meetings</button>
    </div>`;

  // Bind dynamic buttons (they're freshly rendered)
  document.getElementById('btn-view-notes')?.addEventListener('click', openNotesModal);
  document.getElementById('btn-reanalyze')?.addEventListener('click', () => openModal('modal-reanalyze'));

  // ── Summary ──
  document.getElementById('summary-text').textContent =
    m.summary || 'No summary available — analyze the meeting notes to generate one.';

  // ── Tasks, Decisions, Risks ──
  renderTasksSection(mid);
  renderDecisionsSection(mid);
  renderRisksSection(mid);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function renderTasksSection(meetingId) {
  const tasks    = getMeetingTasks(meetingId);
  const active   = tasks.filter(t => t.status !== 'cancelled');
  const done     = tasks.filter(t => t.status === 'completed');
  const pct      = active.length > 0 ? Math.round(done.length / active.length * 100) : 0;

  document.getElementById('task-progress-fill').style.width = pct + '%';
  document.getElementById('task-progress-label').textContent = `${done.length} / ${active.length} done`;

  const filtered = taskStatusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === taskStatusFilter);

  const emptyEl      = document.getElementById('tasks-empty');
  const tableBody    = document.getElementById('tasks-table-body');
  const mobileCards  = document.getElementById('tasks-cards-mobile');

  if (filtered.length === 0) {
    tableBody.innerHTML    = '';
    mobileCards.innerHTML  = '';
    emptyEl.hidden         = false;
    return;
  }

  emptyEl.hidden = true;

  // Desktop table rows
  tableBody.innerHTML = filtered.map(t => {
    const isDone  = t.status === 'completed';
    const rowCls  = isDone ? 'row-done' : '';
    const chkd    = isDone ? 'checked' : '';
    const missing = missingChipsHTML(t.missing_information);

    return `
      <tr class="${rowCls}" data-tid="${esc(t.id)}">
        <td>
          <input type="checkbox" class="task-check" data-check="${esc(t.id)}" ${chkd}
            aria-label="Mark task complete" />
        </td>
        <td>
          <span class="task-text">${esc(t.task)}</span>
          ${missing}
        </td>
        <td class="text-sm text-muted">${esc(t.owner)}</td>
        <td class="text-sm text-muted">${esc(t.deadline)}</td>
        <td><span class="badge badge-${esc(t.priority)}">${capitalize(t.priority)}</span></td>
        <td><span class="badge badge-${esc(t.status)}">${statusLabel(t.status)}</span></td>
        <td>
          <button class="btn btn-ghost btn-icon" data-edit="${esc(t.id)}" title="Edit task" aria-label="Edit task">
            ✏️
          </button>
        </td>
      </tr>`;
  }).join('');

  // Mobile cards
  mobileCards.innerHTML = filtered.map(t => {
    const isDone  = t.status === 'completed';
    const cardCls = isDone ? 'task-card card-done' : 'task-card';
    const chkd    = isDone ? 'checked' : '';
    const missing = missingChipsHTML(t.missing_information);

    return `
      <div class="${cardCls}" data-tid="${esc(t.id)}">
        <div class="task-card-top">
          <input type="checkbox" class="task-check" data-check="${esc(t.id)}" ${chkd}
            aria-label="Mark task complete" />
          <div class="task-card-title">${esc(t.task)}</div>
        </div>
        <div class="task-card-meta">
          <span>👤 ${esc(t.owner)}</span>
          <span>📅 ${esc(t.deadline)}</span>
          <span class="badge badge-${esc(t.priority)}">${capitalize(t.priority)}</span>
          <span class="badge badge-${esc(t.status)}">${statusLabel(t.status)}</span>
        </div>
        ${missing}
        <div class="task-card-actions">
          <button class="btn btn-secondary btn-sm" data-edit="${esc(t.id)}">Edit</button>
        </div>
      </div>`;
  }).join('');
}

function missingChipsHTML(missing) {
  if (!missing || missing.length === 0) return '';
  return `<div class="missing-chips">
    ${missing.map(m => `<span class="missing-chip">⚠ ${esc(m)}</span>`).join('')}
  </div>`;
}

// ─── Decisions ────────────────────────────────────────────────────────────────

function renderDecisionsSection(meetingId) {
  const decisions = getMeetingDecisions(meetingId);
  const el        = document.getElementById('decisions-content');

  if (decisions.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:1.25rem 0">
        <div class="empty-sub">No confirmed decisions were extracted from the meeting notes.</div>
      </div>`;
    return;
  }

  el.innerHTML = decisions.map(d => `
    <div class="decision-card">
      <div class="decision-header">
        <span class="badge badge-${esc(d.status)}">${capitalize(d.status)}</span>
      </div>
      <div class="decision-text">${esc(d.description)}</div>
      ${d.evidence ? `<div class="decision-evidence">"${esc(d.evidence)}"</div>` : ''}
    </div>`).join('');
}

// ─── Risks / Open Questions ────────────────────────────────────────────────────

function renderRisksSection(meetingId) {
  const questions = getMeetingOpenQuestions(meetingId);
  const el        = document.getElementById('risks-content');

  if (questions.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding:1.25rem 0">
        <div class="empty-sub">No risks or missing information identified in this meeting.</div>
      </div>`;
    return;
  }

  const cfg = {
    'Potential Risk':     { cls: 'risk-high',   icon: '🔴', label: 'Potential Risk' },
    'Owner Missing':      { cls: 'risk-info',    icon: '👤', label: 'Owner Missing' },
    'Deadline Missing':   { cls: 'risk-warn',    icon: '📅', label: 'Deadline Missing' },
    'Needs Clarification':{ cls: 'risk-info',    icon: '❓', label: 'Needs Clarification' }
  };

  el.innerHTML = questions.map(q => {
    const c = cfg[q.category] || { cls: 'risk-info', icon: '⚠️', label: q.category || 'Unknown' };
    return `
      <div class="risk-item ${esc(c.cls)}">
        <span class="risk-icon">${c.icon}</span>
        <div class="risk-body">
          <div class="risk-label">${esc(c.label)}</div>
          <div class="risk-desc">${esc(q.description)}</div>
        </div>
      </div>`;
  }).join('');
}

// ─── Task modal helpers ────────────────────────────────────────────────────────

function openTaskModal(taskId, isNew) {
  taskModalIsNew = !!isNew;
  const t = state.tasks[taskId];

  document.getElementById('modal-task-title').textContent = isNew ? 'Add Task' : 'Edit Task';
  document.getElementById('t-id').value       = taskId || '';
  document.getElementById('t-is-new').value   = String(!!isNew);
  document.getElementById('t-desc').value     = t?.task    || '';
  document.getElementById('t-owner').value    = (t?.owner   && t.owner   !== 'Not specified') ? t.owner   : '';
  document.getElementById('t-deadline').value = (t?.deadline && t.deadline !== 'Not specified') ? t.deadline : '';
  document.getElementById('t-priority').value = t?.priority || 'medium';
  document.getElementById('t-status').value   = t?.status   || 'pending';
  document.getElementById('val-t-desc').hidden = true;

  openModal('modal-task');
}

// ─── Copy helpers ─────────────────────────────────────────────────────────────

function copySummary() {
  const text = document.getElementById('summary-text').textContent;
  navigator.clipboard.writeText(text).catch(() => {});
  flashBtn('btn-copy-summary', '✓ Copied', 'Copy');
}

function copyTasks() {
  if (!currentMeetingId) return;
  const tasks = getMeetingTasks(currentMeetingId);
  const lines = tasks.map(t =>
    `• ${t.task}\n  Owner: ${t.owner} | Deadline: ${t.deadline} | Status: ${statusLabel(t.status)}`
  );
  navigator.clipboard.writeText(lines.join('\n\n')).catch(() => {});
  flashBtn('btn-copy-tasks', '✓ Copied', 'Copy Tasks');
}

function flashBtn(id, tempText, origText) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.textContent = tempText;
  setTimeout(() => { btn.textContent = origText; }, 2000);
}

function openNotesModal() {
  const m = state.meetings[currentMeetingId];
  if (!m) return;
  document.getElementById('notes-preview').textContent = m.notes || '(No notes saved)';
  openModal('modal-notes');
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — MY PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

function renderProgressPage() {
  const s = getStats();

  // Stat cards
  document.getElementById('stat-grid').innerHTML = [
    { icon: '📅', label: 'Meetings Recorded', value: s.totalMeetings,  color: 'var(--violet)' },
    { icon: '📋', label: 'Total Tasks',        value: s.totalTasks,     color: 'var(--text)' },
    { icon: '✅', label: 'Completed Tasks',    value: s.completedTasks, color: 'var(--green)' },
    { icon: '⏳', label: 'Pending Tasks',      value: s.pendingTasks,   color: 'var(--amber)' }
  ].map(c => `
    <div class="stat-card">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-number" style="color:${c.color}">${c.value}</div>
    </div>`).join('');

  // Completion bar
  document.getElementById('completion-fill').style.width = s.completionPct + '%';
  document.getElementById('completion-pct').textContent  = `${s.completionPct}%`;
  document.getElementById('completion-bar-wrap').setAttribute('aria-valuenow', s.completionPct);
  document.getElementById('completion-sub').textContent  =
    s.activeTasks > 0
      ? `${s.completedTasks} of ${s.activeTasks} active tasks completed (cancelled tasks excluded).`
      : 'No tasks recorded yet.';

  // Pending tasks
  const pending = getAllPendingTasks();
  document.getElementById('pending-count').textContent =
    `${pending.length} item${pending.length !== 1 ? 's' : ''}`;

  const listEl = document.getElementById('pending-tasks-list');

  if (pending.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:2rem 0">
        <div class="empty-icon">🎉</div>
        <div class="empty-title">All caught up!</div>
        <p class="empty-sub">No pending tasks across any of your meetings.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = pending.map(t => {
    const m = state.meetings[t.meetingId];
    return `
      <div class="pending-item" id="pi-${esc(t.id)}">
        <input type="checkbox" class="pending-chk" data-pcheck="${esc(t.id)}"
          aria-label="Select task to act on" />
        <div class="pending-info">
          <div class="pending-name">${esc(t.task)}</div>
          <div class="pending-meta">
            ${m
              ? `<span class="meeting-link" data-goto="${esc(t.meetingId)}">${esc(m.title)}</span>`
              : ''}
            ${t.deadline !== 'Not specified' ? `<span>📅 ${esc(t.deadline)}</span>` : ''}
            <span class="badge badge-${esc(t.priority)}">${capitalize(t.priority)}</span>
            <span class="badge badge-${esc(t.status)}">${statusLabel(t.status)}</span>
          </div>
          <!-- Action buttons — revealed when checkbox is ticked -->
          <div class="pending-actions" id="pa-${esc(t.id)}" hidden>
            <button class="btn btn-primary btn-sm" data-pcomplete="${esc(t.id)}">
              ✓ Mark Complete
            </button>
            <button class="btn btn-danger btn-sm" data-pdelete="${esc(t.id)}">
              🗑 Delete Task
            </button>
            <button class="btn btn-ghost btn-sm" data-pcancel="${esc(t.id)}">
              Cancel
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION — single document-level listener
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('click', e => {
  const target = e.target;

  // ── Sidebar / breadcrumb navigation ──────────────────────────────────────
  const navEl = target.closest('[data-nav]');
  if (navEl && !navEl.classList.contains('disabled')) {
    navigate(navEl.dataset.nav);
    return;
  }

  // ── Open meeting (button with data-open-mid) ──────────────────────────────
  const openBtn = target.closest('[data-open-mid]');
  if (openBtn) {
    navigate('meetings', { subView: 'notes', meetingId: openBtn.dataset.openMid });
    return;
  }

  // ── Click anywhere on meeting card (except action buttons) ───────────────
  const card = target.closest('.meeting-card[data-mid]');
  if (card && !target.closest('.meeting-actions')) {
    navigate('meetings', { subView: 'notes', meetingId: card.dataset.mid });
    return;
  }

  // ── Back to meetings list ─────────────────────────────────────────────────
  if (target.id === 'btn-back-to-meetings' || target.closest('#btn-back-to-meetings')) {
    navigate('meetings');
    return;
  }

  // ── Create meeting (open modal) ───────────────────────────────────────────
  if (target.id === 'btn-create-meeting') {
    document.getElementById('f-title').value = '';
    document.getElementById('f-date').value  = todayStr();
    document.getElementById('f-type').value  = '';
    document.getElementById('val-f-title').hidden = true;
    document.getElementById('val-f-date').hidden  = true;
    openModal('modal-create');
    return;
  }

  // ── Confirm create meeting ────────────────────────────────────────────────
  if (target.id === 'btn-confirm-create') {
    const title = document.getElementById('f-title').value.trim();
    const date  = document.getElementById('f-date').value;
    const type  = document.getElementById('f-type').value;

    document.getElementById('val-f-title').hidden = true;
    document.getElementById('val-f-date').hidden  = true;

    let valid = true;
    if (!title) {
      const el = document.getElementById('val-f-title');
      el.textContent = 'Meeting title is required.';
      el.hidden = false;
      valid = false;
    }
    if (!date) {
      const el = document.getElementById('val-f-date');
      el.textContent = 'Meeting date is required.';
      el.hidden = false;
      valid = false;
    }
    if (!valid) return;

    const mtg = createMeeting({ title, date, type });
    closeModal('modal-create');
    navigate('meetings', { subView: 'notes', meetingId: mtg.id });
    return;
  }

  // ── Save draft ────────────────────────────────────────────────────────────
  if (target.id === 'btn-save-draft') {
    if (!currentMeetingId) return;
    const notes = document.getElementById('notes-textarea').value;
    updateMeeting(currentMeetingId, { notes });
    showEditorBanner('success', 'Draft saved successfully.');
    setTimeout(() => { document.getElementById('editor-banner').hidden = true; }, 2500);
    return;
  }

  // ── Analyze meeting ───────────────────────────────────────────────────────
  if (target.id === 'btn-analyze') {
    if (!currentMeetingId) return;
    const notes = document.getElementById('notes-textarea').value;
    if (!notes.trim()) {
      showEditorBanner('warning', 'Please enter meeting notes before analyzing.');
      return;
    }
    // Always save notes first
    updateMeeting(currentMeetingId, { notes });

    const m = state.meetings[currentMeetingId];
    if (m && m.status === 'complete') {
      openModal('modal-reanalyze');
    } else {
      runAnalysis(currentMeetingId);
    }
    return;
  }

  // ── Load sample notes ─────────────────────────────────────────────────────
  if (target.id === 'btn-load-sample') {
    const ta = document.getElementById('notes-textarea');
    ta.value = SAMPLE_NOTES;
    updateCharCount(SAMPLE_NOTES.length);
    ta.focus();
    return;
  }

  // ── Task checkbox (insights or progress page) ─────────────────────────────
  const checkEl = target.dataset.check;
  if (checkEl && target.type === 'checkbox') {
    const newStatus = target.checked ? 'completed' : 'pending';
    updateTask(checkEl, { status: newStatus });

    if (currentPage === 'insights' && currentMeetingId) {
      renderTasksSection(currentMeetingId);
    } else if (currentPage === 'progress') {
      renderProgressPage();
    }
    return;
  }

  // ── Edit task button ──────────────────────────────────────────────────────
  const editEl = target.closest('[data-edit]');
  if (editEl) {
    openTaskModal(editEl.dataset.edit, false);
    return;
  }

  // ── Add task (open task modal as new) ─────────────────────────────────────
  if (target.id === 'btn-add-task') {
    const tempId = genId();
    openTaskModal(tempId, true);
    return;
  }

  // ── Save task (from modal) ────────────────────────────────────────────────
  if (target.id === 'btn-save-task') {
    const desc     = document.getElementById('t-desc').value.trim();
    const taskId   = document.getElementById('t-id').value;
    const isNewVal = document.getElementById('t-is-new').value === 'true';

    if (!desc) {
      const el = document.getElementById('val-t-desc');
      el.textContent = 'Task description is required.';
      el.hidden = false;
      return;
    }
    document.getElementById('val-t-desc').hidden = true;

    const owner    = document.getElementById('t-owner').value.trim()    || 'Not specified';
    const deadline = document.getElementById('t-deadline').value.trim() || 'Not specified';
    const priority = document.getElementById('t-priority').value;
    const status   = document.getElementById('t-status').value;

    if (isNewVal) {
      createTask({ meetingId: currentMeetingId, task: desc, owner, deadline, priority, status, isManual: true });
    } else {
      updateTask(taskId, { task: desc, owner, deadline, priority, status });
    }

    closeModal('modal-task');
    if (currentMeetingId) renderTasksSection(currentMeetingId);
    return;
  }

  // ── Copy summary ──────────────────────────────────────────────────────────
  if (target.id === 'btn-copy-summary') { copySummary(); return; }

  // ── Copy tasks ────────────────────────────────────────────────────────────
  if (target.id === 'btn-copy-tasks') { copyTasks(); return; }

  // ── Confirm re-analyze ────────────────────────────────────────────────────
  if (target.id === 'btn-confirm-reanalyze') {
    closeModal('modal-reanalyze');
    clearAnalysis(currentMeetingId, false); // clear everything including manual tasks
    navigate('meetings', { subView: 'notes', meetingId: currentMeetingId });
    runAnalysis(currentMeetingId);
    return;
  }

  // ── Edit notes from notes modal ───────────────────────────────────────────
  if (target.id === 'btn-edit-from-notes-modal') {
    closeModal('modal-notes');
    navigate('meetings', { subView: 'notes', meetingId: currentMeetingId });
    return;
  }

  // ── Go to meeting from progress page ─────────────────────────────────────
  const gotoEl = target.closest('[data-goto]');
  if (gotoEl) {
    currentMeetingId = gotoEl.dataset.goto;
    navigate('insights', { meetingId: currentMeetingId });
    return;
  }

  // ── Pending task checkbox — reveal / hide action buttons ─────────────────
  const pcheckEl = target.closest('[data-pcheck]');
  if (pcheckEl) {
    const tid     = pcheckEl.dataset.pcheck;
    const actions = document.getElementById(`pa-${tid}`);
    const checkbox = target.closest('input[type=checkbox]') || target;
    if (actions) actions.hidden = !checkbox.checked;
    return;
  }

  // ── Pending task: Mark Complete ───────────────────────────────────────────
  const pcompleteEl = target.closest('[data-pcomplete]');
  if (pcompleteEl) {
    const tid = pcompleteEl.dataset.pcomplete;
    updateTask(tid, { status: 'completed' });
    renderProgressPage();
    // Sync Insights page if it's open for the same meeting
    if (currentPage === 'insights' && currentMeetingId === state.tasks[tid]?.meetingId) {
      renderTasksSection(currentMeetingId);
    }
    return;
  }

  // ── Pending task: Delete ──────────────────────────────────────────────────
  const pdeleteEl = target.closest('[data-pdelete]');
  if (pdeleteEl) {
    const tid = pdeleteEl.dataset.pdelete;
    deleteTask(tid);
    renderProgressPage();
    // Sync Insights page progress bar if open for the same meeting
    if (currentPage === 'insights' && currentMeetingId) {
      renderTasksSection(currentMeetingId);
    }
    return;
  }

  // ── Pending task: Cancel (uncheck and hide buttons) ───────────────────────
  const pcancelEl = target.closest('[data-pcancel]');
  if (pcancelEl) {
    const tid     = pcancelEl.dataset.pcancel;
    const actions = document.getElementById(`pa-${tid}`);
    const chk     = document.querySelector(`[data-pcheck="${tid}"]`);
    if (actions) actions.hidden = true;
    if (chk) chk.checked = false;
    return;
  }

  // ── Close modal via data-close attribute ──────────────────────────────────
  const closeEl = target.closest('[data-close]');
  if (closeEl) { closeModal(closeEl.dataset.close); return; }

  // ── Click modal overlay background ───────────────────────────────────────
  if (target.classList.contains('modal-overlay')) {
    target.hidden = true;
    if (!document.querySelector('.modal-overlay:not([hidden])')) {
      document.body.style.overflow = '';
    }
    return;
  }

  // ── Dismiss banner ────────────────────────────────────────────────────────
  const dismissEl = target.closest('[data-dismiss]');
  if (dismissEl) {
    const el = document.getElementById(dismissEl.dataset.dismiss);
    if (el) el.hidden = true;
    return;
  }

  // ── Task filter chips ─────────────────────────────────────────────────────
  const tFilter = target.closest('[data-t-filter]');
  if (tFilter) {
    taskStatusFilter = tFilter.dataset.tFilter;
    document.querySelectorAll('[data-t-filter]').forEach(c =>
      c.classList.toggle('active', c.dataset.tFilter === taskStatusFilter)
    );
    if (currentMeetingId) renderTasksSection(currentMeetingId);
    return;
  }

  // ── Meeting filter chips ──────────────────────────────────────────────────
  const mFilter = target.closest('[data-m-filter]');
  if (mFilter) {
    meetingStatusFilter = mFilter.dataset.mFilter;
    document.querySelectorAll('[data-m-filter]').forEach(c =>
      c.classList.toggle('active', c.dataset.mFilter === meetingStatusFilter)
    );
    renderMeetingsList();
    return;
  }
});

// ── Input events ─────────────────────────────────────────────────────────────

document.addEventListener('input', e => {
  const t = e.target;

  // Notes textarea character count
  if (t.id === 'notes-textarea') {
    updateCharCount(t.value.length);
    return;
  }

  // Meeting search
  if (t.id === 'meeting-search') {
    meetingSearchQuery = t.value.trim();
    renderMeetingsList();
    return;
  }
});

// ── Keyboard: close modal on Escape ──────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay:not([hidden])');
  if (open) {
    open.hidden = true;
    if (!document.querySelector('.modal-overlay:not([hidden])')) {
      document.body.style.overflow = '';
    }
  }
});

// ── Keyboard: activate sidebar items with Enter/Space ────────────────────────

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const navEl = e.target.closest('[data-nav]');
  if (navEl && !navEl.classList.contains('disabled')) {
    e.preventDefault();
    navigate(navEl.dataset.nav);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════════════════════

function init() {
  loadState();

  // Default date for create-meeting form
  const dateInput = document.getElementById('f-date');
  if (dateInput) dateInput.value = todayStr();

  // Start on Meetings page (list view)
  navigate('meetings');
}

document.addEventListener('DOMContentLoaded', init);
