-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifyExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT;
