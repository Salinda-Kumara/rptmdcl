# Authentication Module - Testing Guide

## Backend Authentication Implementation

### Database Setup

1. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

2. **Run Migrations:**
```bash
cd apps/api
npm run db:migrate
```

3. **Seed Data (Optional):**
```bash
npm run db:seed
```

### Test Credentials (from seed)

**Student:**
- Batch Number: `AA22-105`
- NIC: `200012345678`

**Staff (Finance Officer):**
- Email: `finance@example.com`
- Password: `password123`

**Staff (Verification Officer):**
- Email: `verification@example.com`
- Password: `password123`

## API Testing

### Using cURL

#### Student Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "batchNumber": "AA22-105",
    "nic": "200012345678"
  }'
```

#### Staff Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "finance@example.com",
    "password": "password123"
  }'
```

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Refresh Token
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Using Swagger/OpenAPI

Access the interactive API documentation at:
```
http://localhost:3001/api/docs
```

Test endpoints directly from the Swagger UI.

## Frontend Testing

### Start Frontend Development Server
```bash
cd apps/web
npm run dev
```

Access at: `http://localhost:3000`

### Test Student Login
1. Click "Student Login" or navigate to `/login`
2. Enter credentials:
   - Batch: `AA22-105`
   - NIC: `200012345678`
3. Should redirect to `/dashboard/student`

### Test Staff Login
1. Click "Staff Login" or navigate to `/login/staff`
2. Enter credentials:
   - Email: `finance@example.com`
   - Password: `password123`
3. Should redirect to `/dashboard/staff`

## Full Integration Test

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run migrations and seed:**
```bash
npm run db:migrate -w @ermas/api
npm run db:seed -w @ermas/api
```

4. **Start development servers:**
```bash
npm run dev
```

5. **Test the flow:**
   - Visit `http://localhost:3000`
   - Click login as student
   - Enter test credentials
   - Should see student dashboard
   - Logout and test staff login
   - Verify dashboards and logout functionality

## Backend Architecture

### Authentication Flow

```
User Login Request
    ↓
AuthService.studentLogin() or AuthService.staffLogin()
    ↓
Validate credentials
    ↓
Generate JWT tokens (access + refresh)
    ↓
Return tokens and user info
    ↓
Client stores tokens in localStorage
    ↓
API Client adds token to Authorization header
```

### Protected Endpoints

```
Request with Bearer Token
    ↓
JwtAuthGuard validates token
    ↓
JwtStrategy extracts and verifies payload
    ↓
User object attached to request
    ↓
Route handler processes request
    ↓
Send response
```

### Key Components

1. **AuthService** (`auth.service.ts`)
   - Student login logic
   - Staff login logic
   - Token generation
   - Token refresh

2. **AuthController** (`auth.controller.ts`)
   - POST `/auth/student/login`
   - POST `/auth/staff/login`
   - POST `/auth/refresh`
   - GET `/auth/profile` (protected)

3. **JwtStrategy** (`strategies/jwt.strategy.ts`)
   - Validates JWT tokens
   - Extracts user information
   - Loads user with roles and permissions

4. **Guards** (`guards/`)
   - `JwtAuthGuard` - Validates JWT token
   - `RolesGuard` - Validates user roles

## Frontend Architecture

### Authentication State

Uses Zustand for state management (`lib/auth-store.ts`):
- User information
- Access and refresh tokens
- Authentication status
- Loading and error states

### Authentication Hook

`useAuth()` hook provides:
- `studentLogin(credentials)`
- `staffLogin(credentials)`
- `logout()`
- `user` object
- `isAuthenticated` boolean

### Protected Routes

`ProtectedLayout` component:
- Checks authentication status
- Redirects to login if not authenticated
- Shows loading state while checking

### API Client

`lib/api-client.ts` handles:
- Request interceptor - adds authorization header
- Response interceptor - handles token refresh
- Automatic token refresh on 401
- Logout on failed refresh

## Troubleshooting

### "Invalid batch number or NIC"
- Verify student credentials in seed data
- Check database connection
- Ensure migrations have run

### "Invalid email or password"
- Check staff credentials in seed data
- Verify password hashing (Argon2)
- Check if user exists in database

### "Invalid or expired token"
- Token may have expired
- Use refresh token to get new access token
- Check JWT_SECRET matches between requests

### CORS errors
- Ensure frontend URL is in CORS_ORIGIN
- Check localhost vs 127.0.0.1 usage
- Verify credentials: true in CORS config

## Security Notes

1. **Token Storage:** Currently stored in localStorage (vulnerable to XSS)
   - Production should use httpOnly cookies
   - Add CSRF token for form submissions

2. **Password Hashing:** Using Argon2 with secure settings
   - Never send plaintext passwords
   - Always use HTTPS in production

3. **Token Expiration:**
   - Access token: 1 hour (3600 seconds)
   - Refresh token: 7 days (604800 seconds)
   - Adjust based on security requirements

4. **Rate Limiting:**
   - Should be implemented in production
   - Prevent brute force attacks
   - Implement exponential backoff

## Next Steps

1. Implement email verification for staff
2. Add forgot password functionality
3. Implement rate limiting on login endpoints
4. Add 2FA for staff accounts
5. Create audit logs for authentication events
6. Implement OAuth2 for staff SSO
7. Add password strength validation
