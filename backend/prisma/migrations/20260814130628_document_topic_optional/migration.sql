-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_topicId_fkey";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "topicId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
