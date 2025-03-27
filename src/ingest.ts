import { RunnableConfig } from "@langchain/core/runnables";
import { ingestDocuments as ingestHNSWDocuments } from "./retrieval_graph/retrieval.js";
import { ingestDocuments as ingestPgVectorDocuments } from "./retrieval_graph/pgvector-retrieval.js";
import { ensureConfiguration } from "./retrieval_graph/configuration.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Script to ingest documents from sitemaps and add them to the vector store.
 * This should be run separately from the main application.
 * 
 * Usage:
 * ```
 * npm run ingest -- --sitemapUrls=https://example.com/sitemap.xml
 * ```
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const config: Record<string, any> = {};

    for (const arg of args) {
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        if (key === 'sitemapUrls') {
          // Handle multiple sitemap URLs as a comma-separated list
          config[key] = value.split(',');
        } else {
          config[key] = value;
        }
      }
    }

    if (!config.sitemapUrls || config.sitemapUrls.length === 0) {
      throw new Error("Please provide at least one sitemap URL with --sitemapUrls=<url>");
    }

    console.log("Starting document ingestion with the following configuration:");
    console.log(JSON.stringify(config, null, 2));

    // Create a configuration object
    const runnableConfig: RunnableConfig = {
      configurable: {
        ...config,
        retrieverProvider: 'pgvector',
      }
    };

    // Get the configuration
    const configuration = ensureConfiguration(runnableConfig);

    // Run the ingestion process based on the configured provider
    if (configuration.retrieverProvider === "pgvector") {
      console.log("Using pgvector for document ingestion");
      await ingestPgVectorDocuments(runnableConfig);
    } else {
      console.log("Using HNSWLib for document ingestion");
      await ingestHNSWDocuments(runnableConfig);
    }

    console.log("Document ingestion completed successfully.");
  } catch (error) {
    console.error("Error during document ingestion:", error);
    process.exit(1);
  }
}

// Run the main function
main();
