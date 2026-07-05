-- Publish support for exam schedules (public view-only page)
ALTER TABLE "ExaminationSchedule"
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publicToken" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ExaminationSchedule_publicToken_key" ON "ExaminationSchedule"("publicToken");
