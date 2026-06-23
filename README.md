# ERMAS - Examination Repeat & Medical Application Management System

A modern web-based application management system for the School of Accounting and Business at The Institute of Chartered Accountants of Sri Lanka.

## Project Overview

ERMAS is designed to digitize and streamline the examination repeat and medical application process. The system supports multiple user roles (Students, Finance Officers, Schedule Officers, Verification Officers, Exam Managers, Registrars, and Directors) with an approval workflow and comprehensive reporting capabilities.

**Supported Programmes:**
- BSc Applied Accounting
- BMBA (Bachelor of Management in Business Analytics)

Future programmes can be added without code changes through the configurable programme management system.

## Tech Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

### Backend
- **NestJS** - Node.js framework with SOLID principles
- **TypeScript** - Type safety
- **Prisma ORM** - Database abstraction
- **PostgreSQL** - Relational database
- **Redis** - Caching layer
- **MinIO** - Object storage

### Deployment
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Cloudflare** - CDN and security

## Project Structure

```
ermas/
├── apps/
│   ├── api/              # NestJS backend API
│   └── web/              # Next.js frontend application
├── packages/
│   ├── auth/             # Authentication logic
│   ├── shared/           # Shared types and utilities
│   └── ui/               # Reusable UI components
├── docker/               # Docker configuration
├── docs/                 # Project documentation
└── package.json          # Monorepo configuration
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6
- MinIO (for local development)
- Docker & Docker Compose

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ermas
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed
```

### 4. Start Development Services

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or start individual services
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## Available Scripts

```bash
npm run dev          # Start development servers
npm run build        # Build all applications
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run type-check   # Type checking
```

## Development Phases

1. **Phase 1:** Authentication module
2. **Phase 2:** Student portal
3. **Phase 3:** Finance management
4. **Phase 4:** Examination management
5. **Phase 5:** Approval workflow
6. **Phase 6:** Reports and exports
7. **Phase 7:** Testing and QA
8. **Phase 8:** Deployment

## Key Features

- ✅ User authentication (Students via Batch/NIC, Staff via Email/Password)
- ✅ Role-based access control (RBAC)
- ✅ Application management (Medical and Repeat applications)
- ✅ Payment verification and tracking
- ✅ Examination schedule management
- ✅ Multi-step approval workflow
- ✅ Comprehensive reporting and exports
- ✅ Audit logging
- ✅ File uploads (PDF, JPG, PNG - max 10MB)
- ✅ Responsive design (Desktop, Tablet, Mobile)
- ✅ Light/Dark mode support

## Database Tables

- `users` - System users
- `roles` - User roles
- `permissions` - Access permissions
- `students` - Student information
- `programmes` - Degree programmes
- `batches` - Student batches
- `subjects` - Course subjects
- `applications` - Applications
- `application_subjects` - Application detail
- `payments` - Payment records
- `documents` - Uploaded files
- `approvals` - Workflow approvals
- `remarks` - Review remarks
- `audit_logs` - System audit trail
- `notifications` - User notifications

## API Structure

All API endpoints follow RESTful conventions:
- Base URL: `/api/v1`
- Authentication: JWT Bearer tokens
- Documentation: Swagger/OpenAPI at `/api/docs`

## Security

- JWT authentication with refresh tokens
- Argon2 password hashing
- Rate limiting
- CSRF protection
- HTTPS/TLS enforcement
- Session management
- Input validation and sanitization
- File type validation

## Deployment

### Docker Deployment

```bash
docker-compose -f docker-compose.yml up -d
```

### Manual Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [User Manual](docs/USER_MANUAL.md)
- [Administrator Manual](docs/ADMIN_MANUAL.md)

## Support

For support, contact the development team or create an issue in the repository.

## License

This project is proprietary and confidential.

## Version

v1.0.0
