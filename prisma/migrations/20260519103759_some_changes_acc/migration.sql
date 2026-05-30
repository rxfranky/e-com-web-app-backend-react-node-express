-- AlterTable
ALTER TABLE "account" ADD COLUMN     "passResetToken" TEXT,
ADD COLUMN     "passResetTokenExp" TIMESTAMP(3);
