-- Previous Examination Details now capture a 2nd attempt alongside the 1st.
-- The existing previousExam* / gradeEarned columns hold the 1st attempt.
ALTER TABLE "ApplicationSubject" ADD COLUMN "secondAttemptDate" TIMESTAMP(3);
ALTER TABLE "ApplicationSubject" ADD COLUMN "secondAttemptIntake" TEXT;
ALTER TABLE "ApplicationSubject" ADD COLUMN "secondAttemptGrade" TEXT;
