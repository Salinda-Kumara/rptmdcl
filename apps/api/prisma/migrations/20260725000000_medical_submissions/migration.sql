-- Medical Submissions: absent-on-exam-day medical certificate flow.
-- Documents may now belong to a medical submission instead of an application.
ALTER TABLE "Document" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "Document" ADD COLUMN "medicalSubmissionId" TEXT;

CREATE TABLE "MedicalSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "serialNumber" TEXT,
    "applicantDetails" JSONB,
    "totalDays" INTEGER,
    "reviewRemarks" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MedicalSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalSubmissionItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "usedByApplicationSubjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicalSubmissionItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicalSubmission_serialNumber_key" ON "MedicalSubmission"("serialNumber");
CREATE INDEX "MedicalSubmission_studentId_idx" ON "MedicalSubmission"("studentId");
CREATE INDEX "MedicalSubmission_status_idx" ON "MedicalSubmission"("status");
CREATE INDEX "MedicalSubmission_deletedAt_idx" ON "MedicalSubmission"("deletedAt");
CREATE UNIQUE INDEX "MedicalSubmissionItem_usedByApplicationSubjectId_key" ON "MedicalSubmissionItem"("usedByApplicationSubjectId");
CREATE INDEX "MedicalSubmissionItem_submissionId_idx" ON "MedicalSubmissionItem"("submissionId");
CREATE INDEX "MedicalSubmissionItem_subjectId_idx" ON "MedicalSubmissionItem"("subjectId");
CREATE INDEX "Document_medicalSubmissionId_idx" ON "Document"("medicalSubmissionId");

ALTER TABLE "MedicalSubmission" ADD CONSTRAINT "MedicalSubmission_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalSubmissionItem" ADD CONSTRAINT "MedicalSubmissionItem_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "MedicalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalSubmissionItem" ADD CONSTRAINT "MedicalSubmissionItem_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_medicalSubmissionId_fkey"
  FOREIGN KEY ("medicalSubmissionId") REFERENCES "MedicalSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
