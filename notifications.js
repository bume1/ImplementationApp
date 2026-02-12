// ============================================================
// notifications.js - Automated Messaging Module
// ============================================================
// Handles SMS, voice call reminders, and notification orchestration
// using Twilio. Supports automated task reminders, welcome call
// scheduling, and ad-hoc messaging between clients and team.
//
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// Optional: TWILIO_TWIML_URL (for voice call scripts)
// ============================================================

let twilioClient = null;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_TWIML_URL = process.env.TWILIO_TWIML_URL || null;

// Initialize Twilio client if credentials are available
function initTwilio() {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('Twilio client initialized successfully');
      return true;
    } catch (err) {
      console.warn('Twilio SDK not installed. Run: npm install twilio');
      console.warn('SMS/voice features will be disabled.');
      return false;
    }
  } else {
    console.warn('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.');
    console.warn('SMS/voice features will be disabled. Notifications will be logged only.');
    return false;
  }
}

// Check if Twilio is configured and ready
function isConfigured() {
  return !!(twilioClient && TWILIO_PHONE_NUMBER);
}

// ---- SMS Functions ----

async function sendSMS(to, body) {
  if (!isConfigured()) {
    console.log(`[SMS-DRY-RUN] To: ${to} | Body: ${body}`);
    return { success: true, dryRun: true, to, body };
  }

  try {
    const message = await twilioClient.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to
    });
    return { success: true, sid: message.sid, to, status: message.status };
  } catch (err) {
    console.error(`SMS send failed to ${to}:`, err.message);
    return { success: false, error: err.message, to };
  }
}

// ---- Voice Call Functions ----

async function makeReminderCall(to, twimlMessage) {
  if (!isConfigured()) {
    console.log(`[CALL-DRY-RUN] To: ${to} | Message: ${twimlMessage}`);
    return { success: true, dryRun: true, to, message: twimlMessage };
  }

  try {
    // Use TwiML to speak the reminder message
    const twiml = `<Response><Say voice="alice">${escapeXml(twimlMessage)}</Say></Response>`;

    const call = await twilioClient.calls.create({
      twiml,
      from: TWILIO_PHONE_NUMBER,
      to
    });
    return { success: true, sid: call.sid, to, status: call.status };
  } catch (err) {
    console.error(`Call failed to ${to}:`, err.message);
    return { success: false, error: err.message, to };
  }
}

// ---- Message Templates ----

const TEMPLATES = {
  // Task reminders
  taskDueSoon: (projectName, taskTitle, dueDate) =>
    `[Thrive 365 Labs] Reminder: "${taskTitle}" for ${projectName} is due on ${dueDate}. Please ensure this is completed on time.`,

  taskOverdue: (projectName, taskTitle, dueDate) =>
    `[Thrive 365 Labs] Action Required: "${taskTitle}" for ${projectName} was due on ${dueDate} and is now overdue. Please update or complete this task.`,

  // Action items for client
  clientActionRequired: (practiceName, taskTitle, description) =>
    `[Thrive 365 Labs] Hi ${practiceName}, action needed: "${taskTitle}". ${description || 'Please check your client portal for details.'}`,

  // Welcome call
  welcomeCallScheduled: (practiceName, dateTime, calendarLink) =>
    `[Thrive 365 Labs] Hi ${practiceName}! Your welcome call has been scheduled for ${dateTime}. ${calendarLink ? 'Join here: ' + calendarLink : 'Details are in your portal.'}`,

  welcomeCallReminder: (practiceName, dateTime) =>
    `[Thrive 365 Labs] Reminder: Your welcome call with Thrive 365 Labs is coming up on ${dateTime}. We look forward to speaking with you!`,

  // Phase milestones
  phaseCompleted: (practiceName, phaseName) =>
    `[Thrive 365 Labs] Great news, ${practiceName}! ${phaseName} is now complete. Check your portal for next steps.`,

  goLiveReminder: (practiceName, goLiveDate) =>
    `[Thrive 365 Labs] ${practiceName}, your go-live date is approaching: ${goLiveDate}. Please review all pending items in your portal.`,

  // Voice call scripts
  voiceTaskReminder: (projectName, taskTitle, dueDate) =>
    `Hello, this is an automated reminder from Thrive 365 Labs. The task "${taskTitle}" for project ${projectName} is due on ${dueDate}. Please log into the portal to review and update. Thank you.`,

  voiceWelcomeCallReminder: (practiceName, dateTime) =>
    `Hello ${practiceName}, this is a friendly reminder from Thrive 365 Labs about your upcoming welcome call scheduled for ${dateTime}. We look forward to connecting with you. Thank you.`
};

// ---- Reminder Engine ----

// Generate reminders for overdue and upcoming-due tasks
async function generateTaskReminders(db, getProjects, getTasks, getUsers) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const reminders = [];

  const projects = await getProjects();
  const users = await getUsers();
  const activeProjects = projects.filter(p => p.status === 'active');

  // Load notification settings
  const settings = (await db.get('notification_settings')) || {};
  const reminderDaysBefore = settings.reminderDaysBefore || 3;
  const includeOverdue = settings.includeOverdue !== false;
  const includeUpcoming = settings.includeUpcoming !== false;

  // Calculate the "upcoming" threshold date
  const upcomingThreshold = new Date(now);
  upcomingThreshold.setDate(upcomingThreshold.getDate() + reminderDaysBefore);
  const upcomingDate = upcomingThreshold.toISOString().split('T')[0];

  for (const project of activeProjects) {
    const tasks = await getTasks(project.id);
    const incompleteTasks = tasks.filter(t => !t.completed && t.dueDate);

    for (const task of incompleteTasks) {
      const taskDue = task.dueDate; // YYYY-MM-DD

      // Overdue tasks
      if (includeOverdue && taskDue < today) {
        reminders.push({
          type: 'overdue',
          projectId: project.id,
          projectName: project.name,
          clientName: project.clientName,
          taskId: String(task.id),
          taskTitle: task.taskTitle,
          dueDate: task.dueDate,
          owner: task.owner,
          showToClient: task.showToClient || false
        });
      }

      // Upcoming due tasks (within reminderDaysBefore)
      if (includeUpcoming && taskDue >= today && taskDue <= upcomingDate) {
        reminders.push({
          type: 'upcoming',
          projectId: project.id,
          projectName: project.name,
          clientName: project.clientName,
          taskId: String(task.id),
          taskTitle: task.taskTitle,
          dueDate: task.dueDate,
          owner: task.owner,
          showToClient: task.showToClient || false
        });
      }
    }
  }

  return reminders;
}

// Resolve reminder recipients (map task owners to users with phone numbers)
function resolveRecipients(reminders, users) {
  return reminders.map(reminder => {
    const ownerUser = users.find(u =>
      u.email === reminder.owner || u.name === reminder.owner
    );
    return {
      ...reminder,
      recipientName: ownerUser?.name || reminder.owner,
      recipientPhone: ownerUser?.phone || null,
      recipientEmail: ownerUser?.email || reminder.owner,
      recipientId: ownerUser?.id || null,
      notificationPrefs: ownerUser?.notificationPreferences || {}
    };
  });
}

// Send batch reminders based on user preferences
async function sendBatchReminders(remindersWithRecipients, db) {
  const results = [];
  const sentLog = (await db.get('notification_log')) || [];

  for (const reminder of remindersWithRecipients) {
    const prefs = reminder.notificationPrefs;
    const phone = reminder.recipientPhone;

    // Skip if user has opted out
    if (prefs.optOut) continue;

    // Check deduplication - don't send same reminder twice in 24h
    const dedupeKey = `${reminder.type}:${reminder.taskId}:${reminder.recipientEmail}`;
    const recentDupe = sentLog.find(log =>
      log.dedupeKey === dedupeKey &&
      new Date(log.sentAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (recentDupe) continue;

    // Determine message
    const template = reminder.type === 'overdue' ? TEMPLATES.taskOverdue : TEMPLATES.taskDueSoon;
    const message = template(reminder.projectName, reminder.taskTitle, formatDate(reminder.dueDate));

    let result = { reminder, channel: 'none', sent: false };

    // Send SMS if phone available and preferred
    if (phone && prefs.sms !== false) {
      const smsResult = await sendSMS(phone, message);
      result = { reminder, channel: 'sms', sent: smsResult.success, details: smsResult };
    }

    // Log the send attempt
    sentLog.unshift({
      id: generateId(),
      dedupeKey,
      type: reminder.type,
      channel: result.channel,
      taskId: reminder.taskId,
      taskTitle: reminder.taskTitle,
      projectName: reminder.projectName,
      recipientEmail: reminder.recipientEmail,
      recipientPhone: phone,
      sent: result.sent,
      sentAt: new Date().toISOString()
    });

    results.push(result);
  }

  // Trim log to 1000 entries max
  if (sentLog.length > 1000) sentLog.length = 1000;
  await db.set('notification_log', sentLog);

  return results;
}

// ---- Welcome Call Scheduling ----

async function scheduleWelcomeCall(db, projectId, clientSlug, scheduledDateTime, calendarLink, notes) {
  const calls = (await db.get('welcome_calls')) || [];

  const call = {
    id: generateId(),
    projectId,
    clientSlug,
    scheduledDateTime,
    calendarLink: calendarLink || null,
    notes: notes || '',
    status: 'scheduled', // scheduled, completed, cancelled, rescheduled, no_show
    remindersSent: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  calls.push(call);
  await db.set('welcome_calls', calls);
  return call;
}

async function getWelcomeCalls(db, filters = {}) {
  const calls = (await db.get('welcome_calls')) || [];
  let filtered = calls;

  if (filters.projectId) {
    filtered = filtered.filter(c => c.projectId === filters.projectId);
  }
  if (filters.clientSlug) {
    filtered = filtered.filter(c => c.clientSlug === filters.clientSlug);
  }
  if (filters.status) {
    filtered = filtered.filter(c => c.status === filters.status);
  }

  return filtered.sort((a, b) => new Date(b.scheduledDateTime) - new Date(a.scheduledDateTime));
}

async function updateWelcomeCall(db, callId, updates) {
  const calls = (await db.get('welcome_calls')) || [];
  const idx = calls.findIndex(c => c.id === callId);
  if (idx === -1) return null;

  const allowed = ['scheduledDateTime', 'calendarLink', 'notes', 'status', 'hubspotMeetingId', 'outcome'];
  for (const key of allowed) {
    if (updates[key] !== undefined) calls[idx][key] = updates[key];
  }
  calls[idx].updatedAt = new Date().toISOString();

  await db.set('welcome_calls', calls);
  return calls[idx];
}

// Generate welcome call reminders for upcoming calls
async function generateWelcomeCallReminders(db, getUsers) {
  const calls = (await db.get('welcome_calls')) || [];
  const users = await getUsers();
  const now = new Date();
  const reminders = [];

  const scheduledCalls = calls.filter(c => c.status === 'scheduled');

  for (const call of scheduledCalls) {
    const callTime = new Date(call.scheduledDateTime);
    const hoursUntil = (callTime - now) / (1000 * 60 * 60);

    // Send reminder 24h before and 1h before
    const reminderWindows = [
      { window: '24h', minHours: 23, maxHours: 25 },
      { window: '1h', minHours: 0.5, maxHours: 1.5 }
    ];

    for (const rw of reminderWindows) {
      if (hoursUntil >= rw.minHours && hoursUntil <= rw.maxHours) {
        // Check if this reminder window already sent
        if (call.remindersSent && call.remindersSent.includes(rw.window)) continue;

        const clientUser = users.find(u =>
          u.role === 'client' && u.slug === call.clientSlug
        );

        if (clientUser) {
          reminders.push({
            callId: call.id,
            window: rw.window,
            clientSlug: call.clientSlug,
            practiceName: clientUser.practiceName || clientUser.name,
            phone: clientUser.phone,
            scheduledDateTime: call.scheduledDateTime,
            calendarLink: call.calendarLink
          });
        }
      }
    }
  }

  return reminders;
}

// ---- HubSpot Meeting Integration ----

async function createHubSpotMeeting(hubspotModule, contactId, meetingDetails) {
  if (!hubspotModule || !contactId) {
    return { success: false, error: 'HubSpot not configured or no contact ID' };
  }

  try {
    const token = await hubspotModule.getAccessToken();
    if (!token) return { success: false, error: 'No HubSpot access token' };

    const axios = require('axios');
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/meetings',
      {
        properties: {
          hs_meeting_title: meetingDetails.title || 'Welcome Call - Thrive 365 Labs',
          hs_meeting_body: meetingDetails.description || 'Welcome call to discuss implementation timeline and next steps.',
          hs_meeting_start_time: meetingDetails.startTime,
          hs_meeting_end_time: meetingDetails.endTime,
          hs_meeting_outcome: 'SCHEDULED'
        }
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    // Associate meeting with contact
    if (response.data?.id) {
      await axios.put(
        `https://api.hubapi.com/crm/v3/objects/meetings/${response.data.id}/associations/contacts/${contactId}/meeting_event_to_contact`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    return { success: true, meetingId: response.data?.id };
  } catch (err) {
    console.error('HubSpot meeting creation failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ---- Utility Functions ----

function generateId() {
  // Use uuid if available, otherwise timestamp-based
  try {
    const { v4 } = require('uuid');
    return v4();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---- Exports ----

module.exports = {
  initTwilio,
  isConfigured,
  sendSMS,
  makeReminderCall,
  TEMPLATES,
  generateTaskReminders,
  resolveRecipients,
  sendBatchReminders,
  scheduleWelcomeCall,
  getWelcomeCalls,
  updateWelcomeCall,
  generateWelcomeCallReminders,
  createHubSpotMeeting,
  formatDate
};
