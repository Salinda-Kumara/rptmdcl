-- Add a unique daily serial number (e.g. 20260627-01) assigned on submission.
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Application_serialNumber_key" ON "Application"("serialNumber");
