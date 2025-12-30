# Project Tracker - Thrive 365 Labs

## Overview

A multi-project launch tracker designed for managing clinical laboratory equipment installations. The system provides a 102-task template specifically for Biolis AU480 CLIA lab setups, with admin controls, team member accounts, and embeddable client portals for external stakeholders to view progress without authentication.

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

### Data Model
- **Users**: id, email, name, password (hashed), role, createdAt
- **Projects**: id, name, HubSpot integration fields, client info
- **Tasks**: 102-task template with fields including phase, stage, taskTitle, owner, startDate, dueDate, dateCompleted, duration, completed status

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
- `PORT` - Server port (defaults to 3000)
- `JWT_SECRET` - Token signing secret (has default, should be changed in production)