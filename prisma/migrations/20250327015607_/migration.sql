/*
  Warnings:

  - You are about to drop the column `heelToToeDropMm` on the `Shoe` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shoe" DROP COLUMN "heelToToeDropMm",
ADD COLUMN     "forefootStackHeightMm" INTEGER,
ADD COLUMN     "heelStackHeightMm" INTEGER;
