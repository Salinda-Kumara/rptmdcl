-- Move from role-based access to per-user permissions (PBAC).

-- Drop role/permission tables (FKs cascade).
DROP TABLE IF EXISTS "RolePermission" CASCADE;
DROP TABLE IF EXISTS "UserRole" CASCADE;
DROP TABLE IF EXISTS "Permission" CASCADE;
DROP TABLE IF EXISTS "Role" CASCADE;

-- Access level enum.
DO $$ BEGIN
  CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'FULL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Master Admin flag.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Per-user, per-feature permission.
CREATE TABLE IF NOT EXISTS "UserPermission" (
  "userId"    TEXT NOT NULL,
  "resource"  TEXT NOT NULL,
  "level"     "AccessLevel" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId", "resource")
);

CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");

ALTER TABLE "UserPermission"
  ADD CONSTRAINT "UserPermission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
