# Getting Started Guide

## Prerequisites

Before you start developing ERMAS, ensure you have the following installed:

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Docker & Docker Compose**: Latest versions
- **Git**: Latest version
- **PostgreSQL**: v14+ (if running locally without Docker)
- **Redis**: v6+ (if running locally without Docker)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ermas
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for:
- Root monorepo
- Frontend app
- Backend API
- All shared packages

### 3. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
DATABASE_URL=postgresql://ermas:ermas123@localhost:5432/ermas
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=3001
```

### 4. Start Development Services

#### Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- MinIO object storage
- Backend API (NestJS)
- Frontend app (Next.js)

#### Option B: Manual Setup

**Start PostgreSQL:**
```bash
# Using Docker only
docker run -d \
  -e POSTGRES_DB=ermas \
  -e POSTGRES_USER=ermas \
  -e POSTGRES_PASSWORD=ermas123 \
  -p 5432:5432 \
  postgres:16-alpine
```

**Start Redis:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Start MinIO:**
```bash
docker run -d \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /minio_data --console-address ':9001'
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Start Development Servers

```bash
npm run dev
```

This starts both frontend and backend in watch mode.

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

## Project Structure

```
ermas/
├── apps/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts       # Application entry point
│   │   │   ├── app.module.ts # Root module
│   │   │   └── prisma/       # Database service
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   └── package.json
│   └── web/                  # Next.js Frontend
│       ├── src/
│       │   ├── app/          # Pages and layouts
│       │   ├── components/   # React components
│       │   ├── lib/          # Utilities
│       │   └── styles/       # Global styles
│       ├── public/           # Static assets
│       └── package.json
├── packages/
│   ├── shared/               # Shared types and constants
│   ├── auth/                 # Authentication utilities
│   └── ui/                   # Reusable UI components
├── docker/                   # Docker configuration
├── docs/                     # Documentation
├── docker-compose.yml        # Development compose file
└── README.md

```

## Common Commands

### Development

```bash
# Start all services in development mode
npm run dev

# Start only frontend
npm run dev -w @ermas/web

# Start only backend
npm run dev -w @ermas/api

# Build all apps
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Database

```bash
# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Open Prisma Studio
npx prisma studio
```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage reports
npm run test:cov
```

### Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build
```

## IDE Setup

### VS Code Extensions (Recommended)

- [ES7+ React/Redux/React-Native snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
- [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Troubleshooting

### Port Already in Use

If port 3000, 3001, 5432, or 6379 is already in use:

```bash
# Kill process on specific port (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env.local
cat .env.local | grep DATABASE_URL

# Test connection
psql postgresql://ermas:ermas123@localhost:5432/ermas
```

### Node Modules Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Review [Architecture Overview](./ARCHITECTURE.md)
2. Read [API Documentation](./API.md)
3. Check [Database Schema](./DATABASE.md)
4. Start with [Authentication Setup](./AUTHENTICATION.md)

## Getting Help

- Check existing GitHub issues
- Review API documentation at http://localhost:3001/api/docs
- Consult team documentation
- Reach out to the development team
