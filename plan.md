# Implementation Plan: Launch Tracker Feature Set

## Current State Summary

- **No email infrastructure** - zero email/SMS libraries, no notification system
- **No phone field** on user model - only email exists for contact
- **Task notes exist** but are internal-only (not exposed to client portal)
- **Soft-pilot checklist** exists but does not gate portal access
- **HubSpot polling** is the only scheduled process (60s interval)
- **Activity log** exists (max 500 entries) but has no push notification capability

---

## Feature 1: Email Infrastructure & Notification Queue

**Goal:** Build the foundational email delivery system and centralized notification queue that powers Features 2, 5, and ad-hoc admin communications. Uses Resend as the transactional email service (10K emails/month free tier). Architecture designed for clean migration to Supabase Edge Functions later.

> **Architecture decision:** Queue-based system that separates "when to notify" from "how to notify." All notifications flow through `pending_notifications` — the queue is processed by a scheduler, and delivery is handled by a pluggable email service layer. This lets us add SMS/in-app channels later without rebuilding.

### Backend Changes

1. **Install `resend`** — add to package.json dependencies (replaces nodemailer)
2. **Create email service module** (`email.js`):
   - Configure via env var `RESEND_API_KEY`
   - `sendEmail(to, subject, body, options?)` — core send via Resend API
   - `sendBulkEmail(recipients[], subject, body)` — batch send with rate limiting
   - `FROM_EMAIL` configurable via env var (default: `notifications@thrive365labs.com`)
   - **Phase 1:** Plain text email bodies — simple content + CTA link, works everywhere
   - **Phase 2:** Branded HTML templates for client-facing notifications (milestone updates, portal nudges)
3. **Notification queue** — DB key `pending_notifications` (array):
   ```javascript
   {
     id: "uuid",
     type: "service_report_signature" | "service_report_review" | "task_deadline" |
           "task_overdue" | "inventory_reminder" | "ticket_followup" |
           "announcement_nudge" | "milestone_reached" | "milestone_reminder" |
           "survey_invitation" | "survey_reminder" | "custom_email",
     recipientUserId: "string",
     recipientEmail: "string",
     recipientName: "string",
     channel: "email",                    // Future: "sms" | "in_app"
     triggerDate: "ISO8601",              // When this should be sent
     status: "pending" | "sent" | "failed" | "cancelled",
     retryCount: 0,
     maxRetries: 3,
     relatedEntityId: "string" | null,    // projectId, serviceReportId, etc.
     relatedEntityType: "string" | null,  // "project", "service_report", "task", etc.
     templateData: {                      // Dynamic content for the notification
       subject: "string",
       body: "string",                    // Plain text (Phase 1)
       htmlBody: "string" | null,         // HTML (Phase 2, optional)
       ctaUrl: "string" | null,           // Call-to-action link
       ctaLabel: "string" | null          // e.g. "View Task", "Sign Report"
     },
     sentAt: "ISO8601" | null,
     failedAt: "ISO8601" | null,
     failureReason: "string" | null,
     createdAt: "ISO8601",
     createdBy: "userId" | "system"       // "system" for automated, userId for manual
   }
   ```
4. **Queue processor** — `processNotificationQueue()`:
   - Runs on `setInterval` every 15 minutes (configurable via `NOTIFICATION_CHECK_INTERVAL_MINUTES`)
   - Fetches all `pending` notifications where `triggerDate <= now`
   - Sends via `email.js` sendEmail()
   - Updates status to `sent` with `sentAt` timestamp
   - On failure: increments `retryCount`, sets `failedAt` + `failureReason`
   - Permanently fails after `maxRetries` reached
   - Moves processed notifications to `notification_log` (sent/failed archive, max 2000 entries)
5. **Queue management endpoints:**
   - `GET /api/admin/notifications/queue` (admin) — View pending notifications with filtering
   - `GET /api/admin/notifications/log` (admin) — View sent/failed notification history
   - `POST /api/admin/notifications/cancel/:id` (admin) — Cancel a pending notification
   - `POST /api/admin/notifications/retry/:id` (admin) — Retry a failed notification
   - `GET /api/admin/notifications/stats` (admin) — Queue stats: pending count, sent today, failure rate
6. **Ad-hoc email endpoints** (admin manual sends, using the queue):
   - `POST /api/email/send` (admin) — Queue an ad-hoc email to selected users
     - Body: `{ to: [emails], subject, message, templateType?, projectId? }`
     - Creates notification records with `type: "custom_email"` and `triggerDate: now`
   - `POST /api/email/send-progress-update/:projectId` (admin) — Queue a project progress summary email
     - Auto-generates progress stats from tasks, queues for immediate delivery
   - `GET /api/email/history` (admin) — View sent email log (filtered from `notification_log`)
7. **Notification settings** — DB key `notification_settings` (object):
   ```javascript
   {
     enabled: true,
     checkIntervalMinutes: 15,
     maxRetriesDefault: 3,
     dailySendLimit: 500,             // Safety cap
     enabledChannels: ["email"],      // Future: ["email", "sms", "in_app"]
     fromEmail: "notifications@thrive365labs.com",
     fromName: "Thrive 365 Labs"
   }
   ```

### Frontend Changes (`public/app.js`)

8. **Email composer panel** in the project view:
   - Slide-out or modal panel triggered from project header
   - Recipient selector (client user, team members, custom email)
   - Template selector dropdown (progress update, milestone, custom)
   - Plain text message area (Phase 1) — upgrade to rich-text in Phase 2
   - Preview before send
   - Send button with confirmation
9. **Email history tab** in project view showing sent communications
10. **Notification queue dashboard** in admin hub:
    - Pending queue count, sent today, failure rate
    - Recent failures with retry buttons
    - Manual cancel capability for scheduled notifications

### Config Changes (`config.js`)

11. Add notification/email config constants:
    - `NOTIFICATION_CHECK_INTERVAL_MINUTES` (default 15)
    - `NOTIFICATION_LOG_MAX_ENTRIES` (default 2000)
    - `NOTIFICATION_MAX_RETRIES` (default 3)
    - `NOTIFICATION_DAILY_SEND_LIMIT` (default 500)
    - `EMAIL_FROM_ADDRESS` (default `notifications@thrive365labs.com`)

### Supabase Migration Path

> When moving to Supabase: the `pending_notifications` DB key becomes a Postgres table with the same schema. The `setInterval` processor becomes a Supabase Edge Function triggered by `pg_cron`. The Resend integration stays the same — only the queue storage and scheduling mechanism change.

---

## Feature 2: Automated Reminders & Notification Triggers

**Goal:** Automatically create notification queue entries for four key scenarios: service report follow-ups, task deadline alerts, client portal activity nudges, and implementation milestone reminders. Sends to both clients and internal team members based on context.

> **Architecture:** This feature does NOT send emails directly. It creates entries in the `pending_notifications` queue (Feature 1) which are processed and delivered by the queue processor. This keeps "when to notify" logic cleanly separated from "how to notify" delivery.

### Notification Scenarios

#### Scenario A: Service Report Follow-Ups

**Triggers:**
- Service report created but missing client signature → notify client (`service_report_signature`)
- Service report created but not reviewed by admin → notify assigned admin (`service_report_review`)
- Service report pending for 3+ days → re-notify with escalation

**Recipients:** Client user (for signatures), assigned technician/admin (for reviews)

**Template data:**
```javascript
{
  subject: "Action needed: Service report for {clientName} awaits your signature",
  body: "A service report from {technicianName} on {reportDate} requires your signature. Please review and sign at your earliest convenience.",
  ctaUrl: "/service-portal/reports/{reportId}",
  ctaLabel: "Review & Sign"
}
```

#### Scenario B: Task Deadline Notifications

**Triggers:**
- Task due in 7 days → notify assigned owner (`task_deadline`, severity: low)
- Task due in 3 days → notify assigned owner (`task_deadline`, severity: medium)
- Task due tomorrow → notify assigned owner (`task_deadline`, severity: high)
- Task overdue → notify assigned owner + project manager (`task_overdue`)
- Task overdue 7+ days → escalation to admin

**Recipients:** Task owner (by email lookup), secondary owner, project manager

**Template data:**
```javascript
{
  subject: "Task due {timeframe}: {taskTitle} — {projectName}",
  body: "{taskTitle} in {phase} is due {dueDate}. Current status: {status}.",
  ctaUrl: "/launch/{projectSlug}",
  ctaLabel: "View Task"
}
```

#### Scenario C: Client Portal Activity Nudges

**Triggers:**
- Inventory not submitted in 7+ days → nudge client (`inventory_reminder`)
- Client has open support ticket with no response for 3+ days → nudge client (`ticket_followup`)
- New announcement posted targeting client → nudge client (`announcement_nudge`)

**Recipients:** Client user(s) by slug

**Template data:**
```javascript
{
  subject: "Reminder: Your weekly inventory update is due — {practiceName}",
  body: "Your last inventory submission was {daysSince} days ago. Please submit your weekly update to keep your lab supplies on track.",
  ctaUrl: "/portal/{slug}",
  ctaLabel: "Submit Inventory"
}
```

#### Scenario D: Implementation Milestone Reminders

**Triggers:**
- Project reaches 25% / 50% / 75% / 100% task completion → notify client + PM (`milestone_reached`)
- Go-live date approaching (30 / 14 / 7 days out) → notify client + team (`milestone_reminder`)
- Phase transition (all tasks in a phase completed) → notify client + PM (`milestone_reached`)

**Recipients:** Client user, project manager, assigned team members

**Template data:**
```javascript
{
  subject: "Milestone reached: {projectName} is {percentage}% complete!",
  body: "Great progress! {projectName} has reached {percentage}% completion. {completedTasks} of {totalTasks} tasks are done. Next up: {nextPhase}.",
  ctaUrl: "/portal/{slug}",
  ctaLabel: "View Progress"
}
```

### Backend Changes (`server.js`)

1. **Add `phone` field to user model** — update `POST /api/users` and `PUT /api/users/:id` to accept optional `phone` field (for future SMS channel)
2. **Add notification preferences to user model:**
   ```javascript
   notificationPreferences: {
     emailReminders: true,        // default true
     smsReminders: false,         // default false (future)
     reminderDaysBefore: [1, 3, 7],
     overdueReminders: true,
     inventoryReminders: true,
     milestoneNotifications: true,
     quietHoursStart: null,       // e.g. "22:00" (future)
     quietHoursEnd: null          // e.g. "08:00" (future)
   }
   ```
3. **Notification trigger scanner** — `scanAndQueueNotifications()`:
   - Runs on `setInterval` every 30 minutes (separate from queue processor)
   - **Service reports scan:** Query `service_reports` for unsigned/unreviewed reports, check if notification already queued (dedup by `relatedEntityId` + `type`), queue new notifications
   - **Task deadline scan:** For each active project, scan tasks for approaching/overdue due dates, dedup against existing queue entries, queue with appropriate severity
   - **Client activity scan:** Check last `inventory_submissions_{slug}` date per client, check open tickets, queue nudges for inactive clients
   - **Milestone scan:** Calculate per-project completion %, compare against last notified milestone (stored on project as `lastMilestoneNotified`), queue milestone notifications
   - All scans dedup against `pending_notifications` to prevent repeat sends
4. **Deduplication logic:**
   ```javascript
   // Before queuing, check if notification already exists
   const isDuplicate = queue.some(n =>
     n.type === type &&
     n.relatedEntityId === entityId &&
     n.recipientUserId === userId &&
     n.status === 'pending'
   );
   ```
5. **New API endpoints:**
   - `GET /api/admin/reminder-settings` — Get global reminder/trigger config
   - `PUT /api/admin/reminder-settings` — Update config (enable/disable per scenario, timing)
   - `POST /api/admin/reminders/trigger` — Manually run `scanAndQueueNotifications()` (admin)
   - `PUT /api/users/:id/notification-preferences` — Update user's notification prefs
6. **Reminder settings** — DB key `reminder_settings` (object):
   ```javascript
   {
     enabled: true,
     scanIntervalMinutes: 30,
     scenarios: {
       serviceReportFollowups: { enabled: true, reminderAfterDays: 3 },
       taskDeadlines: { enabled: true, daysBefore: [1, 3, 7], overdueEscalationDays: 7 },
       clientActivityNudges: { enabled: true, inventoryReminderDays: 7, ticketFollowupDays: 3 },
       milestoneReminders: { enabled: true, milestoneThresholds: [25, 50, 75, 100], goLiveDaysBefore: [7, 14, 30] }
     }
   }
   ```
7. **Add `lastMilestoneNotified` field to project model** — tracks the last completion percentage that triggered a notification, prevents re-sending

### Frontend Changes

8. **User profile** — add phone number field and notification preference toggles (per-scenario opt-in/out)
9. **Admin settings panel** — notification trigger configuration:
    - Per-scenario enable/disable toggles
    - Timing configuration per scenario (days before, reminder intervals)
    - View pending queue filtered by scenario type
10. **Admin Hub** — notification status dashboard card:
    - Last scan timestamp, next scan
    - Pending notifications by scenario type
    - Sent/failed counts for last 24h

### Config Changes (`config.js`)

11. Add to `config.js`:
    - `NOTIFICATION_SCAN_INTERVAL_MINUTES` (default 30)
    - `TASK_DEADLINE_DAYS_BEFORE` (default `[1, 3, 7]`)
    - `TASK_OVERDUE_ESCALATION_DAYS` (default 7)
    - `INVENTORY_REMINDER_DAYS` (default 7)
    - `SERVICE_REPORT_FOLLOWUP_DAYS` (default 3)
    - `MILESTONE_THRESHOLDS` (default `[25, 50, 75, 100]`)
    - `GOLIVE_REMINDER_DAYS_BEFORE` (default `[7, 14, 30]`)

### Template Phasing

- **Phase 1 (launch):** All notifications as plain text — subject + body + CTA link. Simple, reliable, fast to build.
- **Phase 2 (post-validation):** Upgrade high-value client-facing notifications to branded HTML templates:
  - Milestone reached (celebratory design with progress bar)
  - Go-live countdown (branded urgency)
  - Inventory reminder (clean, professional)
  - Keep internal notifications (task deadlines, service report reviews) as plain text

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

1. **Feature 1 (Email + notification queue)** — Foundation for everything; Resend + queue processor + admin endpoints
   - Install resend, create email.js, notification queue schema, queue processor, admin UI
2. **Feature 2 (Automated notification triggers)** — Depends on Feature 1's queue; four scenario scanners
   - Service report follow-ups, task deadlines, client nudges, milestone reminders (all plain text Phase 1)
3. **Feature 6 (Claude API)** — Foundation for AI features across 1, 3, 5; developed on separate branch
   - Install Anthropic SDK, create claude.js module, usage tracking, admin settings
4. **Feature 3 (Client messages)** — Independent, high user value
   - Backend endpoints, portal UI, admin UI
5. **Feature 5 (Feedback surveys)** — Depends on Feature 1's queue for email delivery
   - Survey model, scheduler, public survey page, analytics, admin config
6. **Feature 4 (Portal gating)** — Independent, moderate complexity
   - Backend gating logic, portal lock screen, admin config
7. **Phase 2 HTML templates** — After all features validated with plain text
   - Upgrade milestone, go-live, inventory, and survey emails to branded HTML

---

## Environment Variables Required (New)

| Variable | Required | Default | Feature |
|----------|----------|---------|---------|
| `RESEND_API_KEY` | For email | None | 1, 2, 5 |
| `EMAIL_FROM_ADDRESS` | No | `notifications@thrive365labs.com` | 1, 2, 5 |
| `NOTIFICATION_CHECK_INTERVAL_MINUTES` | No | 15 | 1 |
| `NOTIFICATION_SCAN_INTERVAL_MINUTES` | No | 30 | 2 |
| `ANTHROPIC_API_KEY` | For AI | None | 6 |

> **Future (SMS channel):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — not needed for Phase 1

## New Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `resend` | ^3.x | Transactional email via Resend API (10K/month free) |
| `@anthropic-ai/sdk` | ^0.x | Claude API client |

> **Future:** `twilio` for SMS channel (Phase 2+)

## New Database Keys

| Key | Type | Feature |
|-----|------|---------|
| `pending_notifications` | Array | 1 |
| `notification_log` | Array (max 2000) | 1 |
| `notification_settings` | Object | 1 |
| `reminder_settings` | Object | 2 |
| `feedback_surveys` | Array | 5 |
| `survey_settings` | Object | 5 |
| `ai_usage_log` | Array (max 1000) | 6 |
| `ai_settings` | Object | 6 |

## Files Modified

| File | Features | Changes |
|------|----------|---------|
| `server.js` | 1, 2, 3, 4, 5, 6 | Notification queue processor, trigger scanners, new endpoints, gating middleware, survey logic, AI endpoints |
| `public/app.js` | 1, 2, 3, 4, 5, 6 | Email composer, notification queue dashboard, reminder settings, client message UI, gating config, survey dashboard/admin, AI buttons |
| `public/portal.html` | 3, 4, 5 | Client messaging UI, portal lock screen, survey prompt banner |
| `public/admin-hub.html` | 1, 2, 5, 6 | Notification queue stats, reminder status card, survey status overview, AI usage card |
| `public/survey.html` (new) | 5 | Standalone survey response page (public, token-gated) |
| `config.js` | 1, 2, 4, 5, 6 | New config constants |
| `package.json` | 1, 6 | New dependencies (resend, @anthropic-ai/sdk) |
| `email.js` (new) | 1, 2, 5 | Resend email service module (shared by queue, reminders, surveys) |
| `claude.js` (new) | 6 | Claude API utility module (developed on separate branch) |

---

## Supabase Migration Notes

> The architecture is designed for a clean migration to Supabase when the time comes. Here's what changes:

| Current (Replit) | Future (Supabase) | What stays the same |
|------------------|-------------------|---------------------|
| Replit DB key-value store | Postgres tables | Data models / schemas |
| `setInterval` queue processor (15 min) | `pg_cron` + Edge Function | Processing logic |
| `setInterval` trigger scanner (30 min) | `pg_cron` + Edge Function | Scanning logic |
| Resend SDK in Node.js | Resend SDK in Edge Function | Resend API key + templates |
| In-memory dedup checks | SQL `WHERE NOT EXISTS` | Dedup logic (cleaner in SQL) |
| Manual `notification_log` truncation | Postgres partitioning / TTL | Log retention policy |

**Migration steps:**
1. Create Postgres tables matching current DB key schemas
2. Move `processNotificationQueue()` to a Supabase Edge Function triggered by `pg_cron`
3. Move `scanAndQueueNotifications()` to a separate Edge Function on its own cron schedule
4. Keep `email.js` (Resend) as-is — works identically in Edge Functions
5. Update API endpoints to query Postgres instead of Replit DB
