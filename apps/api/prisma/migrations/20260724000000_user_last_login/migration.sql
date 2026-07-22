-- Track the last successful login time per user (shown in the admin Students list).
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
