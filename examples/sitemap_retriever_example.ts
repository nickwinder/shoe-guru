import { graph } from "../src/retrieval_graph/graph.js";

/**
 * Example of using sitemap URLs with the Shoe Guru graph.
 * 
 * This example shows how to configure the graph to use sitemap URLs
 * to fetch and index content from URLs in a sitemap at runtime.
 * The sitemap functionality can be used with any retriever provider.
 */

// Define the URLs to your sitemaps
const sitemapUrls = [
  "https://example.com/sitemap.xml",
  // Add more sitemap URLs as needed
];

// Configure the graph with sitemap URLs and a retriever provider
const config = {
  configurable: {
    // Specify a user ID to associate with the documents
    userId: "user123",

    // Use any retriever provider (e.g., local-memory, elastic, etc.)
    retrieverProvider: "local-memory",

    // Provide the URLs to sitemaps - can be used with any retriever provider
    sitemapUrls: sitemapUrls,

    // Optionally, specify the embedding model to use
    embeddingModel: "openai/text-embedding-3-small",

    // Optionally, specify search parameters
    searchKwargs: {
      k: 5, // Number of documents to retrieve
    },
  },
};

// Example of using the graph with the sitemap retriever
async function main() {
  try {
    // Initialize the graph with the configuration
    const thread = await graph.startThread();

    // Send a message to the graph
    const result = await graph.invoke(
      { messages: [{ role: "user", content: "Tell me about the content from the sitemap URLs." }] },
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
 * 1. Replace the sitemap URLs with the actual URLs to your sitemaps.
 * 2. You can use any retriever provider with sitemap URLs - they are not tied to a specific provider.
 * 3. The content from URLs in the sitemaps will be loaded at runtime when the retriever is created.
 * 4. Each URL's content will be processed, chunked, and added to the vector store.
 * 5. Each document will be associated with the specified user ID.
 * 6. The retriever will filter documents by user ID when retrieving.
 * 7. Make sure the sitemap URLs are accessible to the application.
 * 8. For large sitemaps, the initial loading process may take some time.
 * 9. You can combine sitemap URLs with other document sources like local files.
 */
