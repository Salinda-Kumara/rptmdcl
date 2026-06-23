# Architecture Overview

## System Architecture

ERMAS follows a modern three-tier architecture with a monorepo structure.

### Components

#### 1. Frontend (Next.js)
- **Location**: `apps/web`
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Key Features**:
  - Server-side rendering for better performance
  - API client integration with axios
  - State management with Zustand
  - Form handling with React Hook Form + Zod
  - Dark/Light theme support

#### 2. Backend (NestJS)
- **Location**: `apps/api`
- **Framework**: NestJS with Express
- **Database**: PostgreSQL with Prisma ORM
- **Key Features**:
  - Modular architecture
  - SOLID principles compliance
  - Repository pattern for data access
  - JWT authentication
  - Swagger/OpenAPI documentation
  - Role-based access control

#### 3. Shared Packages
- **@ermas/shared**: Common types, constants, and utilities
- **@ermas/auth**: Authentication types and utilities
- **@ermas/ui**: Reusable React components

### Data Flow

1. **Client Request**
   - User interacts with Next.js frontend
   - Axios HTTP client sends request to `/api/v1`

2. **Backend Processing**
   - NestJS receives request
   - JWT middleware validates authentication
   - Route handler processes request
   - Prisma ORM interacts with PostgreSQL

3. **Response**
   - Data returned to frontend
   - Zustand updates local state
   - UI re-renders with new data

### External Services

- **PostgreSQL**: Primary data store
- **Redis**: Caching layer for sessions and frequently accessed data
- **MinIO**: Object storage for file uploads
- **Cloudflare**: CDN and DDoS protection

### Security Layers

1. **Authentication**
   - JWT tokens with refresh mechanism
   - Separate student (Batch/NIC) and staff (Email/Password) auth

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission-based authorization
   - Middleware guards on routes

3. **Data Protection**
   - Argon2 password hashing
   - HTTPS/TLS encryption
   - CORS protection
   - CSRF tokens for form submissions
   - Rate limiting

### Workflow Architecture

Applications follow a multi-stage approval workflow:

```
Student Submits
    ↓
Finance Verification
    ↓
Payment Verification
    ↓
Examination Verification
    ↓
Exam Manager Review
    ↓
Registrar Approval
    ↓
Director (Optional)
    ↓
Completion
```

Each stage can:
- Approve and move to next stage
- Reject with remarks
- Return for corrections
- Add remarks for next reviewer

## Deployment Architecture

### Development
- Docker Compose manages PostgreSQL, Redis, MinIO
- Next.js dev server with hot reload
- NestJS with nodemon for auto-restart

### Production
- Docker containers for API and Web
- Nginx reverse proxy
- PostgreSQL managed database
- Redis managed cache
- S3-compatible object storage (MinIO or AWS S3)
- Cloudflare for CDN and security

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend Framework | Next.js 15 | SSR, SEO optimization, built-in API routes |
| UI Components | shadcn/ui | Accessible, customizable, Tailwind-based |
| Backend | NestJS | SOLID principles, strong typing, scalability |
| ORM | Prisma | Type-safe, intuitive, great DX |
| Database | PostgreSQL | ACID compliance, advanced features, reliability |
| Caching | Redis | Fast in-memory cache, session management |
| Auth | JWT | Stateless, scalable, RESTful |
| File Storage | MinIO | S3-compatible, self-hosted alternative |
| Container | Docker | Consistent environments, easy deployment |
