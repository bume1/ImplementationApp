# Thrive 365 Labs Web App

## Overview

Thrive 365 Labs Web App is a comprehensive multi-project launch tracker designed for managing complex clinical laboratory equipment installations. It automates and streamlines the entire process from contract signing to go-live, encompassing CLIA certification, equipment procurement, LIS/EMR integration, and staff training.

The application features:
- A **102-task template** for Biolis AU480 CLIA lab setups
- Robust **admin controls** and team member accounts
- **Embeddable, authenticated client portals** for external stakeholders to monitor progress
- **Service Portal** for field service engineers and clinical application specialists
- **HubSpot CRM integration** for seamless deal tracking and file management
- **Google Drive integration** for document storage

This project addresses a critical market need for specialized project management within the clinical laboratory sector, significantly enhancing efficiency, transparency, and communication in laboratory equipment launches.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Application Portals](#application-portals)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [External Dependencies](#external-dependencies)
7. [Environment Variables](#environment-variables)
8. [Deployment](#deployment)
9. [Version History](#version-history)

---

## Quick Start

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn
- Replit account (for database)

### Installation

1. Clone or upload the project to Replit as a Node.js project

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see [Environment Variables](#environment-variables))

4. Start the server:
```bash
npm start
```

5. Access the application at the provided URL

### Default Admin Login
- **URL**: `/login`
- **Email**: bianca@thrive365labs.com
- **Password**: Thrive2025!

---

## System Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Express.js REST API |
| **Frontend** | React 18 (CDN-loaded), Babel standalone for JSX |
| **Styling** | Tailwind CSS (CDN) |
| **Database** | Replit Database (key-value store) |
| **Authentication** | JWT tokens, bcryptjs password hashing |
| **PDF Generation** | PDFKit, PDFMake |

### System Design Principles

- **Modularity**: Clear separation of frontend and backend concerns
- **Scalability**: CDN-based frontend delivery and flexible key-value data storage
- **Security**: JWT-based authentication, bcrypt password hashing, role-based access control
- **User Experience**: Streamlined workflows, intuitive reporting, and client-facing transparency

### UI/UX Design System

- **Branding**: Thrive 365 Labs logo with primary color #045E9F (blue) and accent #00205A (dark navy)
- **Typography**: Inter font family for modern, clean appearance
- **Icons**: Heroicons v2 with consistent 1.75 stroke weight
- **Responsive Design**: Optimized for desktop and mobile with hamburger menu, collapsible sidebar, and responsive grids
- **Glass-card effects**: Modern design with subtle transparency and depth

---

## Application Portals

The application consists of multiple interconnected portals, each serving different user roles:

### 1. Unified Login Portal (`/login`)
Central authentication hub where users log in once and access all portals they have permissions for.

### 2. Admin Hub (`/admin`)
Administrative dashboard for system management:
- User management with granular permissions
- Dashboard statistics and quick actions
- Feedback/bug report inbox
- Bulk password reset functionality
- Activity logging
- System settings

### 3. Launch App (`/launch/home`)
Project implementation tracking for internal teams:
- Project boards with task management
- 102-task template system
- HubSpot synchronization
- Soft-pilot checklist generation
- Launch reports and analytics
- Implementations calendar

### 4. Client Portal (`/portal/{slug}`)
Authenticated client-facing portal:
- Home dashboard with announcements
- Launch milestones and progress tracking
- Inventory management with weekly updates
- Customer support with HubSpot ticket integration
- Files and documents section
- Reports and alerts

### 5. Service Portal (`/service-portal`)
Dedicated portal for field service engineers and clinical application specialists:
- Service report creation and management
- Validation reports (Phase 3)
- Digital signature capture
- PDF generation and export
- HubSpot ticket auto-creation
- Client assignment for vendors

### 6. Knowledge Hub (`/knowledge`)
Resource center with:
- How-to guides
- Documentation
- Link directory

### 7. Changelog (`/changelog`)
Version history and release notes for the application.

---

## Features

### User Management & Authentication

- **Role-based access control**: Admin, Team Member, Client, Vendor roles
- **Granular permission flags**:
  - `hasServicePortalAccess` - Service Portal access
  - `hasAdminHubAccess` - Admin Hub access
  - `hasImplementationsAccess` - Implementation App access
  - `hasClientPortalAdminAccess` - Client Portal admin features
  - `assignedClients` - Array for vendor client assignments
- **JWT-based authentication** with secure token management
- **Password reset system** with admin approval workflow
- **Bulk password reset** with first-login change prompt
- **Forgot password** request system

### Project & Task Management

- **102-task Biolis AU480 CLIA template** with industry-standard workflow
- **Task features**:
  - Per-stage task addition
  - Email-based owner assignment
  - Subtasks with completion enforcement
  - Task descriptions and notes
  - Due dates with timeline sorting
  - Task reordering within stages
  - File attachments (PDF, images, Word, Excel, text)
  - Tagging system with global tag library
  - Bulk operations (update, delete)
- **Project cloning** for rapid duplication
- **CSV import/export** for bulk task management
- **Template system** for reusable project structures
- **Project notes log** with aggregated view

### Client Portal Features

- **Authenticated access** via practice-specific slugs and logins
- **Navigation sections**: Home, Launch Milestones, Inventory, Customer Support, Files
- **Announcements system** for client-facing messages
- **Go-live date display** with countdown tracking
- **Progress visualization** with milestone tracking

### Inventory Management System

- **Quick Update Table** with 79 standard items
- **Batch tracking** for lot numbers and expiration
- **Custom item support** for non-standard supplies
- **Weekly submission history** with timestamps
- **Inventory reports** with analytics and trends
- **CSV export** for external analysis

### HubSpot Integration

- **OAuth-based configuration** for secure authentication
- **Deal pipeline sync** with stage mapping
- **Automated sync features**:
  - Task completion notes
  - Stage progression tracking
  - File uploads to Company, Deal, Contact records
- **HubSpot ticket integration** for customer support
- **Chatbot embed** for live chat support
- **Webhook endpoint** for form submissions
- **Idempotent sync** with stored HubSpot IDs to prevent duplicates

### Service Reports & Documentation

- **Service report forms** with comprehensive fields
- **Validation reports** (Phase 3) for technical verification
- **Digital signature capture** (technician and client)
- **PDF generation** with professional formatting
- **Auto-upload to HubSpot** with ticket creation
- **Draft support** for in-progress reports
- **File categorization** and attachment management

### Reporting & Analytics

- **Launch Reports** dashboard with:
  - Summary statistics
  - Launches by client charts
  - Go-live timeline visualization
- **Implementations Calendar** with month/year views
- **Activity logging** for admin audit trails
- **Inventory analytics** with trend reporting

### Document Management

- **Client file uploads** direct to HubSpot records
- **Admin document management** via cloud links or direct upload
- **Google Drive integration** for soft-pilot checklists
- **Task file attachments** with paperclip indicators

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/client-login` | Client portal login |
| POST | `/api/auth/service-login` | Service portal login |
| POST | `/api/auth/admin-login` | Admin hub login |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/change-password` | Change user password |

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/clone` | Clone project |
| GET | `/api/projects/:id/export` | Export project data |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List project tasks |
| POST | `/api/projects/:id/tasks` | Create task |
| PUT | `/api/projects/:projectId/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:projectId/tasks/:taskId` | Delete task |
| POST | `/api/projects/:projectId/tasks/:taskId/reorder` | Reorder task |
| PUT | `/api/projects/:projectId/tasks/bulk-update` | Bulk update tasks |
| POST | `/api/projects/:projectId/tasks/bulk-delete` | Bulk delete tasks |

### Subtask Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:projectId/tasks/:taskId/subtasks` | Create subtask |
| PUT | `/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId` | Update subtask |
| DELETE | `/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId` | Delete subtask |

### Notes & Files Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:projectId/tasks/:taskId/notes` | Add note |
| PUT | `/api/projects/:projectId/tasks/:taskId/notes/:noteId` | Update note |
| DELETE | `/api/projects/:projectId/tasks/:taskId/notes/:noteId` | Delete note |
| POST | `/api/projects/:projectId/tasks/:taskId/files` | Upload file |
| DELETE | `/api/projects/:projectId/tasks/:taskId/files/:fileId` | Delete file |

### User Management Endpoints (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:userId` | Update user |
| DELETE | `/api/users/:userId` | Delete user |
| GET | `/api/team-members` | List team members |
| POST | `/api/admin/bulk-password-reset` | Bulk password reset |

### Template Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/:id` | Get template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/clone` | Clone template |
| POST | `/api/templates/:id/import-csv` | Import CSV to template |
| PUT | `/api/templates/:id/set-default` | Set as default template |

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory/template` | Get inventory template |
| PUT | `/api/inventory/template` | Update inventory template |
| GET | `/api/inventory/submissions/:slug` | Get submissions history |
| GET | `/api/inventory/latest/:slug` | Get latest submission |
| POST | `/api/inventory/submit` | Submit inventory update |
| GET | `/api/inventory/report/:slug` | Get inventory report |
| GET | `/api/inventory/export/:slug` | Export inventory CSV |
| GET | `/api/inventory/custom-items/:slug` | Get custom items |
| POST | `/api/inventory/custom-items/:slug` | Add custom item |
| DELETE | `/api/inventory/custom-items/:slug/:itemId` | Delete custom item |

### Service Portal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/service-portal/data` | Get portal data |
| GET | `/api/service-portal/clients` | Get assigned clients |
| POST | `/api/service-reports` | Create service report |
| GET | `/api/service-reports` | List service reports |
| GET | `/api/service-reports/:id` | Get service report |
| PUT | `/api/service-reports/:id` | Update service report |
| DELETE | `/api/service-reports/:id` | Delete service report |
| POST | `/api/validation-reports` | Create validation report |
| GET | `/api/validation-reports` | List validation reports |
| GET | `/api/validation-reports/:id` | Get validation report |
| PUT | `/api/validation-reports/:id` | Update validation report |

### HubSpot Integration Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hubspot/test` | Test HubSpot connection |
| GET | `/api/hubspot/pipelines` | Get deal pipelines |
| GET | `/api/hubspot/deals` | Get deals |
| GET | `/api/hubspot/record/:recordId` | Get HubSpot record |
| GET | `/api/hubspot/stage-mapping` | Get stage mapping |
| PUT | `/api/hubspot/stage-mapping` | Update stage mapping |
| POST | `/api/hubspot/upload-to-deal` | Upload file to deal |
| POST | `/api/projects/:id/hubspot-sync` | Sync project to HubSpot |
| POST | `/api/projects/:id/soft-pilot-checklist` | Generate soft-pilot checklist |

### Announcements & Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/announcements` | List announcements |
| POST | `/api/announcements` | Create announcement |
| PUT | `/api/announcements/:id` | Update announcement |
| DELETE | `/api/announcements/:id` | Delete announcement |
| GET | `/api/client-documents` | List client documents |
| POST | `/api/client-documents` | Add document |
| PUT | `/api/client-documents/:id` | Update document |
| DELETE | `/api/client-documents/:id` | Delete document |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/activity-log` | Get activity log |
| GET | `/api/admin/password-reset-requests` | List password resets |
| PUT | `/api/admin/password-reset-requests/:id` | Process reset request |
| DELETE | `/api/admin/password-reset-requests/:id` | Delete reset request |
| GET | `/api/admin/feedback` | List feedback/bugs |
| PUT | `/api/admin/feedback/:id` | Update feedback |
| POST | `/api/admin/normalize-all-data` | Normalize data |
| GET | `/api/admin-hub/dashboard` | Get dashboard stats |

---

## External Dependencies

### Third-Party Services

| Service | Purpose |
|---------|---------|
| **HubSpot** | CRM integration for deal pipeline, client profiles, ticket management, and file storage |
| **Google Drive** | Storage for soft-pilot checklist uploads and document management |
| **Replit Database** | Primary data persistence (key-value store) |

### NPM Packages

```json
{
  "@hubspot/api-client": "^13.4.0",
  "@replit/database": "^2.0.5",
  "axios": "^1.13.2",
  "bcryptjs": "^2.4.3",
  "body-parser": "^1.20.2",
  "cors": "^2.8.5",
  "express": "^4.18.2",
  "form-data": "^4.0.5",
  "googleapis": "^169.0.0",
  "jsonwebtoken": "^9.0.2",
  "multer": "^2.0.2",
  "pdfkit": "^0.17.2",
  "pdfmake": "^0.3.3",
  "uuid": "^9.0.0"
}
```

### CDN Dependencies (Frontend)

- React 18
- ReactDOM 18
- Babel standalone (JSX transpilation)
- Tailwind CSS
- Heroicons v2

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `HUBSPOT_WEBHOOK_SECRET` | Secret for HubSpot webhook validation | No |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot private app token for API access | Yes |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account credentials (JSON) | No |

---

## Deployment

### Replit Deployment

1. Import the project to Replit
2. Configure environment secrets in Replit Secrets
3. Click "Run" to start the application
4. Configure custom domain if needed

### Custom Domain Setup

The application supports custom domains for:
- Main application access
- Client portal URLs (e.g., `launch.yourdomain.com/{slug}`)

Configure via Admin Hub > Settings > Client Portal Domain.

---

## Version History

### Current Version: 2.7.0 (January 2026)

#### Highlights
- Automated changelog generation from git commits
- Bulk password reset system with first-login change prompt
- PDF generation for service/validation reports
- Knowledge Hub module
- Enhanced HubSpot ticket integration with readable stage labels
- Modern UI with dynamic banner headers

See [CHANGELOG](/changelog) for complete version history.

### Previous Versions

- **2.5.0**: UI Modernization, Permission System Overhaul, Unified Login Portal
- **2.4.0**: Service Portal Updates, Validation Reports
- **2.3.0**: Central Admin Hub, Service Portal Launch
- **2.2.0**: User Management Improvements
- **2.1.0**: Client Portal Enhancements
- **2.0.0**: Initial Release with core features

---

## Project Structure

```
/
├── server.js              # Main Express server with API routes
├── hubspot.js             # HubSpot integration module
├── googledrive.js         # Google Drive integration module
├── pdf-generator.js       # PDF generation utilities
├── changelog-generator.js # Automated changelog generation
├── package.json           # Dependencies and scripts
├── template-biolis-au480-clia.json  # Default task template
├── public/
│   ├── index.html         # Root HTML
│   ├── login.html         # Unified login portal
│   ├── admin-hub.html     # Admin dashboard
│   ├── app.js             # Main React application
│   ├── portal.html        # Client portal
│   ├── service-portal.html # Service portal
│   ├── client.html        # Legacy client view
│   ├── knowledge.html     # Knowledge hub
│   ├── link-directory.html # Resource links
│   ├── changelog.html     # Version history viewer
│   └── changelog.md       # Markdown changelog
└── attached_assets/       # Static assets
```

---

## Support & Feedback

For issues, feature requests, or feedback:
- Use the in-app feedback form
- Contact system administrators
- Check the Knowledge Hub for documentation

---

## License

Proprietary - Thrive 365 Labs

---

*Last Updated: January 2026*
