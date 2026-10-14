# PRD — Smart Meeting Action Extractor

**Event:** Infosys Hack-AI-Thon 2026  
**Problem ID:** EP-01  
**Team:** DEV FORCE  
**Institution:** B V Raju Institute of Technology, Narsapur  
**Time limit:** 180 minutes  
**Technology track:** Qualcomm Cloud AI Playground  
**Frontend:** HTML, CSS, JavaScript  
**Document status:** Implementation-ready MVP specification

---

## 1. Product overview

Smart Meeting Action Extractor is an AI-powered web application that transforms unstructured meeting notes or transcripts into actionable information.

The application uses a Large Language Model (LLM) to generate:
- A concise meeting summary
- Key decisions
- Action items
- Responsible people
- Deadlines
- Potential risks and missing information

### Objective

Build a working end-to-end prototype within three hours. Prioritize genuine AI processing, clear results, reliable handling of missing information, and a repeatable demonstration.

### Problem

Meeting notes often contain lengthy discussions, informal commitments, tentative decisions, and incomplete task details. Manually extracting responsibilities and deadlines takes time and can lead to missed follow-up actions.

### Proposed solution

The user pastes meeting notes into a simple web interface and receives a structured summary and action-item dashboard powered by an LLM.

---

## 2. Team responsibilities

### Owner A — Frontend and application integration (Sai Harish)

Responsibilities:
1. Create the project structure.
2. Build the meeting-notes input interface.
3. Build the results dashboard.
4. Implement input validation, loading states, and user-friendly errors.
5. Integrate the AI response using the confirmed integration contract.
6. Render summaries, decisions, tasks, owners, deadlines, and risks.
7. Test the full workflow and prepare the demo.

### Owner B — Qualcomm AI and prompt engineering (teammate)

Responsibilities:
1. Set up access to the designated Qualcomm Cloud AI Playground.
2. Identify an available text-generation model.
3. Confirm the supported endpoint or integration method, authentication, and request format.
4. Test a real model request.
5. Develop and refine the extraction prompt.
6. Normalize the model response to the agreed JSON schema.
7. Test normal, incomplete, ambiguous, and failing requests.
8. Share integration details with Owner A as soon as available.

### Coordination rule

Both owners start in parallel. Owner A uses mock JSON to develop the UI while Owner B verifies model access. Agree on the JSON schema immediately and integrate as soon as a real request works.

---

## 3. Three-hour schedule

### Phase 1 — Foundation and AI access (0–60 minutes)

| Time | Owner A | Owner B |
|---|---|---|
| 0–15 min | Create the project skeleton and begin the input UI | Open Playground and verify model access |
| 15–35 min | Continue the input interface and validation | Test a real model request |
| 35–60 min | Build dashboard sections using sample JSON | Refine the prompt and confirm response structure |

**Checkpoint at minute 60:** The frontend can display sample results, and the AI integration path has been tested or a blocker has been escalated.

### Phase 2 — Core workflow (60–120 minutes)

| Time | Owner A | Owner B |
|---|---|---|
| 60–80 min | Finish the dashboard and loading/error states | Finalize the prompt and normalize JSON |
| 80–105 min | Integrate real AI responses | Deliver working integration details and test edge cases |
| 105–120 min | Test end-to-end behavior and fix integration bugs | Support debugging and validate model outputs |

**Checkpoint at minute 105:** Actual AI output is rendered in the dashboard. If this is at risk, stop optional work.

### Phase 3 — Testing and demo (120–180 minutes)

| Time | Owner A | Owner B |
|---|---|---|
| 120–140 min | Test input validation, rendering, and responsive layout | Test missing owners, missing dates, and ambiguous decisions |
| 140–160 min | Fix bugs and add a sample-input/copy-results feature if time allows | Check response consistency and assist integration debugging |
| 160–170 min | Rehearse the full demonstration | Prepare a concise AI and architecture explanation |
| 170–180 min | Final smoke test and bug-fix buffer | Final smoke test and backup plan |

**Scope rule:** Do not let optional styling or features delay the working AI workflow.

---

## 4. MVP scope and priorities

### P0 — Must have

1. Meeting notes text area
2. Empty-input validation
3. AI-powered summarization
4. Key decision extraction
5. Action-item extraction
6. Owner and deadline extraction
7. Missing-information flags
8. Risk/blocker section
9. Structured results dashboard
10. Loading and error states
11. Human-review messaging
12. End-to-end demonstration using a real model response

### P1 — Only after P0 works

- Load Sample Notes button
- Copy results button
- Minor visual refinements
- Responsive layout improvements

### Out of scope

- Authentication and user accounts
- Database and persistent storage
- Audio recording or transcription
- Calendar integration
- Automatic task assignment or notifications
- Multi-user collaboration
- Advanced analytics
- Production deployment

---

## 5. User workflow

1. User opens the application.
2. User pastes meeting notes into a text area.
3. User clicks **Analyze Meeting**.
4. The app rejects empty or whitespace-only input.
5. The app sends the notes and extraction prompt to the configured model.
6. The model returns structured results.
7. The application validates and parses the response.
8. The dashboard renders summary, decisions, action items, and risks.
9. The user reviews the output and confirms uncertain details.

---

## 6. Functional requirements

### FR-01 — Input

Provide a text area, Analyze Meeting button, and optional sample-input button.

**Acceptance criteria**
- Empty input is rejected with a clear message.
- Whitespace-only input is rejected.
- Sample notes can be loaded in one click if implemented.

### FR-02 — AI processing

Send the notes to the configured LLM using the supported integration method.

**Acceptance criteria**
- The app shows a loading state during processing.
- Duplicate submissions are disabled while a request is active.
- Successful output comes from the real model.
- API failures produce a readable error.
- Credentials are never exposed in frontend source code.

### FR-03 — Summary

Generate a concise summary preserving the meeting’s main topics, outcomes, and unresolved issues.

### FR-04 — Decisions

Show decisions separately from suggestions and unresolved discussions. If none are found, display a clear empty state.

### FR-05 — Action items

Each action item contains:
- Task description
- Owner
- Deadline
- Missing-information indicators
- Review status

Do not invent an owner or deadline. Use `Not specified` when absent.

### FR-06 — Deadlines

Preserve relative dates such as “Friday” if the meeting date is unknown. Do not invent a calendar date or turn a tentative date into a confirmed commitment.

### FR-07 — Risks and missing information

Display relevant blockers, unresolved issues, missing owners, and missing deadlines. Do not present speculative risks as established facts.

### FR-08 — Dashboard

Display four sections:
1. Meeting Summary
2. Key Decisions
3. Action Items
4. Risks and Missing Information

### FR-09 — Error handling

Handle empty input, API failures, malformed JSON, unexpected response shapes, and missing fields without crashing.

---

## 7. UI specification

Build a single-page application.

### Header
- Product name: Smart Meeting Action Extractor
- Subtitle: Turn meeting discussions into actionable tasks

### Input panel
- Meeting-notes text area
- Load Sample Notes button (P1)
- Analyze Meeting button
- Validation and loading messages

### Results panel
- Summary card
- Decisions list
- Action-items table
- Risks and missing-information list

### Action-items table columns
- Task
- Owner
- Deadline
- Review status

### Design direction
- Clean, modern productivity dashboard
- Readable typography and clear hierarchy
- Restrained accent colors
- Responsive layout
- Minimal animation
- No unnecessary pages or navigation

---

## 8. AI integration contract

### Setup gate

The Qualcomm Cloud AI Playground has not yet been configured by the team. Before writing model-specific API code, Owner B must confirm:
- The actual Playground or endpoint provided for the hackathon
- Available text-generation model and model identifier
- Request URL and HTTP method, if API access is supported
- Authentication method and required headers
- Request payload format
- Response format and usage limits

Do not guess endpoint URLs, model IDs, credentials, or API formats.

### Prompt baseline

Use the following prompt and adjust it to the supported model:

> You are a Smart Meeting Action Extractor. Analyze the supplied meeting notes.
>
> Return a concise summary, key decisions explicitly established in the discussion, action items with task descriptions, owners and deadlines, potential risks/blockers, and missing or ambiguous information.
>
> Rules:
> - Use only information supported by the notes.
> - Never invent task owners, deadlines, decisions, or commitments.
> - Use “Not specified” for missing owners and deadlines.
> - Distinguish confirmed decisions from suggestions and unresolved discussions.
> - Preserve relative dates when the meeting date is unknown.
> - Flag unclear responsibilities and unresolved issues.
> - Preserve the meaning of the original discussion.
> - Return valid JSON matching the agreed schema, without extra prose.

### Target JSON schema

```json
{
  "summary": "Concise meeting summary",
  "decisions": [
    {
      "description": "Decision description",
      "status": "confirmed"
    }
  ],
  "action_items": [
    {
      "task": "Build the login page",
      "owner": "Sai Harish",
      "deadline": "Friday",
      "missing_information": [],
      "review_status": "needs_review"
    }
  ],
  "risks": [
    {
      "description": "Authentication issue remains unresolved",
      "severity": "medium"
    }
  ],
  "missing_information": [
    "API testing deadline has not been specified"
  ]
}
```

This is the target application schema, not a guarantee of the model's native response. Owner B should normalize the response to this shape if needed.

### Frontend integration contract

Owner B must provide Owner A with:
1. Confirmed integration method.
2. Required request payload and headers.
3. Working request example.
4. Successful response matching the target schema.
5. Error behavior and safe credential-handling requirements.

Owner A should isolate the integration in a function such as `analyzeMeeting(notes)` and keep UI rendering separate from API logic.

### Security

Never embed a secret API key in browser-side JavaScript or commit it to source control. If the API requires a secret, use an approved secure integration or minimal server-side proxy if time permits. If safe access is unavailable, do not expose the secret just to make the demo work.

---

## 9. Testing plan

### Test A — Normal meeting

Input:
“Sai will build the dashboard by Friday. Abhilash will test the API.”

Expected:
- Both tasks are extracted.
- Owners match the notes.
- Friday is retained for the dashboard task.
- The API deadline is marked `Not specified`.

### Test B — Missing owner

Input:
“The team must fix the login bug by Monday.”

Expected:
- Task and deadline are extracted.
- Owner is marked `Not specified`.

### Test C — Unresolved proposal

Input:
“We might migrate to a new database, but no decision has been made.”

Expected:
- The proposal is not shown as a confirmed decision.
- Unresolved status is communicated.

### Test D — Missing deadline

Input:
“Preetham will investigate the authentication problem. We will decide the deadline later.”

Expected:
- Owner and task are extracted.
- Deadline is marked `Not specified`.
- Missing timing is flagged.

### Test E — Empty input

Expected:
- Request is not sent.
- Clear validation message is shown.

### Test F — API error or malformed output

Expected:
- Application remains usable.
- Friendly error message is displayed.
- No credentials or stack traces are exposed.

---

## 10. Acceptance criteria

The MVP is complete when:
- [ ] The application runs in a browser.
- [ ] Users can enter meeting notes.
- [ ] Empty input is rejected.
- [ ] A real AI request works through the configured integration.
- [ ] Summary and key decisions are displayed separately.
- [ ] Action items display task, owner, and deadline.
- [ ] Missing details are explicitly flagged.
- [ ] Risks and unresolved issues are displayed.
- [ ] Loading and API-error states work.
- [ ] Normal and incomplete meeting-note tests pass.
- [ ] Unresolved proposals are not mislabeled as confirmed decisions.
- [ ] The full demo works without manual code changes.

---

## 11. Contingency plan

If Playground access is blocked:
1. Check the official hackathon instructions and team resources.
2. Confirm the correct endpoint and access requirements with the organizer or mentor.
3. Continue building the frontend using mock JSON.
4. Keep model integration isolated so it can be connected later.
5. Use mock output only for UI development, and clearly distinguish it from live AI output.

Do not spend the entire three hours troubleshooting access. Escalate early and keep building independent components in parallel.

---

## 12. Final definition of success

A judge can paste unstructured meeting notes and see a genuine AI-powered transformation into a concise summary, key decisions, action items, owners, deadlines, and alerts for missing information.

**Implementation principle:** Verify AI access early, build the smallest complete workflow, avoid unnecessary features, and preserve time for testing and the final demo.
