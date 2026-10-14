/**
 * mock.js — Mock AI Response
 *
 * Provides a realistic sample response matching the target JSON schema.
 * Used when CONFIG.USE_MOCK = true.
 * Also used to populate "Load Sample Notes" demo content.
 */

const SAMPLE_MEETING_NOTES = `Project Sync — Oct 14, 2026

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

const MOCK_RESPONSE = {
  summary:
    "The team held a project sync covering the dashboard UI, API integration, an authentication bug, and a proposed database migration. Sai Harish is building the dashboard and needs API details from Abhilash by Thursday. Preetham is investigating an authentication issue with no deadline agreed yet. A database migration was discussed but no decision was made — Divya will research and report back.",

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
