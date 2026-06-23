-- Test Credentials Setup Script for ERMAS
-- This script creates the necessary roles and users for testing

BEGIN TRANSACTION;

-- Create STUDENT role
INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'STUDENT',
  'Student user role',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Create FINANCE_OFFICER role
INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'FINANCE_OFFICER',
  'Finance officer who verifies payments',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Create VERIFICATION_OFFICER role
INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'VERIFICATION_OFFICER',
  'Verification officer who approves applications',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- Create Finance Officer User
-- Password: password123 (hashed with argon2)
INSERT INTO "User" (id, email, password, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'finance@example.com',
  '$argon2id$v=19$m=19456,t=2,p=1$W7bKNjVoFpPM8H4WzK5bVA$wWP6gZ3uJ/bVL8K0vN1X2YpQ/ZzL3vN5pK7mJ8oQ0kA',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Create Verification Officer User  
INSERT INTO "User" (id, email, password, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'verification@example.com',
  '$argon2id$v=19$m=19456,t=2,p=1$W7bKNjVoFpPM8H4WzK5bVA$wWP6gZ3uJ/bVL8K0vN1X2YpQ/ZzL3vN5pK7mJ8oQ0kA',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

COMMIT;
