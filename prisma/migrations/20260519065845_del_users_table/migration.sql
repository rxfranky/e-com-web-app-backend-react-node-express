/*
  Warnings:

  - You are about to drop the column `userId` on the `AuthState` table. All the data in the column will be lost.
  - You are about to drop the `cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subscribers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `user` to the `AuthState` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuthState" DROP CONSTRAINT "AuthState_userId_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_consumer_fkey";

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_product_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_consumer_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_product_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_creator_fkey";

-- AlterTable
ALTER TABLE "AuthState" DROP COLUMN "userId",
ADD COLUMN     "user" TEXT NOT NULL;

-- DropTable
DROP TABLE "cart";

-- DropTable
DROP TABLE "orders";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "subscribers";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "Cart" (
    "id" SERIAL NOT NULL,
    "product" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "consumer" TEXT NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" SERIAL NOT NULL,
    "product" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "order_id" VARCHAR(99) NOT NULL,
    "consumer" TEXT NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(30) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "image_src" VARCHAR(200) NOT NULL,
    "creator" TEXT NOT NULL,
    "image_id" VARCHAR(99) NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscribers" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(100) NOT NULL,

    CONSTRAINT "Subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cart_product_consumer_key" ON "Cart"("product", "consumer");

-- CreateIndex
CREATE UNIQUE INDEX "Subscribers_email_key" ON "Subscribers"("email");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_consumer_fkey" FOREIGN KEY ("consumer") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_product_fkey" FOREIGN KEY ("product") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_consumer_fkey" FOREIGN KEY ("consumer") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_product_fkey" FOREIGN KEY ("product") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_creator_fkey" FOREIGN KEY ("creator") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthState" ADD CONSTRAINT "AuthState_user_fkey" FOREIGN KEY ("user") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
