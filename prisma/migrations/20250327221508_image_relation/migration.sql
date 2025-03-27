/*
  Warnings:

  - You are about to drop the column `imageIds` on the `ShoeGender` table. All the data in the column will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "shoeGenderId" INTEGER;

-- AlterTable
ALTER TABLE "ShoeGender" DROP COLUMN "imageIds";

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_shoeGenderId_fkey" FOREIGN KEY ("shoeGenderId") REFERENCES "ShoeGender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
