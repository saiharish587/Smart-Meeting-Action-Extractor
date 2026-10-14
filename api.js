/**
 * api.js — AI Integration Layer
 *
 * Single exported function: analyzeMeeting(notes) → Promise<MeetingResult>
 *
 * Integration is fully isolated here. To switch from mock to live:
 *   Set CONFIG.USE_MOCK = false in config.js and fill in credentials.
 *
 * MeetingResult schema:
 * {
 *   summary: string,
 *   decisions: [{ description, status }],
 *   action_items: [{ task, owner, deadline, missing_information[], review_status }],
 *   risks: [{ description, severity }],
 *   missing_information: string[]
 * }
 */

const EXTRACTION_PROMPT = `You are a Smart Meeting Action Extractor. Analyze the supplied meeting notes.

Return a concise summary, key decisions explicitly established in the discussion, action items with task descriptions, owners and deadlines, potential risks/blockers, and missing or ambiguous information.

Rules:
- Use only information supported by the notes.
- Never invent task owners, deadlines, decisions, or commitments.
- Use "Not specified" for missing owners and deadlines.
- Distinguish confirmed decisions from suggestions and unresolved discussions.
- Preserve relative dates when the meeting date is unknown.
- Flag unclear responsibilities and unresolved issues.
- Preserve the meaning of the original discussion.
- Return valid JSON matching the schema below, without any extra prose or markdown fences.

Required JSON schema:
{
  "summary": "string",
  "decisions": [{ "description": "string", "status": "confirmed|proposed|unresolved" }],
  "action_items": [{
    "task": "string",
    "owner": "string",
    "deadline": "string",
    "missing_information": ["string"],
    "review_status": "confirmed|needs_review"
  }],
  "risks": [{ "description": "string", "severity": "high|medium|low" }],
  "missing_information": ["string"]
}

Meeting notes:
`;

/**
 * Validates and normalises the parsed JSON to ensure all required fields exist.
 * Returns a safe object even if the model returns partial data.
 */
function normaliseResponse(raw) {
  const safe = (val, fallback) => (val !== undefined && val !== null ? val : fallback);

  const normaliseItem = (item) => ({
    task: safe(item.task, "Unspecified task"),
    owner: safe(item.owner, "Not specified"),
    deadline: safe(item.deadline, "Not specified"),
    missing_information: Array.isArray(item.missing_information)
      ? item.missing_information
      : [],
    review_status: ["confirmed", "needs_review"].includes(item.review_status)
      ? item.review_status
      : "needs_review",
  });

  const normaliseDecision = (d) => ({
    description: safe(d.description, "Unspecified decision"),
    status: ["confirmed", "proposed", "unresolved"].includes(d.status)
      ? d.status
      : "unresolved",
  });

  const normaliseRisk = (r) => ({
    description: safe(r.description, "Unspecified risk"),
    severity: ["high", "medium", "low"].includes(r.severity) ? r.severity : "medium",
  });

  return {
    summary: safe(raw.summary, "No summary available."),
    decisions: Array.isArray(raw.decisions) ? raw.decisions.map(normaliseDecision) : [],
    action_items: Array.isArray(raw.action_items)
      ? raw.action_items.map(normaliseItem)
      : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(normaliseRisk) : [],
    missing_information: Array.isArray(raw.missing_information)
      ? raw.missing_information
      : [],
  };
}

/**
 * Extracts the JSON object from the model response.
 * Handles cases where the model wraps JSON in markdown fences or adds prose.
 */
function extractJSON(text) {
  // Try parsing directly first
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // Try extracting from a code block
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) {}
  }

  // Try finding the first { ... } block
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    } catch (_) {}
  }

  throw new Error("The AI response did not contain valid JSON.");
}

/**
 * Calls the Qualcomm Cloud AI Playground API.
 * Adjust the request format to match the confirmed endpoint spec.
 */
async function callQualcommAPI(notes) {
  if (!CONFIG.API_ENDPOINT) {
    throw new Error(
      "API endpoint is not configured. Set CONFIG.API_ENDPOINT in config.js."
    );
  }

  const prompt = EXTRACTION_PROMPT + notes;

  // Request format — adjust to match the Qualcomm endpoint spec.
  // This uses a common OpenAI-compatible chat format as the baseline.
  const payload = {
    model: CONFIG.MODEL_ID,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1500,
  };

  const headers = {
    "Content-Type": "application/json",
  };

  // Add auth header if a key is set (adjust header name per Qualcomm spec)
  if (CONFIG.API_KEY) {
    headers["Authorization"] = `Bearer ${CONFIG.API_KEY}`;
  }

  let response;
  try {
    response = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw new Error(
      `Network error — could not reach the AI API. (${networkErr.message})`
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody.error?.message || JSON.stringify(errBody);
    } catch (_) {
      detail = await response.text().catch(() => "");
    }
    throw new Error(
      `API returned status ${response.status}${detail ? ": " + detail : ""}`
    );
  }

  const data = await response.json();

  // Extract content from OpenAI-compatible response shape.
  // Adjust this if Qualcomm uses a different response structure.
  const content =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    data?.output ||
    data?.result ||
    data?.text;

  if (!content) {
    throw new Error("The AI API returned an empty response.");
  }

  const parsed = extractJSON(content);
  return normaliseResponse(parsed);
}

/**
 * analyzeMeeting(notes) — Main public function
 *
 * @param {string} notes - Raw meeting notes text
 * @returns {Promise<Object>} Normalised meeting result object
 */
async function analyzeMeeting(notes) {
  if (CONFIG.USE_MOCK) {
    // Simulate network delay for a realistic loading state
    await new Promise((resolve) => setTimeout(resolve, CONFIG.MOCK_DELAY_MS));
    return normaliseResponse(MOCK_RESPONSE);
  }

  return callQualcommAPI(notes);
}
