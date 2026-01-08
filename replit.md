# Thrive 365 Labs Web App

## Overview
Thrive 365 Labs Web App is a multi-project launch tracker designed to manage complex clinical laboratory equipment installations. It streamlines the process from contract signing to go-live, including CLIA certification, equipment procurement, LIS/EMR integration, and staff training. The system provides a 102-task template for Biolis AU480 CLIA lab setups, offers admin controls, team member accounts, and features embeddable, unauthenticated client portals for external stakeholders to monitor progress. The project aims to enhance efficiency, transparency, and communication in laboratory equipment launches, addressing a significant market need for specialized project management in the clinical laboratory sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Branding**: Thrive 365 Labs logo, primary color #045E9F (blue), accent color #00205A (dark navy), Open Sans font.
- **Client Portal**: Authenticated client portal at `/portal/{slug}` with practice-specific logins, including sidebar navigation for Home, Launch Milestones, Inventory (with Weekly Update and Reports & Alerts), Customer Support, and Files.
- **Practice Branding**: Admins can upload client logos for display in the portal.
- **Portal Settings**: Admin-configurable HubSpot embed codes for inventory forms and file uploads, and a customer support URL.
- **Announcements Manager**: Admin tool to create and manage client portal announcements.
- **Reporting**: "Launch Reports" page with summary statistics and charts (Launches by Client, Go-Live Timelines).
- **Activity Log**: Admin-only view of system activities.
- **Go-Live Date & Calendar**: New `goLiveDate` field for projects, displayed on project cards and client view. An "Implementations Calendar" shows all go-live dates with Month and Year views, including project entries and color-coded statuses.
- **Responsive Design**: Optimized for desktop and mobile with a hamburger menu, collapsible sidebar, and responsive grids.
- **SVG Icon System**: Branded SVG icons used throughout the application.

### Technical Implementations
- **Backend**: Express.js REST API with JWT authentication and `bcryptjs` for password hashing.
- **Frontend**: React 18 (CDN-loaded), Babel standalone for JSX, and Tailwind CSS (CDN) as a Single-Page Application.
- **Data Storage**: Replit Database (key-value store) for users, projects, tasks, password reset requests, HubSpot mappings, activity logs, client documents, and inventory submissions.
- **Authentication**: JWT-based, role-based access (admin vs. regular user), and admin-managed password resets.
- **Project Access Control**: Admins manage all projects; regular users access assigned projects only.
- **Task Management**: 102-task template system, per-stage task addition, email-based owner assignment, subtasks with completion enforcement, and bulk operations.
- **Template System**: Project cloning and task template application from JSON.
- **CSV Import**: Bulk task import for templates and projects.
- **HubSpot Integration**: OAuth-based configuration, stage mapping, automated task completion and stage completion notes sync, and manual sync options.
- **Reporting**: Launch reports and inventory reports with charts and analytics (e.g., usage trends, estimated weeks remaining).
- **Admin Activity Logging**: Logs task completions, reopenings, and updates.
- **Custom Domain & URL**: Support for custom domains for application and client portals.
- **Soft-Pilot Checklist**: Generates HTML documents with task statuses and signature fields, uploaded to Google Drive and linked to HubSpot.
- **Inventory Management System**: Quick Update Table with 79 items across 4 categories, batch tracking, custom items, weekly submissions with history tracking (up to 1000 submissions per client), and backward compatibility for data normalization.
- **Client File Uploads**: Clients can upload files directly to their project's HubSpot record via the portal. Supports various file types and categories.
- **Admin Document Management**: Admins can add documents via cloud link or direct file upload, stored in `/uploads/documents/`.
- **HubSpot Webhook Integration**: Endpoint for receiving HubSpot form submission notifications with optional security validation.

### System Design Choices
- **Modularity**: Clear separation of frontend and backend.
- **Scalability**: CDN-based frontend and key-value store for flexible data handling.
- **Security**: JWT for authentication, bcrypt for password hashing.
- **User Experience**: Streamlined workflows, intuitive reporting, and client-facing transparency.

## External Dependencies

### Third-Party Services
- **HubSpot**: CRM integration for deal pipeline, client profiles, and file uploads.
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
- `multer`

### CDN Dependencies (Frontend)
- React 18
- ReactDOM 18
- Babel standalone
- Tailwind CSS

### Environment Variables
- `PORT`
- `JWT_SECRET`
- `HUBSPOT_WEBHOOK_SECRET` (optional)
- `HUBSPOT_PRIVATE_APP_TOKEN` - Private app token for HubSpot file uploads

## Recent Changes (January 2026)

### Client Activity Feed (Jan 5)
- **Activity Types Tracked**: Inventory submissions, file uploads to HubSpot, support tickets, task/stage/phase completions
- **Activity Filtering**: Client sees only their own activities (by userId or slug) plus project-based activities
- **Activity Display**: Each activity type has distinct icon and color (blue=inventory, green=files, purple=support, orange=stages, yellow=phases)

### Client Upload Visibility (Jan 5)
- **Upload Records Saved**: When clients upload files to HubSpot, a record is saved in client_documents database
- **Client Portal View**: Files page shows "Documents From Thrive 365 Labs" and "Your Uploaded Files" sections
- **Admin Portal View**: Client Documents page shows client uploads with green highlight and "Client Upload" badge

### HubSpot File Upload (Jan 5)
- **Client-Level HubSpot IDs**: Clients now have hubspotCompanyId, hubspotDealId, and hubspotContactId fields stored at the user level (not project level)
- **Multi-Record Upload**: When clients upload files, they are automatically attached to all configured HubSpot records (Company, Deal, and/or Contact)
- **No Project Required**: File uploads work for clients even without assigned projects, using client-level HubSpot IDs
- **Admin Management**: Admins can configure HubSpot IDs for each client in the User Management section
- **Private App Token**: Uses HUBSPOT_PRIVATE_APP_TOKEN for file uploads (supports files scope)
- **Updated Language**: Portal now says "upload documents directly to your account record" instead of project record

### Subtask Due Dates & Client Visibility (Jan 5)
- **Subtask Due Dates**: Subtasks now support optional due dates with date picker in admin interface
- **Overdue Styling**: Pending subtasks past their due date display with red highlighting
- **Client-Visible Subtasks**: When parent task has showToClient=true, subtasks are now visible to clients in all portal views
- **Portal Integration**: Both public client view (client.html) and authenticated portal (portal.html) display subtasks with status badges and due dates
- **Training/Validation Week**: Implementations calendar now shows purple training entries based on Phase 3 Training/Validation task due dates

### Task Board Improvements (Jan 5)
- **Auto-Expanded Subtasks**: Subtasks are now always visible in the task board (no toggle required)
- **Create Template Button**: Admin users can create reusable templates from any launch board in list view, preserving task structure without runtime data (owners, due dates)
- **Calendar Task Navigation**: Clicking tasks in the implementations calendar navigates directly to that specific task on the launch board with visual highlighting
- **Task Reordering**: Admins can reorder tasks within stages using up/down arrow buttons in edit mode
  - Uses `stageOrder` property to track per-stage ordering
  - Preserves user-defined ordering across reloads
  - Sorts by existing stageOrder before normalization to maintain prior moves
  - Sequential normalization ensures clean 1, 2, 3... values after each operation
- **Training Week Display**: Calendar now shows Training/Validation period based on the earliest and latest due dates of all tasks in the Training/Validation stage (works across all boards regardless of task naming)

### Project Notes Log Panel (Jan 6)
- **Aggregate Notes View**: New collapsible side panel showing all notes from all tasks in a project
- **Chronological Order**: Notes displayed with newest first, showing full context (phase, stage, task, author, timestamp)
- **Toggle Button**: "Notes Log" button in the task board header shows count of total notes (accessible to all users)
- **Slide-Out Panel**: Fixed-position panel slides in from the right when opened, can be closed with X button or by clicking backdrop
- **Note Details**: Each note shows phase, stage, task title, content, author, creation date, and edit history
- **Empty State**: Friendly message when no notes exist yet
- **Performance**: Memoized notes aggregation and scroll locking for smooth UX

### Template & Clone Bug Fixes (Jan 6)
- **Subtask Completion Fix**: Templates and cloned projects now properly initialize subtask completion status
  - Subtasks explicitly set `completed: false`, `notApplicable: false`, `status: 'Pending'`
  - Prevents "Cannot complete task with pending subtasks" errors on boards created from templates
- **Improved Completion Detection**: `hasIncompleteSubtasks` function now accepts multiple completion indicators (boolean, status string, completedAt timestamp)
- **Template Data Normalization**: Server-side template application normalizes all subtask fields on creation
- **Client Link Slug Auto-Update**: When a project's client name is changed, the client portal link slug is automatically regenerated to match
- **Clone Slug Fix**: Cloned projects now generate their slug from the new project/client name instead of just appending "-copy" to the original

### Subtask & Data Consistency Fixes (Jan 8)
- **Subtask ID Type Compatibility**: Server now uses string comparison for subtask IDs to handle both numeric (from templates) and UUID (from new subtasks) formats
- **Subtask Status Sync**: When updating subtask completion status, server now also updates `status` and `completedAt` fields for consistency
- **Data Normalization Endpoint**: New admin endpoint `/api/admin/normalize-all-data` fixes subtask data inconsistencies across all projects
- **Regenerate Slug Endpoint**: New admin endpoint `/api/projects/:id/regenerate-slug` allows regenerating client portal slugs for individual projects
- **Admin UI for Data Fix**: Portal Settings page now includes "Database Utilities" section with "Normalize All Project Data" button
- **Project Edit Slug Display**: Edit Project modal now shows current client link slug with a "Regenerate" button to update based on client name
- **Completion Date Formatting**: Client and portal views now display task completion dates in friendly format (e.g., "Jan 8, 2026")
- **Task Descriptions**: Added description field to tasks - admins can add descriptions visible to both internal users and clients in all views
- **Task Tagging System**: Added tags field for grouping and filtering tasks
  - Admins and team members can add comma-separated tags when editing tasks
  - Tags display as clickable blue badges on tasks (clicking filters by that tag)
  - Tags dropdown filter in task board header (appears when tags exist)
  - Tags searchable via main search bar
  - Tags included in CSV export (semicolon-separated)

### System Improvements (Jan 8)
- **Global Tag Library**: 11 predefined tags available as clickable buttons when editing tasks (Analyzer, Billing, CLIA, Documentation, EHR-LIS-Instrument Integration, ImplementationCalls, SoftPilot, InstallationValidation&Training, Inventory, KPIs, Live)
- **Improved Caching**: Static files now served with no-cache headers to prevent stale content issues
- **Auto-Sort by Due Date**: Tasks within each stage are now automatically sorted by due date first, then by manual order
- **Task Reordering UX**: Reorder buttons no longer close the edit panel, allowing multiple moves before saving
- **HubSpot Sync Visibility**: Sync button and status now always visible on boards (with message when no ID is configured), plus "Edit Project Settings" button for admins to add HubSpot ID directly from the board
- **Automatic Data Normalization**: Task data is normalized on read for display (without modifying stored data) to ensure retroactive compatibility with new features (tags, descriptions, subtask fields)
- **Removed Client Portal Domain Field**: Simplified project settings by removing the optional domain field (slug generator handles client links)