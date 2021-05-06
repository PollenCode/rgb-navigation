/*
  Warnings:

  - You are about to drop the column `userId` on the `Effect` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Effect" DROP CONSTRAINT "Effect_userId_fkey";

-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "userId",
ADD COLUMN     "compiled" BYTEA,
ADD COLUMN     "authorId" TEXT;

-- AddForeignKey
ALTER TABLE "Effect" ADD FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
