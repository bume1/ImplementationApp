# New Client Launch Implementation - Thrive 365 Labs Web App

## Overview

A multi-project launch tracker designed for managing clinical laboratory equipment installations. Designed by Bianca G. C. Ume, MD, MBA, MS. The system provides a 102-task template specifically for Biolis AU480 CLIA lab setups, with admin controls, team member accounts, and embeddable client portals for external stakeholders to view progress without authentication.

The primary use case is tracking complex, multi-phase laboratory equipment launches with tasks spanning contract signature through go-live, including CLIA certification, equipment procurement, LIS/EMR integration, and staff training coordination.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Framework**: Express.js REST API server
- **Authentication**: JWT-based auth with bcryptjs password hashing
- **Data Storage**: Replit Database (key-value store) - not a traditional SQL database
- **Data Structure**: 
  - Users stored under `users` key as array
  - Projects stored under `projects` key as array
  - Tasks stored per-project under `tasks_{projectId}` keys

### Frontend Architecture
- **Framework**: React 18 loaded via CDN (no build step)
- **Transpilation**: Babel standalone for JSX in browser
- **Styling**: Tailwind CSS via CDN
- **Structure**: Single-page application with components in `public/app.js`
- **Client Portal**: Separate `public/client.html` for unauthenticated embeddable views

### Authentication Model
- Admin user auto-created on server startup (bianca@thrive365labs.com)
- User signup available for team members
- Role-based access: admin vs regular user
- Client portal uses project-specific embed links (no login required)

### Task Permissions
- **Template tasks** (from original template): Can be edited by all users, deleted only by admins
- **User-created tasks**: Can be edited and deleted by the creator or admins
- Delete button only appears for tasks you created (or all tasks if admin)

### Data Model
- **Users**: id, email, name, password (hashed), role, createdAt
- **Projects**: id, name, clientName, projectManager, hubspotRecordId, status (active/paused/completed), template, clientLinkId, clientLinkSlug
- **Tasks**: 102-task template with fields including phase, stage, taskTitle, owner, startDate, dueDate, dateCompleted, duration, completed status

### Project Management Features
- **Status Tags**: Projects display status badges (In Progress, Paused, Completed)
- **Editable Details**: Project name, client name, On-Site Project Manager, HubSpot Record ID, and status can be edited via modal
- **Admin-Only Deletion**: Only admins can delete projects (removes project and all associated tasks)

### Template System
- Task templates loaded from JSON file (`template-biolis-au480-clia.json`)
- Templates organized by Phase (0-4) and Stage groupings
- Applied to new projects on creation

## External Dependencies

### Third-Party Services
- **HubSpot**: Integration fields for CRM sync (deal pipeline, client profiles)
- **Replit Database**: Primary data persistence via `@replit/database` package

### NPM Packages
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication tokens
- `uuid` - Unique ID generation
- `@replit/database` - Replit's key-value database client
- `body-parser` - Request body parsing

### CDN Dependencies (Frontend)
- React 18 (production build)
- ReactDOM 18
- Babel standalone (JSX transpilation)
- Tailwind CSS

### Environment Variables
- `PORT` - Server port (defaults to 5000)
- `JWT_SECRET` - Token signing secret (has default, should be changed in production)

## Branding
- **Logo**: Thrive 365 Labs logo from thrive365labs.com
- **Primary Color**: #045E9F (blue)
- **Accent Color**: #00205A (dark navy)
- **Font**: Open Sans (via Google Fonts)
- **Designer Credit**: "Developed by Bianca G. C. Ume, MD, MBA, MS"

## Clone/Duplicate Features
- **Clone Projects**: Any user can clone a project via "Clone Project" button on project cards. Creates new project with all tasks reset to incomplete status.
- **Clone Templates**: Admins can clone templates via "Clone" button in Template Management. Creates new template with all task definitions.

## HubSpot Integration

### Configuration
- HubSpot integration uses Replit's OAuth connector for secure credential management
- Access: Admin users can configure HubSpot settings via "HubSpot Settings" button on the dashboard
- Stage Mapping: Map project phases (0-4) to HubSpot deal pipeline stages

### Sync Behavior
- **Task Completion**: Creates a HubSpot task (marked complete) associated with the deal. Assigns owner by email match (preferred) or first/last name match. Task body includes phase, stage, completion details, and all task notes
- **Stage Completion Notes**: When all tasks in a stage are completed, a comprehensive note is logged to HubSpot including all task details, owners, completion dates/times, and notes
- **Phase Completion**: When all tasks in a phase are completed, a stage-by-stage summary is logged AND the deal moves to the mapped pipeline stage
- **Sync Indicator**: Projects with HubSpot Record IDs show last sync timestamp on the project dashboard

Note: Adding notes to tasks in the webapp does NOT trigger HubSpot sync (to avoid overloading). Notes are included in the task body when the task is completed and in stage completion summaries.

### Data Flow
- Projects store `hubspotRecordId` field to link to HubSpot records
- Stage mappings stored in database under `hubspot_stage_mapping` key
- `lastHubSpotSync` timestamp updated on projects when syncs occur

### API Endpoints
- `GET /api/hubspot/test` - Test HubSpot connection status
- `GET /api/hubspot/pipelines` - Fetch available deal pipelines and stages
- `GET /api/hubspot/stage-mapping` - Get current phase-to-stage mapping
- `PUT /api/hubspot/stage-mapping` - Save phase-to-stage mapping (admin only)

## Reporting

### Launch Reports Page
- Accessible via "Reports" button on dashboard (available to all users)
- Summary stats: Total projects, Completed, In Progress, Average weeks to launch

### Charts
1. **Launches by Client**: Stacked bar chart showing completed vs in-progress vs paused projects per client
2. **Go-Live Timelines**: Bar chart showing implementation duration (weeks) for completed projects

### Launch Duration Calculation
- Calculated as weeks between "Contract signed" task completion and "First Live Patient Samples Processed" task completion
- Displayed on completed project cards in the dashboard
- Used in reporting charts and tables

### Per-Stage Task Addition
- Each stage in the list view has an "+ Add Task" button
- Clicking pre-fills the phase and stage for the new task

### Owner Assignment
- **Email-Based Assignment**: Task owners are assigned by email address (stored internally as email)
- **Name Display**: Owner names are displayed in the UI by looking up the user's name from their email
- **Team Members Dropdown**: Owner selection uses a dropdown of registered team members (by email, showing name)
- **Client Portal**: Server resolves owner emails to names before sending to client portal (ownerDisplayName field)

### Subtasks
- Each task can have multiple subtasks with their own owners (any user in the system)
- Subtasks have title, owner (email with dropdown selection), and status (Pending, Complete, N/A)
- **Separate "Add Subtask" button** visible on each task (not buried in notes)
- **Subtask status dropdown**: Pending, Complete, or N/A (Not Applicable)
- **Completion enforcement**: Parent task cannot be marked complete until all subtasks are either Complete or N/A
- Subtasks are NOT synced to HubSpot (only parent tasks sync)
- "Subtasks incomplete" warning badge shown on tasks with pending subtasks

### Bulk Task Operations
- "Bulk Select" mode allows selecting multiple tasks via checkboxes
- "Select All" and "Deselect All" buttons for quick selection
- "Mark X Complete" and "Mark X Incomplete" bulk action buttons
- Bulk updates do NOT sync to HubSpot (to prevent overloading)