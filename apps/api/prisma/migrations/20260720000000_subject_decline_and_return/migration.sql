-- Per-subject decline (Exam Division may decline one wrong subject and forward
-- the rest). RETURNED application status reuses the existing Application.status
-- string column, so only the ApplicationSubject columns are added here.
ALTER TABLE "ApplicationSubject" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "ApplicationSubject" ADD COLUMN "declineReason" TEXT;
ALTER TABLE "ApplicationSubject" ADD COLUMN "declinedAt" TIMESTAMP(3);
ALTER TABLE "ApplicationSubject" ADD COLUMN "declinedBy" TEXT;
