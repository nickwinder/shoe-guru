import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Embeddings } from "@langchain/core/embeddings";

// Create a simple mock embedding model that returns random embeddings
class MockEmbeddings implements Embeddings {
  // Return a random embedding of the specified dimension
  private getRandomEmbedding(dimension: number): number[] {
    return Array.from({ length: dimension }, () => Math.random());
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    // Return a random embedding for each document
    return documents.map(() => this.getRandomEmbedding(384)); // 384 is a common embedding dimension
  }

  async embedQuery(query: string): Promise<number[]> {
    // Return a random embedding for the query
    return this.getRandomEmbedding(384);
  }
}

async function testHNSWLib() {
  console.log("Testing HNSWLib integration...");

  // Create a mock embedding model
  const embeddings = new MockEmbeddings();

  // Create the storage directory
  const storageDir = path.join(process.cwd(), "vector_store");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Create an HNSWLib instance directly
  let vectorStore: HNSWLib;

  // Check if the vector store already exists
  if (fs.existsSync(path.join(storageDir, "hnswlib.index"))) {
    console.log("Loading existing vector store...");
    vectorStore = await HNSWLib.load(storageDir, embeddings);
  } else {
    console.log("Creating new vector store...");
    // Initialize with a dummy document
    vectorStore = await HNSWLib.fromDocuments(
      [{ pageContent: "dummy", metadata: {} }],
      embeddings
    );
  }

  console.log("Created HNSWLib instance");

  // Create some test documents
  const docs = [
    new Document({
      pageContent: "This is a test document about shoes",
      metadata: { title: "Test Document 1" }
    }),
    new Document({
      pageContent: "Running shoes are designed for running",
      metadata: { title: "Test Document 2" }
    }),
    new Document({
      pageContent: "Hiking boots are designed for hiking",
      metadata: { title: "Test Document 3" }
    })
  ];

  // Add documents to the vector store
  console.log("Adding documents to vector store...");
  await vectorStore.addDocuments(docs);

  // Save the vector store after adding documents
  console.log(`Saving vector store to ${storageDir}...`);
  await vectorStore.save(storageDir);

  // Verify that the files were created
  const indexExists = fs.existsSync(path.join(storageDir, "hnswlib.index"));
  const docstoreExists = fs.existsSync(path.join(storageDir, "docstore.json"));

  console.log(`Index file exists: ${indexExists}`);
  console.log(`Docstore file exists: ${docstoreExists}`);

  // Test retrieval
  console.log("Testing retrieval...");
  const results = await vectorStore.similaritySearch("running shoes", 2);

  console.log("Retrieved documents:");
  results.forEach((doc, i) => {
    console.log(`Document ${i + 1}: ${doc.pageContent}`);
    console.log(`Metadata: ${JSON.stringify(doc.metadata)}`);
  });

  console.log("Test completed successfully!");
}

testHNSWLib().catch(console.error);
