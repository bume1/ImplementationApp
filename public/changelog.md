# Thrive 365 Labs - Implementation App Changelog

## Release Notes & Update Log

---

### Version 2.7.0 - January 2026

#### New Features
- Add automated changelog generation from git commits
- Add bulk password reset system with first-login change prompt
- Add PDF generation for service/validation reports and enhance service portal
- Add URL routing for portal deep linking
- Add HubSpot chatbot to Live Chat tab in Customer Support
- Add readable stage labels for HubSpot tickets (map stage IDs to names)
- Simplify admin dashboard: rename to Quick Stats, keep only New Launches and Open Tickets
- Add debug logging for HubSpot ticket fetch and deal ID support
- Add automatic changelog management system
- Add Knowledge Hub module to Portal Hub
- Add token fallback to Client Portal Admin for seamless Portal Hub navigation
- Add token fallback to Launch app for seamless Portal Hub navigation
- Remove unused New Client checkbox from user management
- Fix Add User button visibility with inline styles
- Add detailed debug endpoint for testing login
- Add debug logging and client debug endpoint
- Add comprehensive changelog with HTML viewer and downloadable MD file
- Remove blue icon boxes from login pages and add banners directory
- Add .gitignore to exclude node_modules and common files
- Add /login route for unified login portal
- Add granular permissions, unified login, and validation reports

#### Bug Fixes
- Make ticket pipeline fetch optional to handle missing HubSpot scope
- Fix portal crash: remove script tag from JSX in SupportPage
- Fix root route to serve unified login instead of index.html
- Fix submit button visibility in user form modal
- Fix client login via unified login portal

#### Improvements
- Multiple portal improvements:
- Update Submit Ticket tab with HubSpot embed and two-column layout
- Update HubSpot ticket stage mapping with custom pipeline stages
- Redesign Customer Support Center with hero banner and improved tab buttons
- Improve project board view with better UI/UX
- Update changelog with v2.6.0 release notes
- Enhanced service report HubSpot integration with attachments
- Enhanced validation service reports with custom form fields and reporting
- Service portal enhancements: validations, drafts, file categories, and auto-upload
- Client portal improvements: milestones, inventory reports, submission history
- Improve client portal banner with fallback color and better styling
- Improve Admin Hub user management UI and error handling

#### Changes
- Remove updated timestamp from client ticket display
- Bug fixes and admin inbox for feedback/bug reports
- Auto-create HubSpot tickets for service reports with file attachment
- Customer Support Center with HubSpot ticket integration
- Client portal inventory: simplify view with current stock levels
- Major portal updates: announcements, footers, access controls, and fixes
- Eliminate double authentication when navigating from Portal Hub
- Hide Launch app from clients in Portal Hub - internal team only
- Restructure link system with /launch routes and unified login
- Auto-generate slug for client users missing one during login
- Modernize UI across all portals with dynamic banner headers
- Modernize Admin Hub UI with refined design system


### Version 2.5.0 - January 2026 (Current Release)

#### UI Modernization & Branding Update
- **Modern Design System**: Updated all portals with Inter font, refined color palette, and glass-card effects
- **Dynamic Banner Headers**: Added professional banner headers to Admin Hub, Service Portal, and Client Portal dashboards
- **Login Page Refresh**: Streamlined login pages to feature only the Thrive 365 Labs logo (removed blue icon boxes)
- **Consistent Heroicons v2**: Updated all icons to Heroicons v2 with consistent 1.75 stroke weight
- **CSS Utilities**: Added modern card styles, gradient buttons, and input styling across all portals

#### Permission System Overhaul
- **Granular Access Flags**: New permission flags for fine-grained access control
  - `hasServicePortalAccess` - Service Portal access
  - `hasAdminHubAccess` - Admin Hub access
  - `hasImplementationsAccess` - Implementation App access
  - `hasClientPortalAdminAccess` - Client Portal admin features
  - `assignedClients` - Array for vendor client assignments
- **Vendor Role**: New role for external service providers with client-specific access

#### Unified Login Portal
- **Central Authentication**: New `/login` route for unified login experience
- **Portal Hub**: After login, users see all portals they have access to
- **Role-Based Access**: Automatically shows available portals based on user permissions

#### Admin Hub Enhancements
- **Centralized User Management**: All user management moved to Admin Hub
- **Permission Editor**: Visual toggles for all permission flags
- **Client Assignment**: UI for assigning clients to vendor users

---

### Version 2.4.0 - January 2026

#### Service Portal Updates
- **Support Categories**: Added categorization for service types
- **HubSpot Integration**: Service reports sync with HubSpot CRM
- **Improved Search**: Enhanced report filtering and search

#### Validation Reports
- **Phase 3 Validation**: Added validation service report functionality
- **Training Reports**: Technical users can submit training documentation
- **Signature Validation**: Improved server-side signature verification

---

### Version 2.3.0 - December 2025

#### Central Admin Hub
- **New Admin Interface**: Dedicated admin hub at `/admin-hub`
- **Dashboard Statistics**: User counts, project stats, service reports overview
- **Quick Actions**: Streamlined admin workflows

#### Service Portal Launch
- **Field Service Engineers**: Dedicated portal for service technicians
- **Clinical Application Specialists**: Support for CAS workflows
- **Service Report Forms**: Comprehensive service documentation
- **Digital Signatures**: Capture technician and client signatures

#### Access Control Improvements
- **Toggle-Based Access**: `hasServicePortalAccess` flag for service portal
- **Role Restrictions**: Admins can manage portal access per user

---

### Version 2.2.0 - December 2025

#### User Management Improvements
- **Floating Modal Form**: User creation/edit in modal overlay
- **Client Selection**: Restrict to system clients only
- **Badge Updates**: Implementation badge shows active for assigned users

---

### Version 2.1.0 - November 2025

#### Client Portal Enhancements
- **Portal Navigation**: Improved routing and navigation
- **Admin Features**: Client portal admin capabilities
- **Announcements**: System-wide announcement management

---

### Version 2.0.0 - Initial Release

#### Core Features
- **Project Tracking**: Multi-project launch tracker
- **Template System**: Biolis AU480 CLIA templates
- **HubSpot Integration**: CRM sync for projects and clients
- **Google Drive Integration**: Document management
- **Client Portals**: Individual client portal access via slugs
- **Task Management**: Project tasks with status tracking
- **Inventory Reports**: Client inventory submission system

---

## Access This Log

**Direct URL**: `/changelog.md`

**Download**: Right-click and "Save As" or use browser download

---

## Technical Stack

- **Frontend**: React 18 (UMD), Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: Replit Database (key-value store)
- **Authentication**: JWT tokens
- **Integrations**: HubSpot API, Google Drive API

---

*Last Updated: January 19, 2026*
