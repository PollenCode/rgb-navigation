/*
  Warnings:

  - The migration will change the primary key for the `Token` table. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Token` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Token" DROP CONSTRAINT "Token_pkey",
ADD COLUMN     "authorId" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "Token" ADD FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
