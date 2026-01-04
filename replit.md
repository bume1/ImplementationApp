# Thrive 365 Labs Web App

## Overview
A multi-project launch tracker designed for managing complex clinical laboratory equipment installations. The system provides a 102-task template for Biolis AU480 CLIA lab setups, featuring admin controls, team member accounts, and embeddable client portals for external stakeholders to view progress without authentication. Its primary purpose is to track multi-phase laboratory equipment launches from contract signature through go-live, including CLIA certification, equipment procurement, LIS/EMR integration, and staff training coordination.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Branding**: Thrive 365 Labs logo, primary color #045E9F (blue), accent color #00205A (dark navy), Open Sans font.
- **Client Portal**: Authenticated client portal with practice-specific logins at /portal/{slug}. Includes sidebar navigation: Home (announcements, activity feed), Launch Milestones (for new clients), Inventory Management, Customer Support, and Files.
- **Portal Settings**: Admin-configurable HubSpot embed codes for inventory forms and file uploads, plus customer support URL.
- **Announcements Manager**: Admin component to create/edit/delete announcements visible on client portal homepage.
- **Reporting**: Dedicated "Launch Reports" page with summary statistics and charts (Launches by Client, Go-Live Timelines).
- **Activity Log**: Admin-only view of system activities.

### Technical Implementations
- **Backend**: Express.js REST API with JWT-based authentication and `bcryptjs` for password hashing.
- **Frontend**: React 18 (CDN-loaded), Babel standalone for JSX, and Tailwind CSS (CDN). Single-page application structure.
- **Data Storage**: Replit Database (key-value store) for users, projects, tasks, password reset requests, HubSpot mappings, and activity logs.
- **Authentication**: JWT, role-based access (admin vs. regular user), and admin-managed password resets. Admin user is auto-created.
- **Project Access Control**: Admins manage all projects; regular users access only assigned projects.
- **Task Permissions**: Template tasks editable by all, deletable by admins. User-created tasks editable/deletable by creator or admins.
- **Data Model**: Includes Users (id, email, name, role, assignedProjects), Projects (id, name, clientName, status, clientLinkId, etc.), and Tasks (102-task template with detailed fields).
- **Project Management**: Status tags, editable project details, admin-only project deletion.
- **Template System**: Task templates loaded from JSON, applied to new projects. Support for cloning projects and templates.
- **CSV Import**: Bulk import of tasks for templates and projects with comprehensive parsing.
- **HubSpot Integration**: Configuration via Replit's OAuth, stage mapping, automated task completion and stage completion notes sync, and manual sync option.
- **Reporting**: Launch reports page with charts and launch duration calculation.
- **Task Management**: Per-stage task addition, email-based owner assignment with name display, subtasks with completion enforcement, and bulk task operations.
- **Admin Activity Logging**: Logs task completions, reopenings, and updates with user details and timestamps.
- **Custom Domain & URL**: Supports custom domains for the application path and client portals, with per-project domain configuration.
- **Soft-Pilot Checklist**: Dedicated checklist view for Sprint 3 tasks, generating HTML documents with task statuses and signature fields, uploaded to Google Drive and linked to HubSpot.

### System Design Choices
- **Modularity**: Separation of frontend and backend.
- **Scalability**: CDN-based frontend for faster loading, key-value store for flexible data handling.
- **Security**: JWT for authentication, bcrypt for password hashing.
- **User Experience**: Streamlined workflows for project and task management, intuitive reporting, and client-facing transparency.

## External Dependencies

### Third-Party Services
- **HubSpot**: CRM integration for deal pipeline and client profiles.
- **Google Drive**: Storage for soft-pilot checklist uploads.
- **Replit Database**: Primary data persistence.

### NPM Packages
- `express`
- `cors`
- `bcryptjs`
- `jsonwebtoken`
- `uuid`
- `@replit/database`
- `body-parser`
- `googleapis`

### CDN Dependencies (Frontend)
- React 18
- ReactDOM 18
- Babel standalone
- Tailwind CSS

### Environment Variables
- `PORT`
- `JWT_SECRET`
- `HUBSPOT_WEBHOOK_SECRET` (optional) - Shared secret for validating HubSpot webhook calls

## Recent Changes (January 2026)

### Inventory Management System
- **Quick Update Table**: Full inventory form with 95+ items across 5 categories (Ancillary Supplies, Calibrators, Controls, Reagent, Validation)
- **Pre-populated Data**: Each client's inventory form pre-fills with their last submission
- **Weekly Submissions**: Clients submit inventory with lot numbers, expiry dates, open/closed quantities, and notes
- **Alerts**: Automatic detection of low stock (<=2 items) and expiring items (within 30 days)
- **History Tracking**: Up to 1000 submissions stored per client with timestamps

### HubSpot Webhook Integration
- **Endpoint**: POST /api/webhooks/hubspot receives form submission notifications
- **Security**: Optional shared secret validation via HUBSPOT_WEBHOOK_SECRET env var
- **Activity Logging**: Form submissions logged to activity feed (sanitized, no raw payloads)

### Activity Feed Enhancements
- Displays inventory submissions with package icon
- Shows HubSpot form submissions with document icon
- Phase completions highlighted with celebration icon