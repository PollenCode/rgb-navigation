-- DropIndex
DROP INDEX "Effect.name_unique";

-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "description" TEXT;
