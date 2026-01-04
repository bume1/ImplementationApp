# Thrive 365 Labs Web App

## Overview
A multi-project launch tracker designed for managing complex clinical laboratory equipment installations. The system provides a 102-task template for Biolis AU480 CLIA lab setups, featuring admin controls, team member accounts, and embeddable client portals for external stakeholders to view progress without authentication. Its primary purpose is to track multi-phase laboratory equipment launches from contract signature through go-live, including CLIA certification, equipment procurement, LIS/EMR integration, and staff training coordination.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Branding**: Thrive 365 Labs logo, primary color #045E9F (blue), accent color #00205A (dark navy), Open Sans font.
- **Client Portal**: Authenticated client portal with practice-specific logins at /portal/{slug}. Includes sidebar navigation: Home (announcements, activity feed), Launch Milestones (for new clients), Inventory (collapsible with Weekly Update and Reports & Alerts subpages), Customer Support, and Files.
- **Practice Branding**: Admins can upload client logos when creating/editing client users. Logo displays in portal sidebar and homepage hero section.
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

### UI/UX Improvements (Jan 4)
- **Central Client Portal Login**: New /portal URL where clients can log in and be redirected to their practice-specific portal
- **Admin Portal Access**: Admins can log into /portal with admin credentials to access portal management features
- **Admin Portal Dashboard**: Dedicated admin view with Portal Settings, Announcements Manager, Client Documents, and Client Users pages
- **Implementation App Title**: Login page now titled "New Client Implementations" with "Thrive 365 Labs Launch Tracker" subtitle
- **Logo Consistency**: Fixed Thrive 365 Labs logo across all pages using official logo from thrive365labs.com
- **SVG Icon System**: Replaced emoji icons with branded SVG icons using Thrive primary color (#045E9F)
- **Responsive Design**: Optimized for both desktop web AND mobile with hamburger menu, collapsible sidebar, responsive grids (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3), and flexible layouts
- **Launch Milestones Access**: Now shown automatically when client has assigned projects (removed manual checkbox toggle)
- **Scrollable Announcements**: Announcements section on portal homepage now scrollable for long lists
- **Enlarged Charts**: Inventory report chart increased from h-48 to h-80 with improved axis labels and line visibility

## Application Link Tree

### Internal (Admin/Staff) Links
| URL | Description | Access |
|-----|-------------|--------|
| `/` | Implementation App Login | Admin, Users |
| `/` (after login) | Project Management Dashboard | Admin, Users |
| `/thrive365labsLAUNCH` | Alternative login path | Admin, Users |

### Client Portal Links
| URL | Description | Access |
|-----|-------------|--------|
| `/portal` | Central Client Portal Login | Clients, Admins |
| `/portal/{slug}` | Practice-specific client portal | Client (specific practice) |
| `/portal/admin` | Admin Portal Dashboard | Admins only |

### Admin Portal Features (via /portal/admin)
- **Admin Dashboard**: Overview stats, quick links to Implementation App
- **Portal Settings**: Configure HubSpot embed codes and support URL
- **Announcements**: Create/edit/delete portal-wide announcements
- **Client Documents**: Upload and manage documents per client
- **Client Users**: View client user list and portal URLs



### Inventory Management System
- **Quick Update Table**: Full inventory form with 79 items across 4 categories (Ancillary Supplies, Calibrators, Controls, Reagent)
- **Batch Tracking**: Each item supports multiple lots/expiry dates with data structure `{ batches: [{lotNumber, expiry, openQty, openDate, closedQty, notes}] }`
- **Custom Items**: Clients can add custom inventory items not in the predefined template
- **Pre-populated Data**: Each client's inventory form pre-fills with their last submission
- **Weekly Submissions**: Clients submit inventory with lot numbers, expiry dates, open/closed quantities, and notes
- **Backward Compatibility**: Server-side normalization converts legacy flat format to batch array structure
- **History Tracking**: Up to 1000 submissions stored per client with timestamps

### Inventory Reports (Client Portal)
- **Low Stock Alerts**: Items with total quantity <= 2 highlighted with warning
- **Expiring Items**: Items expiring within 30 days shown with alert
- **Usage Trends**: 
  - Top Consumed Items table with rolling average calculation across up to 12 submissions
  - Average weekly consumption rate using total consumed / total days formula
  - Estimated weeks remaining before depletion (color-coded: red ≤2wks, orange ≤4wks, green >4wks)
  - Data points indicator showing how many periods were used in the calculation
  - Item Quantities Over Time chart with searchable item selector, category filter chips, and line chart comparing up to 5 items
- **Submission History**: List of past submissions with item counts and timestamps
- **Portal Navigation**: Collapsible "Inventory" menu with "Weekly Update" and "Reports & Alerts" subpages
- **Reporting Guide**: Collapsible help section explaining all metrics, calculations, and color codes

### HubSpot Webhook Integration
- **Endpoint**: POST /api/webhooks/hubspot receives form submission notifications
- **Security**: Optional shared secret validation via HUBSPOT_WEBHOOK_SECRET env var
- **Activity Logging**: Form submissions logged to activity feed (sanitized, no raw payloads)

### Activity Feed Enhancements
- Displays inventory submissions with package icon
- Shows HubSpot form submissions with document icon
- Phase completions highlighted with celebration icon