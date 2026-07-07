-- Enable-for-apply flag on exam schedules
ALTER TABLE "ExaminationSchedule" ADD COLUMN "applyEnabled" BOOLEAN NOT NULL DEFAULT false;
