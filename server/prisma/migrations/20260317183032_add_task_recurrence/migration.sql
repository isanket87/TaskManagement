-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRecurrenceId" TEXT,
ADD COLUMN     "nextOccurrence" TIMESTAMP(3),
ADD COLUMN     "recurrenceConfig" JSONB,
ADD COLUMN     "recurrenceRule" TEXT;
