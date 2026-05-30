/*
  Warnings:

  - You are about to drop the `SessionEp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SessionEp" DROP CONSTRAINT "SessionEp_userId_fkey";

-- DropTable
DROP TABLE "SessionEp";

-- CreateTable
CREATE TABLE "AuthState" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthState_token_key" ON "AuthState"("token");

-- AddForeignKey
ALTER TABLE "AuthState" ADD CONSTRAINT "AuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
