-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "Shoe" (
    "id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forefootStackHeightMm" INTEGER NOT NULL,
    "heelStackHeightMm" INTEGER NOT NULL,
    "dropMm" INTEGER NOT NULL,
    "fit" TEXT NOT NULL,
    "wideOption" BOOLEAN NOT NULL,
    "description" TEXT NOT NULL,
    "intendedUse" TEXT,

    CONSTRAINT "Shoe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeReview" (
    "id" SERIAL NOT NULL,
    "shoeId" INTEGER NOT NULL,
    "fit" TEXT,
    "feel" TEXT,
    "durability" TEXT,

    CONSTRAINT "ShoeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeGender" (
    "id" SERIAL NOT NULL,
    "shoeId" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "priceRRP" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30),

    CONSTRAINT "ShoeGender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "shoeGenderId" INTEGER,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brr_embedding" (
    "id" SERIAL NOT NULL,
    "pageContent" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector(1536) NOT NULL NOT NULL,

    CONSTRAINT "brr_embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shoe_model_brand_key" ON "Shoe"("model", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeGender_shoeId_gender_key" ON "ShoeGender"("shoeId", "gender");

-- CreateIndex
CREATE INDEX "brr_embedding_embedding_idx" ON "brr_embedding"("embedding");

-- AddForeignKey
ALTER TABLE "ShoeReview" ADD CONSTRAINT "ShoeReview_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeGender" ADD CONSTRAINT "ShoeGender_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_shoeGenderId_fkey" FOREIGN KEY ("shoeGenderId") REFERENCES "ShoeGender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
