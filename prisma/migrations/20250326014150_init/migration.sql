-- CreateTable
CREATE TABLE "Shoe" (
    "id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stackHeightMm" INTEGER,
    "heelToToeDropMm" INTEGER,
    "width" TEXT,
    "depth" TEXT,
    "intendedUse" TEXT,
    "trueToSize" TEXT,
    "previousModel" TEXT,
    "nextModel" TEXT,
    "changes" TEXT,
    "releaseDate" TIMESTAMP(3),

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
    "weightGrams" INTEGER,
    "price" DECIMAL(65,30),
    "imageIds" INTEGER[],

    CONSTRAINT "ShoeGender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shoe_model_brand_key" ON "Shoe"("model", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeGender_shoeId_gender_key" ON "ShoeGender"("shoeId", "gender");

-- AddForeignKey
ALTER TABLE "ShoeReview" ADD CONSTRAINT "ShoeReview_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeGender" ADD CONSTRAINT "ShoeGender_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
