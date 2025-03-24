-- CreateTable
CREATE TABLE "Shoe" (
    "id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "intendedUse" TEXT,
    "price" DECIMAL(65,30),
    "trueToSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shoe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoeSpec" (
    "id" SERIAL NOT NULL,
    "shoeId" INTEGER NOT NULL,
    "weightGrams" INTEGER,
    "stackHeightMm" INTEGER,
    "heelToToeDropMm" INTEGER,
    "width" TEXT,
    "depth" TEXT,

    CONSTRAINT "ShoeSpec_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ShoeVersion" (
    "id" SERIAL NOT NULL,
    "imageIds" INTEGER[],
    "shoeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "previousModel" TEXT,
    "changes" TEXT,
    "releaseDate" TIMESTAMP(3),

    CONSTRAINT "ShoeVersion_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "ShoeSpec_shoeId_key" ON "ShoeSpec"("shoeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoeVersion_name_key" ON "ShoeVersion"("name");

-- AddForeignKey
ALTER TABLE "ShoeSpec" ADD CONSTRAINT "ShoeSpec_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeReview" ADD CONSTRAINT "ShoeReview_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoeVersion" ADD CONSTRAINT "ShoeVersion_shoeId_fkey" FOREIGN KEY ("shoeId") REFERENCES "Shoe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
