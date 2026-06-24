-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "permanentAddress" DROP NOT NULL,
ALTER COLUMN "mobile" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;
