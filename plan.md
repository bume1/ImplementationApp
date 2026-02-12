# Implementation Plan: Launch Tracker Feature Set

## Current State Summary

- **No email infrastructure** - zero email/SMS libraries, no notification system
- **No phone field** on user model - only email exists for contact
- **Task notes exist** but are internal-only (not exposed to client portal)
- **Soft-pilot checklist** exists but does not gate portal access
- **HubSpot polling** is the only scheduled process (60s interval)
- **Activity log** exists (max 500 entries) but has no push notification capability

---

## Feature 1: Embedded Email Communication & Motivation

**Goal:** Allow admins/team to send email communications (progress updates, motivational messages, status reports) to clients and team members directly from the app.

### Backend Changes (`server.js`)

1. **Install `nodemailer`** - add to package.json dependencies
2. **Create email utility module** (`email.js`):
   - Configure SMTP transport via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
   - `sendEmail(to, subject, htmlBody)` - core send function with error handling
   - `sendBulkEmail(recipients[], subject, htmlBody)` - batch send with rate limiting
   - HTML email templates for: progress update, milestone completion, motivational/welcome, custom message
3. **New API endpoints:**
   - `POST /api/email/send` (admin only) - Send ad-hoc email to selected users
     - Body: `{ to: [emails], subject, message, templateType, projectId? }`
   - `POST /api/email/send-progress-update/:projectId` (admin only) - Send project progress summary email to client
     - Auto-generates progress stats from tasks, includes milestone highlights
   - `POST /api/email/templates` (admin only) - CRUD for email templates stored in DB key `email_templates`
   - `GET /api/email/history` (admin only) - View sent email log from DB key `email_log`
4. **Email log storage** - DB key `email_log` (array, max 500 entries) tracking: `{ id, to, subject, templateType, sentBy, sentAt, projectId?, status }`

### Frontend Changes (`public/app.js`)

5. **Email composer panel** in the project view:
   - Slide-out or modal panel triggered from project header
   - Recipient selector (client user, team members, custom email)
   - Template selector dropdown (progress update, milestone, custom)
   - Rich-text message area (basic formatting)
   - Preview before send
   - Send button with confirmation
6. **Email history tab** in project view showing sent communications

### Config Changes (`config.js`)

7. Add email-related config constants:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `EMAIL_LOG_MAX_ENTRIES` (default 500)
   - `EMAIL_RATE_LIMIT` (max emails per minute)

---

## Feature 2: Automated Reminders via Email and Text

**Goal:** Send automated reminders to assigned task owners when tasks are due soon or overdue, via email and SMS/text.

### Backend Changes

1. **Add `phone` field to user model** - update user creation (`POST /api/users`) and user update (`PUT /api/users/:id`) endpoints to accept optional `phone` field
2. **Add notification preferences to user model:**
   ```javascript
   notificationPreferences: {
     emailReminders: true,      // default true
     smsReminders: false,       // default false
     reminderDaysBefore: [1, 3, 7], // days before due date
     overdueReminders: true     // daily reminders for overdue
   }
   ```
3. **Install SMS library** - add `twilio` to package.json (or use a simpler HTTP-based SMS API)
4. **Create SMS utility** (`sms.js`):
   - Configure via env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - `sendSMS(to, message)` - core send function
5. **Create reminder scheduler** (in `server.js`):
   - New `setInterval` job running daily (configurable via `REMINDER_CHECK_INTERVAL_HOURS`, default 24)
   - `checkAndSendReminders()` function:
     a. Fetch all active projects
     b. For each project, fetch tasks
     c. Find tasks with `dueDate` approaching (within configured `reminderDaysBefore`)
     d. Find overdue tasks (past `dueDate`, not completed)
     e. Group reminders by owner (email)
     f. Look up user by email to get notification preferences and phone
     g. Send email digest (one email per user with all their upcoming/overdue tasks)
     h. Send SMS for high-priority items (if user opted in)
   - Log reminders sent to `reminder_log` DB key
6. **New API endpoints:**
   - `GET /api/admin/reminder-settings` - Get global reminder config
   - `PUT /api/admin/reminder-settings` - Update global config (enable/disable, timing, etc.)
   - `GET /api/admin/reminder-log` - View reminder history
   - `POST /api/admin/reminders/trigger` - Manually trigger reminder check (admin)
   - `PUT /api/users/:id/notification-preferences` - Update user's notification prefs
7. **Reminder templates:**
   - "Task due tomorrow" email/SMS
   - "Task due in X days" email
   - "Task overdue by X days" email/SMS
   - "Weekly digest" email (all upcoming tasks for the week)
8. **DB keys:**
   - `reminder_settings` - Global config object
   - `reminder_log` - Array of sent reminders (max 1000, with timestamp, userId, taskId, channel, status)

### Frontend Changes

9. **User profile** - add phone number field and notification preference toggles
10. **Admin settings panel** - reminder configuration section:
    - Enable/disable automated reminders
    - Set reminder intervals (days before due date)
    - Set check frequency
    - View reminder log/history
11. **Admin Hub** - reminder status dashboard card showing last run, next run, pending reminders count

### Config Changes

12. Add to `config.js`:
    - `REMINDER_CHECK_INTERVAL_HOURS` (default 24)
    - `REMINDER_DAYS_BEFORE` (default [1, 3, 7])
    - `REMINDER_LOG_MAX_ENTRIES` (default 1000)
    - SMS/Twilio config vars

---

## Feature 3: Client Task Messages/Notes in Launch Tracker

**Goal:** Allow clients to share messages or notes on tasks visible to them in the client portal, creating two-way communication on task progress.

### Backend Changes

1. **New "client messages" system** on tasks (separate from internal notes to maintain privacy):
   - New field on task: `clientMessages` array
   - Message structure:
     ```javascript
     {
       id: "uuid",
       content: "string",
       authorId: "userId",
       authorName: "string",
       authorRole: "client" | "admin" | "user",
       createdAt: "ISO8601",
       editedAt: "ISO8601" | null,
       readByAdmin: boolean,
       readByClient: boolean
     }
     ```
2. **New API endpoints:**
   - `POST /api/client-portal/projects/:projectId/tasks/:taskId/messages` (client + admin)
     - Client can only message on `showToClient: true` tasks for their assigned projects
     - Admin can message on any task
   - `GET /api/client-portal/projects/:projectId/tasks/:taskId/messages` (client + admin)
     - Returns messages for a specific task
   - `PUT /api/client-portal/projects/:projectId/tasks/:taskId/messages/:messageId` (author only)
     - Edit own message
   - `DELETE /api/client-portal/projects/:projectId/tasks/:taskId/messages/:messageId` (author + admin)
   - `PUT /api/client-portal/projects/:projectId/tasks/:taskId/messages/mark-read` (client + admin)
     - Mark all messages as read by the current user's role
3. **Unread message counter:**
   - `GET /api/client-portal/unread-count` (client) - Returns count of unread admin messages across all tasks
   - `GET /api/projects/:projectId/client-message-count` (admin) - Returns count of unread client messages
4. **Activity logging** for client messages: `client_message_added` event type
5. **Add `client_message_added` to client-safe activity types** in the portal data endpoint

### Frontend Changes - Client Portal (`public/portal.html`)

6. **Task message interface** on Milestones page:
   - Expandable message thread under each task
   - "Add a message" text input with send button
   - Message list showing author, timestamp, content
   - Unread indicator (dot/badge) on tasks with new messages
   - Character limit (1000 chars per message)
7. **Unread badge** on sidebar "Launch Milestones" nav item
8. **General project-level message/note area** (optional):
   - A "Messages" tab in the portal for general project communication
   - Not tied to specific tasks, for broader questions

### Frontend Changes - Admin App (`public/app.js`)

9. **Client messages indicator** in project task list:
   - Badge/icon showing unread client messages per task
   - Click to expand message thread
   - Reply capability inline
10. **Client messages dashboard widget** showing recent client messages across all projects

---

## Feature 4: Portal Access Gating (Pre-Install Checklist & Document Requirements)

**Goal:** Require that certain prerequisites are completed before a client gains full access to their portal. Specifically: pre-install checklist uploaded and client portal documents provided.

### Backend Changes

1. **New `portalAccessRequirements` field on project:**
   ```javascript
   portalAccessRequirements: {
     requireChecklist: true,        // Require soft-pilot checklist submission
     requireDocuments: ["string"],   // List of required document categories
     gatingEnabled: true,            // Master toggle
     bypassClients: ["clientId"]     // Clients who bypass (admin override)
   }
   ```
2. **New `portalAccessStatus` computed on client-portal/data endpoint:**
   - Check if project has `softPilotChecklistSubmitted` (existing field)
   - Check if required documents exist in `client_documents` for this slug
   - Return `{ accessGranted: boolean, requirements: [...], completed: [...], missing: [...] }`
3. **Modify `GET /api/client-portal/data`** endpoint:
   - Add portal access check after authentication
   - If requirements not met: return limited data with `portalLocked: true` and the requirements status
   - Client sees only: welcome message, requirements checklist, upload forms for missing items
   - Full portal data (milestones, inventory, files) withheld until requirements met
4. **New API endpoints:**
   - `GET /api/client-portal/access-status` (client) - Check current portal access status
   - `PUT /api/admin/projects/:projectId/portal-requirements` (admin) - Configure requirements per project
   - `POST /api/admin/projects/:projectId/portal-bypass/:clientId` (admin) - Grant bypass to specific client
   - `POST /api/client-portal/upload-requirement` (client) - Upload a required document
5. **Admin override** - ability to manually grant portal access regardless of requirements

### Frontend Changes - Client Portal (`public/portal.html`)

6. **Portal gating screen:**
   - When `portalLocked: true`, show a dedicated "Getting Started" page instead of full portal
   - Checklist of requirements with completion status
   - Upload interface for missing documents
   - Pre-install checklist submission form (re-use existing soft-pilot flow)
   - Progress indicator showing how many requirements are fulfilled
   - Contact info/message if client needs help
7. **Conditional navigation** - hide sidebar items (Milestones, Inventory, Files, Support) when portal is locked
8. **Transition state** - smooth unlock when final requirement is met (auto-refresh to full portal)

### Frontend Changes - Admin (`public/app.js`)

9. **Portal requirements config** in project settings:
   - Toggle gating on/off per project
   - Select which documents are required
   - View current compliance status per client
   - Manual bypass button
10. **Client readiness dashboard** showing which clients have met requirements and which haven't

### Config Changes

11. Add to `config.js`:
    - `PORTAL_DEFAULT_GATING_ENABLED` (default false - opt-in per project)
    - `PORTAL_REQUIRED_DOCUMENT_CATEGORIES` (default list of standard categories)

---

## Feature 5: Automated Feedback Surveys at 30, 60, and 90 Day Marks

**Goal:** Automatically send feedback surveys to clients at the 30-day, 60-day, and 90-day milestones of their implementation project. Collect satisfaction ratings, NPS scores, and open-ended feedback to track client sentiment over the course of the launch.

### Context

- The existing `feedback_requests` system is a bug report/feature request inbox — it is NOT a survey system. This feature is entirely new.
- Projects have `createdAt` and optional `goLiveDate` fields that can anchor the milestone timeline.
- The survey scheduler will depend on Feature 1's email infrastructure (`email.js` / nodemailer).

### Backend Changes (`server.js`)

1. **Survey data model** — DB key `feedback_surveys` (array):
   ```javascript
   {
     id: "uuid",
     projectId: "string",
     projectName: "string",
     clientSlug: "string",
     clientUserId: "string",
     clientEmail: "string",
     milestoneDay: 30 | 60 | 90,
     status: "pending" | "sent" | "completed" | "expired",
     sentAt: "ISO8601" | null,
     completedAt: "ISO8601" | null,
     expiresAt: "ISO8601",            // e.g. 14 days after send
     surveyToken: "uuid",             // Unique token for unauthenticated access
     responses: {
       overallSatisfaction: 1-5,       // Star rating
       npsScore: 0-10,                // "How likely to recommend?"
       communicationRating: 1-5,       // Communication quality
       timelinessRating: 1-5,          // On-time delivery
       supportRating: 1-5,             // Support responsiveness
       highlights: "string",           // "What's going well?"
       improvements: "string",         // "What could be improved?"
       additionalComments: "string"    // Open-ended
     } | null
   }
   ```

2. **Survey configuration** — DB key `survey_settings` (object):
   ```javascript
   {
     enabled: true,
     milestoneDays: [30, 60, 90],
     anchorField: "createdAt",         // "createdAt" or "goLiveDate" — which date to count from
     surveyExpiryDays: 14,             // Days before survey link expires
     reminderAfterDays: 3,             // Send follow-up reminder if not completed
     autoSend: true,                   // Send automatically vs. queue for admin review
     emailSubjectTemplate: "How's your launch going? {milestonDay}-Day Check-in",
     excludedProjectIds: []            // Projects opted out of surveys
   }
   ```

3. **Survey scheduler** — new `setInterval` job (runs daily, same pattern as reminder scheduler):
   - `checkAndQueueSurveys()` function:
     a. Fetch all active projects
     b. For each project, calculate days since anchor date (`createdAt` or `goLiveDate`)
     c. Check if project has hit a 30/60/90 day milestone
     d. Check if a survey for this project + milestone already exists (prevent duplicates)
     e. Find the associated client user(s) by matching project's `clientLinkSlug` to user `slug`
     f. Create survey record with status `pending`
     g. If `autoSend: true`, immediately send survey email with unique `surveyToken` link
     h. If `autoSend: false`, leave as `pending` for admin to review and trigger manually
   - `sendSurveyReminders()` function:
     a. Find surveys with status `sent` that are past `reminderAfterDays` and not yet completed
     b. Send a follow-up reminder email
     c. Mark survey as reminded (add `remindedAt` timestamp)
   - `expireSurveys()` function:
     a. Find surveys past `expiresAt` that are still `sent`
     b. Update status to `expired`

4. **New API endpoints:**
   - `GET /api/surveys` (admin) — List all surveys with filtering by status, project, milestone
   - `GET /api/surveys/:projectId` (admin) — Get surveys for a specific project
   - `POST /api/admin/surveys/trigger/:projectId` (admin) — Manually trigger/queue a survey for a project
   - `POST /api/admin/surveys/send/:surveyId` (admin) — Manually send a pending survey
   - `PUT /api/admin/survey-settings` (admin) — Update global survey configuration
   - `GET /api/admin/survey-settings` (admin) — Get global survey configuration
   - `GET /api/admin/survey-analytics` (admin) — Aggregated survey analytics (avg scores, trends, NPS)
   - `GET /api/survey/respond/:surveyToken` (public, no auth) — Serve the survey form (validates token + expiry)
   - `POST /api/survey/respond/:surveyToken` (public, no auth) — Submit survey response (validates token + expiry)
     - Validates all rating fields are within range
     - Updates survey record status to `completed`
     - Logs activity as `survey_completed`

5. **Survey analytics helper** — `computeSurveyAnalytics()`:
   - Average scores per question across all completed surveys
   - NPS calculation: `(% Promoters [9-10]) - (% Detractors [0-6])`
   - Trend data: score averages grouped by milestone (30 vs 60 vs 90 day)
   - Per-project breakdown
   - Response rate: `completed / (sent + completed + expired)`

6. **Activity logging** — new event types:
   - `survey_sent` — Survey email dispatched
   - `survey_completed` — Client submitted response
   - `survey_expired` — Survey expired without response
   - `survey_reminder_sent` — Follow-up reminder sent

### Frontend Changes — Survey Response Page (`public/survey.html`, new file)

7. **Standalone survey page** (accessed via token link, no login required):
   - Branded Thrive 365 Labs header with project name
   - Progress indicator (Step 1 of 3, etc.)
   - **Section 1: Ratings**
     - Overall satisfaction (1-5 stars)
     - NPS score (0-10 scale with Detractor/Passive/Promoter labels)
     - Communication rating (1-5 stars)
     - Timeliness rating (1-5 stars)
     - Support rating (1-5 stars)
   - **Section 2: Open-Ended**
     - "What's going well?" (textarea)
     - "What could be improved?" (textarea)
   - **Section 3: Additional Comments**
     - Free-form textarea
   - Submit button with thank-you confirmation screen
   - Expired/already-completed states with appropriate messaging
   - Mobile-responsive design matching portal branding

### Frontend Changes — Admin App (`public/app.js`)

8. **Survey dashboard widget** on the main project list or admin hub:
   - Pending surveys awaiting send
   - Recent survey responses with scores
   - Overall NPS trend chart (simple bar/line)
9. **Per-project survey tab** in the project detail view:
   - Timeline showing 30/60/90 milestones with survey status icons
   - View completed survey responses inline
   - Manually trigger/resend survey buttons
   - Opt-out toggle for this specific project
10. **Survey settings page** in admin area:
    - Enable/disable automated surveys globally
    - Configure milestone days (add/remove checkpoints)
    - Choose anchor date (project created vs. go-live)
    - Set expiry window and reminder timing
    - Email template preview

### Frontend Changes — Client Portal (`public/portal.html`)

11. **Survey prompt banner** (optional):
    - When a survey is pending/sent for the current client, show a subtle banner: "We'd love your feedback! Complete your {X}-day check-in survey."
    - Links to the survey page

### Email Templates

12. **Survey invitation email:**
    - Subject: "How's your launch going? {30/60/90}-Day Check-in"
    - Body: Project name, milestone reached, direct link to survey form
    - Branded with Thrive 365 Labs styling
13. **Survey reminder email:**
    - Subject: "Reminder: Your feedback matters — {30/60/90}-Day Check-in"
    - Softer tone, same survey link
14. **Survey thank-you email:**
    - Auto-sent after submission
    - Subject: "Thank you for your feedback!"
    - Brief acknowledgment with any relevant next steps

### Config Changes (`config.js`)

15. Add survey-related constants:
    - `SURVEY_MILESTONE_DAYS` (default `[30, 60, 90]`)
    - `SURVEY_EXPIRY_DAYS` (default 14)
    - `SURVEY_REMINDER_AFTER_DAYS` (default 3)
    - `SURVEY_CHECK_INTERVAL_HOURS` (default 24)
    - `SURVEY_LOG_MAX_ENTRIES` (default 500)

---

## Feature 6: Claude API Integration

**Goal:** Integrate the Anthropic Claude API into the platform to power AI-assisted features across the app — intelligent project summaries, communication drafting, task recommendations, and feedback analysis.

> **Note:** Full implementation is being developed on a separate branch. This entry documents the feature scope and its touchpoints with Features 1-5 for coordination purposes.

### Backend Changes (`server.js`)

1. **Create Claude API utility module** (`claude.js`):
   - Configure via env var `ANTHROPIC_API_KEY`
   - Core `callClaude(systemPrompt, userMessage, options?)` helper using the Anthropic SDK (`@anthropic-ai/sdk`)
   - Request wrapper with retry logic, rate limiting, and token budget controls
   - Model selection: default to `claude-sonnet-4-5-20250929` for speed-sensitive calls, `claude-opus-4-6` for complex analysis
2. **AI-powered endpoints:**
   - `POST /api/ai/project-summary/:projectId` (admin) — Generate a natural-language project status summary from task data (completion %, blockers, upcoming milestones, risk areas)
   - `POST /api/ai/draft-email` (admin) — Draft client communication given context (project status, milestone, tone). Feeds into Feature 1's email composer as a "Draft with AI" option
   - `POST /api/ai/task-recommendations/:projectId` (admin) — Analyze current task state and suggest next priorities, flag at-risk tasks, recommend owner reassignments
   - `POST /api/ai/analyze-feedback` (admin) — Summarize and extract themes from Feature 5 survey responses across projects. Identify trends, common complaints, and highlights
   - `POST /api/ai/client-message-suggest/:projectId/:taskId` (admin) — Suggest a reply to a client message from Feature 3, given conversation history and task context
3. **Usage tracking** — DB key `ai_usage_log` (array, max 1000):
   ```javascript
   {
     id: "uuid",
     endpoint: "string",           // Which AI feature was used
     userId: "string",
     projectId: "string" | null,
     model: "string",              // Which Claude model was called
     inputTokens: number,
     outputTokens: number,
     durationMs: number,
     createdAt: "ISO8601"
   }
   ```
4. **Admin controls:**
   - `GET /api/admin/ai-settings` — Get AI feature config
   - `PUT /api/admin/ai-settings` — Update config (enable/disable individual features, set token budget)
   - `GET /api/admin/ai-usage` — View usage log and token consumption stats
5. **AI settings** — DB key `ai_settings` (object):
   ```javascript
   {
     enabled: true,
     features: {
       projectSummary: true,
       emailDrafting: true,
       taskRecommendations: true,
       feedbackAnalysis: true,
       messageSuggestions: true
     },
     monthlyTokenBudget: 1000000,    // Max tokens per month (input + output)
     defaultModel: "claude-sonnet-4-5-20250929"
   }
   ```

### Frontend Changes (`public/app.js`)

6. **"Draft with AI" button** in the Feature 1 email composer — generates a draft email based on project context and selected template type; user can edit before sending
7. **"AI Summary" button** in project header — generates a one-click project status narrative viewable in a modal
8. **"AI Insights" panel** in project task list — shows AI-generated task recommendations (priority suggestions, risk flags, owner rebalancing)
9. **"Suggest Reply" button** in Feature 3 admin message thread — drafts a contextual reply to the client's message
10. **"Analyze Responses" button** in Feature 5 survey analytics — generates thematic summary of survey open-ended responses

### Frontend Changes (`public/admin-hub.html`)

11. **AI usage dashboard card** — token consumption this month vs. budget, most-used features, recent calls

### Integration Points with Other Features

| Feature | Claude API Touchpoint |
|---------|----------------------|
| Feature 1 (Email) | "Draft with AI" in email composer |
| Feature 2 (Reminders) | Could generate personalized reminder text (future enhancement) |
| Feature 3 (Client messages) | "Suggest Reply" for admin responses |
| Feature 5 (Surveys) | Thematic analysis of open-ended survey responses |

### Config Changes (`config.js`)

12. Add AI-related constants:
    - `AI_DEFAULT_MODEL` (default `claude-sonnet-4-5-20250929`)
    - `AI_MONTHLY_TOKEN_BUDGET` (default 1000000)
    - `AI_USAGE_LOG_MAX_ENTRIES` (default 1000)
    - `AI_REQUEST_TIMEOUT_MS` (default 30000)

---

## Implementation Order

Recommended sequencing (dependencies flow top-down):

1. **Feature 1 (Email infrastructure)** - Foundation for Features 2 and 5
   - Install nodemailer, create email.js module, config, basic send endpoint
2. **Feature 6 (Claude API)** - Foundation for AI features across 1, 3, 5; developed on separate branch
   - Install Anthropic SDK, create claude.js module, usage tracking, admin settings
3. **Feature 3 (Client messages)** - Independent, high user value
   - Backend endpoints, portal UI, admin UI
4. **Feature 2 (Automated reminders)** - Depends on Feature 1's email infra
   - Phone field, SMS module, scheduler, reminder templates, admin settings
5. **Feature 5 (Feedback surveys)** - Depends on Feature 1's email infra
   - Survey model, scheduler, public survey page, analytics, admin config
6. **Feature 4 (Portal gating)** - Independent, moderate complexity
   - Backend gating logic, portal lock screen, admin config

---

## Environment Variables Required (New)

| Variable | Required | Default | Feature |
|----------|----------|---------|---------|
| `SMTP_HOST` | For email | None | 1, 2 |
| `SMTP_PORT` | For email | 587 | 1, 2 |
| `SMTP_USER` | For email | None | 1, 2 |
| `SMTP_PASS` | For email | None | 1, 2 |
| `SMTP_FROM` | For email | None | 1, 2 |
| `TWILIO_ACCOUNT_SID` | For SMS | None | 2 |
| `TWILIO_AUTH_TOKEN` | For SMS | None | 2 |
| `TWILIO_PHONE_NUMBER` | For SMS | None | 2 |
| `REMINDER_CHECK_INTERVAL_HOURS` | No | 24 | 2 |
| `ANTHROPIC_API_KEY` | For AI | None | 6 |

## New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `nodemailer` | ^6.x | Email sending |
| `twilio` | ^4.x | SMS sending |
| `@anthropic-ai/sdk` | ^0.x | Claude API client |

## New Database Keys

| Key | Type | Feature |
|-----|------|---------|
| `email_templates` | Array | 1 |
| `email_log` | Array (max 500) | 1 |
| `reminder_settings` | Object | 2 |
| `reminder_log` | Array (max 1000) | 2 |
| `feedback_surveys` | Array | 5 |
| `survey_settings` | Object | 5 |
| `ai_usage_log` | Array (max 1000) | 6 |
| `ai_settings` | Object | 6 |

## Files Modified

| File | Features | Changes |
|------|----------|---------|
| `server.js` | 1, 2, 3, 4, 5, 6 | New endpoints, schedulers, gating middleware, survey logic, AI endpoints |
| `public/app.js` | 1, 2, 3, 4, 5, 6 | Email composer, reminder settings, client message UI, gating config, survey dashboard/admin, AI draft/summary/insights buttons |
| `public/portal.html` | 3, 4, 5 | Client messaging UI, portal lock screen, survey prompt banner |
| `public/admin-hub.html` | 2, 5, 6 | Reminder dashboard card, survey status overview, AI usage card |
| `public/survey.html` (new) | 5 | Standalone survey response page (public, token-gated) |
| `config.js` | 1, 2, 4, 5, 6 | New config constants |
| `package.json` | 1, 2, 6 | New dependencies |
| `email.js` (new) | 1, 2, 5 | Email utility module (shared by email, reminders, surveys) |
| `sms.js` (new) | 2 | SMS utility module |
| `claude.js` (new) | 6 | Claude API utility module (developed on separate branch) |
