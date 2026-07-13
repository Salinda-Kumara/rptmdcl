-- Per-subject admission-card print tracking
ALTER TABLE "ApplicationSubject"
  ADD COLUMN "admissionPrinted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "admissionPrintedAt" TIMESTAMP(3),
  ADD COLUMN "admissionPrintedBy" TEXT;
