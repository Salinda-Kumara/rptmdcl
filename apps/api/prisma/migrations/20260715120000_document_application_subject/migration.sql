-- Link a Document to a specific ApplicationSubject (e.g. a per-subject medical
-- certificate). Null for application-level documents such as the payment slip.
ALTER TABLE "Document" ADD COLUMN "applicationSubjectId" TEXT;

CREATE INDEX "Document_applicationSubjectId_idx" ON "Document"("applicationSubjectId");

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_applicationSubjectId_fkey"
  FOREIGN KEY ("applicationSubjectId") REFERENCES "ApplicationSubject"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
