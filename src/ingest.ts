import { RunnableConfig } from "@langchain/core/runnables";
import { ingestDocuments as ingestHNSWDocuments } from "./server/node/retrieval.js";
import { ingestDocuments as ingestPgVectorDocuments } from "./server/node/pgvector-retrieval.js";
import { ensureConfiguration } from "./app/api/lib/retrieval_graph/configuration.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Script to ingest documents from sitemaps and add them to the vector store.
 * This should be run separately from the main application.
 * 
 * Usage:
 * ```
 * npm run ingest
 * ```
 */
async function main() {
  try {
    // Create a configuration object
    const runnableConfig: RunnableConfig = {
      configurable: {
        retrieverProvider: 'pgvector',
      }
    };

    // Get the configuration
    const configuration = ensureConfiguration(runnableConfig);

    console.log("Starting document ingestion with the following configuration:");
    console.log(JSON.stringify(configuration, null, 2));


    // Run the ingestion process based on the configured provider
    if (configuration.retrieverProvider === "pgvector") {
      console.log("Using pgvector for document ingestion");
      await ingestPgVectorDocuments(runnableConfig);
    } else {
      console.log("Using HNSWLib for document ingestion");
      await ingestHNSWDocuments(runnableConfig);
    }

    console.log("Document ingestion completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during document ingestion:", error);
    process.exit(1);
  }
}

// Run the main function
main();
