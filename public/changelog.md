# Thrive 365 Labs - Implementation App Changelog

## Release Notes & Update Log

---

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
