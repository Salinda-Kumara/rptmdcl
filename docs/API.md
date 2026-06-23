# API Documentation

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All endpoints (except login) require Bearer token authentication.

### Request Header
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### Student Login
```http
POST /auth/student/login

Request:
{
  "batchNumber": "AA22-105",
  "nic": "200012345678"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "student": {
    "id": "uuid",
    "batchNumber": "AA22-105",
    "nic": "200012345678",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Staff Login
```http
POST /auth/staff/login

Request:
{
  "email": "officer@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "staff": {
    "id": "uuid",
    "email": "officer@example.com",
    "name": "Jane Smith",
    "roles": ["FINANCE_OFFICER"]
  }
}
```

#### Refresh Token
```http
POST /auth/refresh

Request:
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "accessToken": "eyJhbGc..."
}
```

### Applications

#### Create Application
```http
POST /applications

Request:
{
  "type": "MEDICAL",
  "subjects": [
    {
      "subjectId": "uuid",
      "caMarks": 75,
      "category": "MEDICAL"
    }
  ]
}

Response:
{
  "id": "uuid",
  "type": "MEDICAL",
  "status": "DRAFT",
  "totalFee": 5200,
  "studentId": "uuid",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Get Applications (Student)
```http
GET /applications

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "MEDICAL",
      "status": "SUBMITTED",
      "totalFee": 5200,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Application Detail
```http
GET /applications/{id}

Response:
{
  "id": "uuid",
  "type": "MEDICAL",
  "status": "UNDER_REVIEW",
  "subjects": [
    {
      "id": "uuid",
      "code": "ACC101",
      "name": "Accounting Principles",
      "caMarks": 75,
      "category": "MEDICAL"
    }
  ],
  "payment": {
    "id": "uuid",
    "amount": 5200,
    "status": "VERIFIED",
    "referenceNumber": "PAY12345"
  },
  "approvals": [
    {
      "stage": 1,
      "status": "APPROVED",
      "approvedBy": "officer1@example.com",
      "approvedAt": "2024-01-02T10:00:00Z"
    }
  ],
  "remarks": [
    {
      "id": "uuid",
      "content": "Please check CA marks",
      "createdBy": "officer2@example.com",
      "createdAt": "2024-01-02T11:00:00Z"
    }
  ]
}
```

#### Submit Application
```http
PUT /applications/{id}/submit

Response:
{
  "id": "uuid",
  "status": "SUBMITTED",
  "submittedAt": "2024-01-01T10:00:00Z"
}
```

### Documents

#### Upload Document
```http
POST /applications/{id}/documents

Content-Type: multipart/form-data

Parameters:
- file: [binary file]
- documentType: "MEDICAL_CERTIFICATE" or "PAYMENT_SLIP"

Response:
{
  "id": "uuid",
  "applicationId": "uuid",
  "documentType": "MEDICAL_CERTIFICATE",
  "fileName": "certificate.pdf",
  "fileSize": 245000,
  "mimeType": "application/pdf",
  "uploadedAt": "2024-01-01T10:00:00Z"
}
```

#### Get Document
```http
GET /documents/{id}/download

Response: Binary file data
```

### Payments

#### Get Payment Info
```http
GET /applications/{id}/payment

Response:
{
  "id": "uuid",
  "applicationId": "uuid",
  "amount": 5200,
  "referenceNumber": "PAY12345",
  "verificationStatus": "VERIFIED",
  "verifiedAt": "2024-01-02T10:00:00Z"
}
```

#### Verify Payment (Finance Officer)
```http
POST /payments/{id}/verify

Request:
{
  "verified": true,
  "remarks": "Payment confirmed"
}

Response:
{
  "id": "uuid",
  "verificationStatus": "VERIFIED",
  "verifiedAt": "2024-01-02T10:00:00Z"
}
```

### Approvals (Staff Only)

#### Get Pending Approvals
```http
GET /approvals/pending

Query Parameters:
- role: "FINANCE_OFFICER" (optional)
- status: "PENDING" (optional)
- limit: 10 (default)
- offset: 0 (default)

Response:
{
  "data": [
    {
      "applicationId": "uuid",
      "stage": 1,
      "status": "PENDING",
      "application": {
        "id": "uuid",
        "type": "MEDICAL",
        "student": {
          "fullName": "John Doe",
          "registrationNumber": "AA22-105-001"
        }
      }
    }
  ],
  "total": 5
}
```

#### Approve Application
```http
POST /approvals/{applicationId}/approve

Request:
{
  "remarks": "Approved for payment verification"
}

Response:
{
  "applicationId": "uuid",
  "stage": 1,
  "status": "APPROVED",
  "approvedAt": "2024-01-02T10:00:00Z"
}
```

#### Reject Application
```http
POST /approvals/{applicationId}/reject

Request:
{
  "remarks": "CA marks not provided"
}

Response:
{
  "applicationId": "uuid",
  "stage": 1,
  "status": "REJECTED",
  "approvedAt": "2024-01-02T10:00:00Z"
}
```

#### Return Application
```http
POST /approvals/{applicationId}/return

Request:
{
  "remarks": "Please provide missing documents"
}

Response:
{
  "applicationId": "uuid",
  "status": "RETURNED",
  "approvedAt": "2024-01-02T10:00:00Z"
}
```

### Reports (Staff Only)

#### Application Report
```http
GET /reports/applications

Query Parameters:
- type: "MEDICAL" or "REPEAT"
- status: "APPROVED"
- startDate: "2024-01-01"
- endDate: "2024-12-31"
- format: "json" or "csv"

Response:
{
  "data": [
    {
      "id": "uuid",
      "type": "MEDICAL",
      "status": "APPROVED",
      "student": { ... },
      "totalFee": 5200,
      "submittedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 50
}
```

#### Export Reports
```http
GET /reports/applications/export

Query Parameters:
- format: "pdf" or "excel"

Response: Binary file data
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "You don't have permission to perform this action"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation Error",
  "errors": {
    "batchNumber": ["batchNumber must not be empty"]
  }
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Not Found",
  "error": "Application not found"
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Pagination

List endpoints support pagination:

```
GET /applications?limit=10&offset=0

Response:
{
  "data": [...],
  "total": 100,
  "limit": 10,
  "offset": 0,
  "pages": 10
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP
- 1000 requests per hour per authenticated user

Headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3001/api/docs
```
