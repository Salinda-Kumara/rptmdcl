-- AlterTable
ALTER TABLE "ExaminationSchedule" ALTER COLUMN "programmeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExamStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExamStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledExam" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "serialCode" TEXT,
    "startAtLabel" TEXT,
    "examDate" TIMESTAMP(3),
    "weekday" TEXT,
    "revisedDate" TIMESTAMP(3),
    "intake" TEXT,
    "courseCode" TEXT,
    "courseName" TEXT,
    "expectedCount" INTEGER,
    "session1" TEXT,
    "session2" TEXT,
    "session3" TEXT,
    "location" TEXT,
    "chiefExaminerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supervisorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invigilatorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamStaff_role_idx" ON "ExamStaff"("role");

-- CreateIndex
CREATE INDEX "ExamStaff_deletedAt_idx" ON "ExamStaff"("deletedAt");

-- CreateIndex
CREATE INDEX "ScheduledExam_scheduleId_idx" ON "ScheduledExam"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledExam_examDate_idx" ON "ScheduledExam"("examDate");

-- AddForeignKey
ALTER TABLE "ScheduledExam" ADD CONSTRAINT "ScheduledExam_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExaminationSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
