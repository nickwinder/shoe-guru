-- CreateTable
CREATE TABLE "brr_embedding" (
    "id" SERIAL NOT NULL,
    "pageContent" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector(1536) NOT NULL NOT NULL,

    CONSTRAINT "brr_embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - Manually edited to get HNSW indexing
CREATE INDEX "brr_embedding_embedding_idx" ON "brr_embedding" USING hnsw ("embedding" vector_cosine_ops);
