-- AlterTable: Add avatarUrl while keeping avatar for a moment
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- Data Migration: Copy existing avatar data to avatarUrl
UPDATE "User" SET "avatarUrl" = "avatar";

-- Finally drop the old column
ALTER TABLE "User" DROP COLUMN "avatar";
