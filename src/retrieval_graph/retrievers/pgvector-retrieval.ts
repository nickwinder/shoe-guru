import {RunnableConfig} from "@langchain/core/runnables";
import {ensureConfiguration} from "../configuration";
import {Embeddings} from "@langchain/core/embeddings";
import {OpenAIEmbeddings} from "@langchain/openai";
import {PGVectorStore} from "@langchain/community/vectorstores/pgvector";
import {fetchUrl, fetchUrlContent, parseSitemap} from "./utils";
import crypto from "crypto";
import {DocumentInterface} from "@langchain/core/documents";

const TABLE_NAME = 'brr_embedding';

/**
 * Makes an embedding model based on the model name.
 *
 * @param modelName - The name of the embedding model
 * @returns An embedding model
 */
function makeTextEmbeddings(modelName: string): Embeddings {
    /**
     * Connect to the configured text encoder.
     */
    const index = modelName.indexOf("/");
    let provider, model;
    if (index === -1) {
        model = modelName;
        provider = "openai"; // Assume openai if no provider included
    } else {
        provider = modelName.slice(0, index);
        model = modelName.slice(index + 1);
    }
    switch (provider) {
        case "openai":
            return new OpenAIEmbeddings({model});
        default:
            throw new Error(`Unsupported embedding provider: ${provider}`);
    }
}

/**
 * Creates a PgVector instance for document retrieval without triggering ingestion.
 * This function only accesses the existing vector store.
 *
 * @param config - The configuration object
 * @returns A PGVectorStore instance
 */
export async function getVectorStore(
    config: RunnableConfig,
): Promise<PGVectorStore> {
    const configuration = ensureConfiguration(config);
    const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);

    // Create connection string from environment variables or use default from docker-compose
    const connectionString = process.env.DATABASE_URL ||
        "postgresql://user:password@localhost:5432/postgres";

    // Create a PGVectorStore instance
    return PGVectorStore.initialize(
        embeddingModel,
        {
            postgresConnectionOptions: {
                connectionString,
            },
            tableName: TABLE_NAME,
            columns: {
                idColumnName: "id",
                vectorColumnName: "embedding",
                contentColumnName: "pageContent",
                metadataColumnName: "metadata",
            },
        }
    );
}

/**
 * Ingests documents from sitemaps and adds them to the vector store.
 * This function should be called separately from the retriever.
 *
 * @param config - The configuration object
 * @returns A promise that resolves when ingestion is complete
 */
export async function ingestDocuments(
    config: RunnableConfig,
): Promise<void> {
    const configuration = ensureConfiguration(config);
    const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);

    // Create connection string from environment variables or use default from docker-compose
    const connectionString = process.env.DATABASE_URL ||
        "postgresql://user:password@localhost:5432/postgres";

    // Create a PGVectorStore instance
    const vectorStore = await PGVectorStore.initialize(
        embeddingModel,
        {
            postgresConnectionOptions: {
                connectionString,
            },
            tableName: TABLE_NAME,
            columns: {
                idColumnName: "id",
                vectorColumnName: "embedding",
                contentColumnName: "pageContent",
                metadataColumnName: "metadata",
            },
        }
    );

    // Process each sitemap URL
    for (const sitemapUrl of configuration.sitemapUrls || []) {
        try {
            console.log(`Processing sitemap: ${sitemapUrl}`);

            // Fetch the sitemap content
            const sitemapContent = await fetchUrl(sitemapUrl);

            // Parse the sitemap to get URLs
            const entries = parseSitemap(sitemapContent);
            console.log(`Found ${entries.length} URLs in sitemap`);

            // Process each URL in the sitemap
            await Promise.all(
                entries.map(async (entry) => {
                    try {
                        // Create a hash from the URL and last modified date
                        const hashInput = entry.lastmod ? `${entry.url}:${entry.lastmod}` : entry.url;
                        const urlHash = crypto
                            .createHash('md5')
                            .update(hashInput)
                            .digest('hex');

                        let skipUrl = false;
                        try {
                            // Use the vectorStore to check if any documents with this hash exist
                            const existingDocs = await vectorStore.asRetriever(1, {
                                contentHash: urlHash
                            }).invoke('');

                            if (existingDocs.length > 0) {
                                console.log(`Skipping URL: ${entry.url} - document with same hash already exists in vector store`);
                                skipUrl = true;
                            }
                        } catch (error) {
                            console.warn(`Error checking for existing document: ${error}. Will process URL.`);
                        }

                        if (skipUrl) {
                            return;
                        }

                        // Fetch the URL content and create documents
                        const urlDocuments = await fetchUrlContent(entry.url, entry.lastmod)
                            .then((docs) => docs.filter(doc => doc.pageContent))
                            .then((docs) => docs.map((doc) => {
                                return {
                                    pageContent: doc.pageContent,
                                    metadata: {
                                        ...doc.metadata,
                                        lastmod: entry.lastmod,
                                    }
                                }
                            }))

                        // Skip if no documents were created
                        if (urlDocuments.length === 0) {
                            return;
                        }

                        // Add documents to the vector store if there are any
                        if (urlDocuments.length > 0) {
                            await vectorStore.addDocuments(urlDocuments);
                            console.log(`Added ${urlDocuments.length} documents from ${entry.url} to vector store`);
                        }

                        console.log(`Processed ${urlDocuments.length} documents from ${entry.url}`);
                    } catch (error) {
                        console.error(`Error processing URL ${entry.url}:`, error);
                        // Continue with other URLs even if one fails
                    }
                })
            );

        } catch (error) {
            console.error(`Error processing sitemap ${sitemapUrl}:`, error);
            // Continue with other sitemaps even if one fails
        }
    }
}
