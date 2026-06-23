# Database Schema

## Overview

The ERMAS database is built on PostgreSQL using Prisma ORM. The schema supports complex workflows, user management, and comprehensive auditing.

## Tables

### User Management

#### `User`
Core user account table for both students and staff.

**Fields:**
- `id` (String, PK): UUID identifier
- `email` (String, Unique): Email address
- `password` (String, Nullable): Hashed password (null for students)
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete timestamp

**Relationships:**
- OneToOne → `StaffUser` or `StudentUser`
- OneToMany → `Role` (through UserRole)
- OneToMany → `AuditLog`
- OneToMany → `Remark`

#### `Role`
Defines user roles in the system.

**Fields:**
- `id` (String, PK): UUID identifier
- `name` (String, Unique): Role name (e.g., "FINANCE_OFFICER")
- `description` (String, Nullable): Role description
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Valid Roles:**
- STUDENT
- FINANCE_OFFICER
- SCHEDULE_OFFICER
- VERIFICATION_OFFICER
- EXAM_MANAGER
- REGISTRAR
- DIRECTOR
- SUPER_ADMIN

#### `Permission`
Defines granular permissions.

**Fields:**
- `id` (String, PK): UUID identifier
- `name` (String, Unique): Permission name
- `description` (String, Nullable): Permission description

**Valid Permissions:**
- `application.create`
- `application.approve`
- `payment.verify`
- `schedule.create`
- `report.view`
- `user.manage`

#### `UserRole` (Junction Table)
Links users to roles (many-to-many).

#### `RolePermission` (Junction Table)
Links roles to permissions (many-to-many).

### Student Management

#### `Student`
Student profile information.

**Fields:**
- `id` (String, PK): UUID identifier
- `batchNumber` (String, FK): Batch reference
- `nic` (String): National ID Card
- `fullName` (String): Full name in capitals
- `nameWithInitials` (String, Nullable): Name with initials
- `permanentAddress` (String): Permanent address
- `postalAddress` (String, Nullable): Postal address if different
- `telephone` (String, Nullable): Home phone
- `mobile` (String): Mobile number
- `email` (String): Email address
- `registrationNumber` (String, Unique): SAB registration number
- `intake` (String): Batch intake year/term
- `userId` (String, Unique, FK): Link to user account (nullable)
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Unique Constraints:**
- `(batchNumber, nic, intake)`

#### `StaffUser`
Staff member profile.

**Fields:**
- `id` (String, PK): UUID identifier
- `userId` (String, Unique, FK): Link to user account
- `name` (String): Staff name
- `position` (String): Job title
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

### Programme & Subject

#### `Programme`
Degree programme.

**Fields:**
- `id` (String, PK): UUID identifier
- `code` (String, Unique): Programme code
- `name` (String): Programme name
- `description` (String, Nullable): Programme description
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Examples:**
- Code: `AA`, Name: `BSc Applied Accounting`
- Code: `BMBA`, Name: `Bachelor of Management in Business Analytics`

#### `Batch`
Student batch within a programme.

**Fields:**
- `batchNumber` (String, PK): Batch number (e.g., "AA22-105")
- `programmeId` (String, FK, PK): Programme reference
- `intake` (String, PK): Intake period (e.g., "2022-01")
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

#### `Subject`
Course/subject in a programme.

**Fields:**
- `id` (String, PK): UUID identifier
- `code` (String): Subject code
- `name` (String): Subject name
- `category` (String): Subject category
- `programmeId` (String, FK): Programme reference
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Unique Constraint:**
- `(code, programmeId)`

### Application Management

#### `Application`
Main application record.

**Fields:**
- `id` (String, PK): UUID identifier
- `type` (String): Application type (MEDICAL or REPEAT)
- `status` (String): Current status
- `studentId` (String, FK): Student reference
- `totalFee` (Int): Total fee in LKR
- `paymentReferenceId` (String, Nullable): Payment reference
- `submittedAt` (DateTime, Nullable): Submission timestamp
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Valid Statuses:**
- DRAFT: Initial creation
- SUBMITTED: Sent for review
- PAYMENT_PENDING: Awaiting payment verification
- PAYMENT_VERIFIED: Payment confirmed
- UNDER_REVIEW: Being reviewed
- RETURNED: Sent back for corrections
- APPROVED: Approved
- REJECTED: Rejected
- COMPLETED: Process completed

#### `ApplicationSubject` (Junction Table)
Subjects included in an application.

**Fields:**
- `id` (String, PK): UUID identifier
- `applicationId` (String, FK): Application reference
- `subjectId` (String, FK): Subject reference
- `caMarks` (Int, Nullable): Continuous assessment marks
- `category` (String): Category (MEDICAL, REPEAT, 1ST_ATTEMPT)
- `upcomingExamId` (String, Nullable): Upcoming exam reference
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

### Payment Management

#### `Payment`
Payment records for applications.

**Fields:**
- `id` (String, PK): UUID identifier
- `applicationId` (String, Unique, FK): Application reference
- `amount` (Int): Payment amount in LKR
- `referenceNumber` (String, Unique): Bank/payment reference
- `slipFile` (String, Nullable): MinIO path to payment slip
- `verificationStatus` (String): PENDING, VERIFIED, or REJECTED
- `verifiedBy` (String, Nullable): Verifying officer
- `verifiedAt` (DateTime, Nullable): Verification timestamp
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Fee Structure:**
- Medical: LKR 5,200 per subject
- Repeat: LKR 2,600 per subject

### Document Management

#### `Document`
Uploaded files/documents.

**Fields:**
- `id` (String, PK): UUID identifier
- `applicationId` (String, FK): Application reference
- `documentType` (String): Type (MEDICAL_CERTIFICATE or PAYMENT_SLIP)
- `fileName` (String): Original filename
- `fileSize` (Int): File size in bytes
- `mimeType` (String): MIME type
- `minioPath` (String): Path in MinIO storage
- `uploadedBy` (String): Uploading user ID
- `uploadedAt` (DateTime): Upload timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

**Valid File Types:**
- PDF
- JPG
- PNG

**Maximum File Size:** 10MB

### Workflow & Approval

#### `Approval`
Multi-stage approval workflow tracking.

**Fields:**
- `id` (String, PK): UUID identifier
- `applicationId` (String, FK): Application reference
- `stage` (Int): Approval stage number
- `status` (String): PENDING, APPROVED, REJECTED, RETURNED
- `approvedBy` (String, Nullable): Approving user ID
- `approvedAt` (DateTime, Nullable): Approval timestamp
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Unique Constraint:**
- `(applicationId, stage)`

**Approval Stages:**
1. Finance Officer
2. Verification Officer
3. Exam Manager
4. Registrar
5. Director (optional)

#### `Remark`
Comments and remarks on applications.

**Fields:**
- `id` (String, PK): UUID identifier
- `applicationId` (String, FK): Application reference
- `userId` (String, FK): Commenting user
- `content` (String): Remark text
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

### Audit & Notifications

#### `AuditLog`
System audit trail for compliance.

**Fields:**
- `id` (String, PK): UUID identifier
- `userId` (String, FK): Acting user
- `action` (String): Action performed
- `entity` (String): Entity type (e.g., "Application")
- `entityId` (String): Entity identifier
- `details` (String, Nullable): JSON details
- `ipAddress` (String, Nullable): Client IP
- `userAgent` (String, Nullable): User agent
- `createdAt` (DateTime): Timestamp

**Indexed for:** Quick lookups by user, entity, and date range

#### `Notification`
Student notifications.

**Fields:**
- `id` (String, PK): UUID identifier
- `studentId` (String, FK): Student reference
- `title` (String): Notification title
- `message` (String): Notification message
- `read` (Boolean): Read status
- `readAt` (DateTime, Nullable): Read timestamp
- `createdAt` (DateTime): Creation timestamp

#### `ExaminationSchedule`
Examination schedules.

**Fields:**
- `id` (String, PK): UUID identifier
- `name` (String): Schedule name
- `startDate` (DateTime): Start date
- `endDate` (DateTime): End date
- `programmeId` (String): Programme reference
- `description` (String, Nullable): Description
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp
- `deletedAt` (DateTime, Nullable): Soft delete

## Relationships Diagram

```
User
├── roles → Role → permissions → Permission
├── studentUser → Student
│   ├── batch → Batch
│   │   └── programme → Programme
│   └── applications → Application
│       ├── applicationSubjects → Subject
│       ├── payment → Payment
│       ├── documents → Document
│       ├── approvals → Approval
│       ├── remarks → Remark
│       └── auditLogs → AuditLog
└── auditLogs → AuditLog
```

## Indexing Strategy

All tables have indexes on:
- Foreign keys (for joins)
- Status fields (for filtering)
- Timestamps (for sorting/range queries)
- Soft delete field `deletedAt`

## Soft Deletes

The following tables use soft deletes:
- User
- Programme
- Batch
- Subject
- Application
- Payment
- Document
- ExaminationSchedule

Records are never permanently deleted; `deletedAt` is set instead for audit compliance.

## Migrations

Migrations are managed with Prisma:

```bash
# Create migration
npx prisma migrate dev --name "description"

# Deploy migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```
