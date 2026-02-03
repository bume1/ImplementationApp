# Thrive 365 Labs Web App

A comprehensive multi-project launch tracker for managing clinical laboratory equipment installations.

---

## Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Technical Stack](#technical-stack)
3. [Usage Guidelines](#usage-guidelines)
4. [Administrator Reference](#administrator-reference)
5. [Open Source Licenses](#open-source-licenses)

---

## Setup Instructions

### Prerequisites

- Node.js >= 14.0.0
- npm or yarn
- Database server (key-value store)

### Installation

1. Clone the repository to your server

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see below)

4. Start the server:
```bash
npm start
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot private app token for API access | Yes |
| `HUBSPOT_WEBHOOK_SECRET` | Secret for HubSpot webhook validation | No |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account credentials (JSON) | No |

### Custom Domain Setup

The application supports custom domains for:
- Main application access
- Client portal URLs (e.g., `launch.yourdomain.com/{slug}`)

Configure via **Admin Hub > Settings > Client Portal Domain**.

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Express.js REST API |
| **Frontend** | React 18, Babel (JSX transpilation) |
| **Styling** | Tailwind CSS |
| **Database** | Key-Value Database Store |
| **Authentication** | JWT tokens, bcryptjs password hashing |
| **PDF Generation** | PDFKit, PDFMake |

### External Integrations

| Service | Purpose |
|---------|---------|
| **HubSpot** | CRM integration for deal pipeline, client profiles, ticket management, and file storage |
| **Google Drive** | Document storage for soft-pilot checklists and file management |

---

## Usage Guidelines

### User Roles

| Role | Access Level |
|------|--------------|
| **Super Admin** | Full system access, user management, all portals |
| **Admin** | Project management, client portal admin, reporting |
| **Team Member** | Assigned projects, task management |
| **Client** | Client portal access only |
| **Vendor** | Service portal access for assigned clients |

### Best Practices

**Security**
- Change default admin password immediately after installation
- Use strong, unique passwords for all accounts
- Regularly review user access permissions
- New users must change their password on first login

**Project Management**
- Use the 102-task template as a starting point for new implementations
- Assign task owners by email for accountability
- Keep task notes updated for HubSpot sync accuracy
- Use tags to categorize and filter tasks

**Client Portals**
- Configure client-specific slugs for easy portal access
- Upload client logos for branded portal experience
- Use announcements to communicate important updates
- Review inventory submissions weekly

**Data Management**
- Regularly sync projects to HubSpot to maintain CRM accuracy
- Use CSV export for backup and external reporting
- Archive completed projects to maintain performance

### Application Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| Unified Login | `/login` | Central authentication hub |
| Admin Hub | `/admin` | System administration |
| Launch App | `/launch/home` | Project implementation tracking |
| Client Portal | `/portal/{slug}` | Client-facing progress view |
| Service Portal | `/service-portal` | Field service management |
| Knowledge Hub | `/knowledge` | Documentation and resources |
| Changelog | `/changelog` | Version history |

---

## Administrator Reference

### Default Admin Login

- **URL**: `/login`
- **Email**: bianca@thrive365labs.com
- **Password**: Thrive2025!

> **Important**: Change this password immediately after first login.

### Key Admin Functions

**User Management**
- Create and manage user accounts
- Assign role-based permissions
- Process password reset requests
- Bulk password reset capability

**Project Management**
- Create projects from templates
- Clone existing projects
- Manage task templates
- Configure HubSpot stage mapping

**Client Portal Administration**
- Configure client portal slugs and branding
- Manage announcements
- Upload client documents
- Monitor inventory submissions

**System Settings**
- Configure custom domain
- Manage HubSpot integration
- View activity logs
- Process feedback and bug reports

---

## Open Source Licenses

This application uses the following open-source packages. Please review their respective licenses for compliance:

| Package | License | Purpose |
|---------|---------|---------|
| express | MIT | Web application framework |
| react | MIT | User interface library |
| react-dom | MIT | React DOM rendering |
| tailwindcss | MIT | CSS framework |
| bcryptjs | MIT | Password hashing |
| jsonwebtoken | MIT | JWT authentication |
| axios | MIT | HTTP client |
| cors | MIT | Cross-origin resource sharing |
| body-parser | MIT | Request body parsing |
| multer | MIT | File upload handling |
| uuid | MIT | Unique identifier generation |
| pdfkit | MIT | PDF generation |
| pdfmake | MIT | PDF document creation |
| googleapis | Apache-2.0 | Google API integration |
| @hubspot/api-client | Apache-2.0 | HubSpot CRM integration |
| form-data | MIT | Form data handling |

### License Compliance Notes

- **MIT License**: Permits commercial use, modification, and distribution with attribution
- **Apache-2.0 License**: Permits commercial use with attribution and license notice preservation

All open-source components are used in compliance with their respective licenses. No modifications have been made to the source code of these packages.

---

## Support

For technical support or questions:
- Use the in-app feedback form
- Contact your system administrator
- Check the Knowledge Hub for documentation

---

*Developed for Thrive 365 Labs*
