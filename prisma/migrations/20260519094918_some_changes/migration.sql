/*
  Warnings:

  - You are about to drop the column `user` on the `AuthState` table. All the data in the column will be lost.
  - Added the required column `userId` to the `AuthState` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuthState" DROP CONSTRAINT "AuthState_user_fkey";

-- AlterTable
ALTER TABLE "AuthState" DROP COLUMN "user",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "AuthState" ADD CONSTRAINT "AuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
