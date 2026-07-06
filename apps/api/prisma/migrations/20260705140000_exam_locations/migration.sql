-- Exam venue/hall directory
CREATE TABLE "ExamLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ExamLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExamLocation_deletedAt_idx" ON "ExamLocation"("deletedAt");
