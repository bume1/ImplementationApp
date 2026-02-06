# Thrive 365 Labs - App Changelog

## Release Notes & Update Log

---

### Version 2.9.1 - February 6, 2026

#### Bug Fixes
- Fix service report visibility, auto-update PDFs on sign, cascade name changes


### Version 2.9.0 - February 6, 2026

#### New Features
- Add client portal service report signing and 3-tier status system

#### Bug Fixes
- Fix service portal issues: technician uploads, signature validation, client visibility, sign-out

#### Changes
- Remove Pending Signatures tab, show pending status inline in Service Reports tab


### Version 2.8.0 - February 6, 2026

#### New Features
- Add admin/manager edit capability for submitted service reports
- Add admin/manager edit capability for submitted service reports
- Fix broken service report photos and add NANI report to client files
- Remove Billing & Fees service type, add signer name fields to signatures
- Add service report PDF download and Google Drive upload
- Hide New Service Report button from admins and managers in service portal
- Add support tickets pipeline, fix service report visibility, multi-user portals, fix broken photos
- Fix client portal redirect cycle: add missing auth tokens to client-documents API calls
- Add v2.7.1 changelog documenting all security, bug, and performance fixes
- Add HubSpot ticket polling as webhook workaround with selective filtering
- Add HubSpot ticket integration for Service Report auto-assignment
- Add comprehensive CLAUDE.md for AI assistant guidance
- Add comprehensive debugging tools and update changelog to v2.7.5

#### Bug Fixes
- Fix announcements Create/Edit/Delete for managers in Client Portal Admin
- Automate changelog updates, remove manual controls, fix version ordering
- Move photo/file storage to Google Drive, normalize task boards, fix NANI report
- Fix client completion percentage to use all tasks instead of only client-visible ones
- Fix ReferenceError: move /uploads middleware after authenticateToken definition
- Fix documented gotchas from Security & Risk Analysis (#3-#18)
- Fix P2 edge cases, validation gaps, and cross-portal consistency
- Fix P1 authorization holes, logic bugs, and frontend error handling
- Fix P0 security vulnerabilities and critical bugs
- Fix duplicate isManager variable declaration
- Fix service report photo and file storage path mismatch

#### Changes
- Move Assigned Reports access from sidebar to My Reports dashboard card
- Include attached photos in downloadable service report PDFs
- Remove phase numbers from client portal milestone headers
- Change default polling filter mode from keyword to property


### Version 2.7.5 - January 2026

#### New Features
- Allow managers to add client users from Client Portal admin view
- Add detailed frontend console logging for assigned reports debugging
- Add comprehensive logging and robust string-based ID comparison
- Add debug logging to Service Portal assigned reports endpoint
- Add 30-minute edit window for submitted service reports
- Remove Assigned Clients section from Add New Vendor modal
- Add collapsible phases and fix tag persistence in edit mode
- Add debug logging to Service Portal sidebar for role visibility issue
- Move Assign Report feature to Service Portal with Add Vendor popup
- Add Assign Report tab to Service Portal admin and fix validation form field order
- Add Knowledge Hub admin interface and dynamic content management
- Add Knowledge Hub API and update guide with service admin documentation
- Add Service Report Admin access permission for managers
- Add service report assignment feature for managers and technicians
- Add full phase titles to client portal and client view
- Update task template and project phases for new launch structure
- Update project tasks and UI to reflect new phase structure
- Add client-facing README for Thrive 365 Labs
- Force password change for new users created by super admin

#### Bug Fixes
- Fix service report photo and file storage path mismatch
- Fix priority and pinned announcement features
- Fix service report counter double-counting assigned reports
- CRITICAL FIX: Move /assigned route before /:id to fix 404 error
- Fix Knowledge Hub text formatting - properly render bold text and clean sections
- Vendor workflow - remove broken client filtering and fix ID comparisons
- Fix Service Portal assigned report workflow and display issues
- Fix vendor dropdown visibility on mobile devices
- Fix Service Portal assigned report workflow and display issues
- Fix browser back button auth bypass and enhance Knowledge Hub
- Fix blank Service Reports page caused by JavaScript errors

#### Improvements
- Update changelog for Version 2.7.4 [skip ci]
- Update changelog with v2.7.3 and improve automation
- Update Knowledge Hub Quick Tips for internal users
- Update Service Portal and Knowledge Hub with improvements
- Update all phase labels to accurately reflect the project's 10 phases
- Update README to v2.7.2 with security improvements

#### Changes
- Make analyzer serial number editable for technicians completing assigned reports
- Simplify service report admin access to use existing Service Portal checkbox
- Sync client views with internal project board phases
- Remove redundant Submission History section from Reports view
- Remove Replit references from README for white-labeling


### Version 2.7.4 - January 2026

#### New Features
- Allow managers to add client users from Client Portal admin view
- Add detailed frontend console logging for assigned reports debugging
- Add comprehensive logging and robust string-based ID comparison
- Add debug logging to Service Portal assigned reports endpoint
- Add 30-minute edit window for submitted service reports
- Remove Assigned Clients section from Add New Vendor modal
- Add collapsible phases and fix tag persistence in edit mode
- Add debug logging to Service Portal sidebar for role visibility issue
- Move Assign Report feature to Service Portal with Add Vendor popup
- Add Assign Report tab to Service Portal admin and fix validation form field order
- Add Knowledge Hub admin interface and dynamic content management
- Add Knowledge Hub API and update guide with service admin documentation
- Add Service Report Admin access permission for managers
- Add service report assignment feature for managers and technicians
- Add full phase titles to client portal and client view
- Update task template and project phases for new launch structure
- Update project tasks and UI to reflect new phase structure
- Add client-facing README for Thrive 365 Labs
- Force password change for new users created by super admin

#### Bug Fixes
- Fix priority and pinned announcement features
- Fix service report counter double-counting assigned reports
- CRITICAL FIX: Move /assigned route before /:id to fix 404 error
- Fix Knowledge Hub text formatting - properly render bold text and clean sections
- Vendor workflow - remove broken client filtering and fix ID comparisons
- Fix Service Portal assigned report workflow and display issues
- Fix vendor dropdown visibility on mobile devices
- Fix Service Portal assigned report workflow and display issues
- Fix browser back button auth bypass and enhance Knowledge Hub
- Fix blank Service Reports page caused by JavaScript errors

#### Improvements
- Update changelog with v2.7.3 and improve automation
- Update Knowledge Hub Quick Tips for internal users
- Update Service Portal and Knowledge Hub with improvements
- Update all phase labels to accurately reflect the project's 10 phases
- Update README to v2.7.2 with security improvements

#### Changes
- Make analyzer serial number editable for technicians completing assigned reports
- Simplify service report admin access to use existing Service Portal checkbox
- Sync client views with internal project board phases
- Remove redundant Submission History section from Reports view
- Remove Replit references from README for white-labeling


### Version 2.7.3 - January 26, 2026

#### New Features
- Allow managers to add client users from Client Portal admin view
- Add collapsible phases feature with improved tag persistence in edit mode
- Add 30-minute edit window for submitted service reports

#### Improvements
- Update Knowledge Hub Quick Tips for internal users
- Enhance Knowledge Hub text formatting with proper bold text rendering
- Add comprehensive logging for Service Portal assigned reports
- Improve vendor workflow with ID comparison fixes
- Remove Assigned Clients section from Add New Vendor modal for cleaner UX

#### Bug Fixes
- Fix priority and pinned announcement features
- Make analyzer serial number editable for technicians completing assigned reports
- Fix service report counter double-counting assigned reports
- CRITICAL FIX: Move /assigned route before /:id to fix 404 error
- Fix Service Portal assigned report workflow and display issues
- Fix vendor dropdown visibility on mobile devices
- Fix Knowledge Hub text formatting issues

---

### Version 2.7.2 - January 2026

#### Security Improvements
- New users created by Super Admin now require password change on first login
- Manual password resets by Super Admin now force users to create their own password
- Consistent password change enforcement across all user creation and reset flows

---

### Version 2.7.1 - January 2026

#### New Features
- Add Manager permissions to edit client details in Client Portal Admin
- New API endpoint `/api/client-portal/clients/:clientId` for manager-restricted client updates
- Client details edited by Managers sync with Admin Hub User Management

#### Improvements
- Enhanced Client Users page in Client Portal Admin with edit functionality
- Managers can now update: Practice Name, Logo, HubSpot Company/Deal/Contact IDs
- All client detail changes are logged in activity log

#### Planned Features (Future Rollout)
- **Customer Support Pipeline Enhancement**: Hide HubSpot pipeline view and show only portal-submitted tickets
  - See README.md "Future Features" section for implementation details
  - Benefits: Cleaner client experience, privacy, focused support view

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

---

### Version 2.6.1 - January 19, 2026

#### Navigation Improvements
- Added "Portal Hub" navigation button to Admin Hub sidebar for quick access to main portal
- Added "Portal Hub" navigation button to Service Portal sidebar
- Added "Portal Hub" navigation button to Client Portal Admin sidebar (admin users only)
- Added "Portal Hub" link to Launch Portal header

#### Bug Fixes
- Fixed sign-out button in Admin Hub not redirecting to universal login
- Fixed sign-out button in Service Portal not redirecting to universal login
- Fixed sign-out button in Client Portal not redirecting to universal login
- Fixed sign-out button in Launch Portal not redirecting to universal login
- Sign-out now properly clears all authentication tokens across portals
- Fixed Client Portal Admin access for users with hasClientPortalAdminAccess permission

---

### Version 2.6.0 - January 19, 2026

#### Customer Support Center
- HubSpot ticket history integration - clients can view their support tickets
- Three-tab interface: Ticket History, Submit Ticket, Live Chat
- Service reports now visible as tickets with file attachments
- Ticket status and pipeline stage tracking from HubSpot

#### Service Report HubSpot Integration
- All service reports auto-push to HubSpot Ticket, Company, and Deal records
- PDF attachments uploaded to HubSpot Files and linked to tickets
- Enhanced tracking across CRM with full audit trail

#### Admin Hub Improvements
- New "Inbox" page for bug reports, feature requests, and password resets
- Dashboard metrics updated: "New Launches" shows active projects, "Open Tickets" shows pending feedback
- Personalized welcome messages using practice name

#### Client Portal Updates
- Inventory view simplified to show current stock levels only
- Removed "Top Consumed Items" and "View History" from client view
- Weekly inventory submission tracking with flags for overdue submissions

#### Feedback System
- "Report Bug or Request Feature" link added to Portal Hub footer
- Bug report and feature request form with type selection
- Admin inbox for reviewing and resolving submitted feedback

#### Bug Fixes
- Fixed client portal crash caused by missing SVG icons
- Fixed changelog button link (route was not configured)
- Fixed main login footer branding text

---

### Version 2.5.0 - January 2026

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

*Last Updated: February 3, 2026*
