-- Medical-category subjects record the medical board approval's serial number
-- alongside the uploaded certificate.
ALTER TABLE "ApplicationSubject" ADD COLUMN "medicalApprovalSerial" TEXT;
