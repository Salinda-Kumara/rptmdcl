/*
  Warnings:

  - You are about to drop the column `upcomingExamId` on the `ApplicationSubject` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApplicationSubject" DROP COLUMN "upcomingExamId",
ADD COLUMN     "gradeEarned" TEXT,
ADD COLUMN     "previousExamDate" TIMESTAMP(3),
ADD COLUMN     "previousExamIntake" TEXT,
ADD COLUMN     "upcomingExamIntake" TEXT;
