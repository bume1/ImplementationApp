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
- **Training Week Start**: Calendar training entries now start from "Complete necessary analyzer reboot" task (Phase 3)