import { graph } from "../src/retrieval_graph/graph.js";

/**
 * Example of using the local memory store retriever with the Wide Toe Box graph.
 * 
 * This example shows how to configure the graph to use the local memory store retriever
 * and load document files (DOCX) from directories at runtime.
 */

// Define the paths to your document files or directories
const documentPaths = [
  "/Users/nickwinder/Downloads/reviews",
];

// Configure the graph to use the local memory store retriever
const config = {
  configurable: {
    // Specify a user ID to associate with the documents
    userId: "user123",

    // Use the local memory store retriever
    retrieverProvider: "local-memory",

    // Provide the paths to document files or directories
    documentPaths: documentPaths,

    // Optionally, specify the embedding model to use
    embeddingModel: "openai/text-embedding-3-small",

    // Optionally, specify search parameters
    searchKwargs: {
      k: 5, // Number of documents to retrieve
    },
  },
};

// Example of using the graph with the local memory store retriever
async function main() {
  try {
    // Initialize the graph with the configuration
    const thread = await graph.startThread();

    // Send a message to the graph
    const result = await graph.invoke(
      { messages: [{ role: "user", content: "Tell me about the shoes in the documents." }] },
      { configurable: config.configurable },
      { threadId: thread.id }
    );

    // Print the response
    console.log("Response:", result.messages[result.messages.length - 1].content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main();

/**
 * Notes:
 * 
 * 1. Replace the document paths with the actual paths to your document files or directories.
 * 2. The documents will be loaded at runtime when the retriever is created.
 * 3. Supported document types: DOCX.
 * 4. Each document will be associated with the specified user ID.
 * 5. The retriever will filter documents by user ID when retrieving.
 * 6. Make sure the document files are accessible to the application.
 */
