/*
  Warnings:

  - You are about to drop the column `email` on the `SessionEp` table. All the data in the column will be lost.
  - Added the required column `userId` to the `SessionEp` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SessionEp_email_key";

-- AlterTable
ALTER TABLE "SessionEp" DROP COLUMN "email",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "SessionEp" ADD CONSTRAINT "SessionEp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
