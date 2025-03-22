import {HNSWLib} from "@langchain/community/vectorstores/hnswlib";
import {RunnableConfig} from "@langchain/core/runnables";
import {ensureConfiguration} from "./configuration.js";
import {Embeddings} from "@langchain/core/embeddings";
import {OpenAIEmbeddings} from "@langchain/openai";
import {Document} from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";

import crypto from "crypto";
import {HtmlToTextTransformer} from "@langchain/community/document_transformers/html_to_text";

/**
 * Reranks documents based on recency, giving a boost to more recent documents.
 *
 * @param docs - The documents to rerank
 * @param recencyWeight - Weight to give to recency (0-1), where 1 means recency is the only factor
 * @returns Reranked documents with scores adjusted for recency
 */
function reorderDocumentsByRecency(docs: Document[], recencyWeight = 0.3): Document[] {
    if (!docs.length || recencyWeight <= 0) return docs;

    // Find the newest and oldest timestamps
    let newestTimestamp = 0;
    let oldestTimestamp = Date.now();
    let hasTimestamps = false;

    for (const doc of docs) {
        const timestamp = doc.metadata.lastmod_timestamp;
        if (timestamp) {
            hasTimestamps = true;
            newestTimestamp = Math.max(newestTimestamp, timestamp);
            oldestTimestamp = Math.min(oldestTimestamp, timestamp);
        }
    }

    // If no timestamps found or all documents have the same timestamp, return original order
    if (!hasTimestamps || newestTimestamp === oldestTimestamp) return docs;

    // Calculate a normalized recency score for each document and combine with original score
    const timeRange = newestTimestamp - oldestTimestamp;

    return [...docs].sort((a, b) => {
        const aTimestamp = a.metadata.lastmod_timestamp || oldestTimestamp;
        const bTimestamp = b.metadata.lastmod_timestamp || oldestTimestamp;

        // Normalize timestamps to 0-1 range
        const aRecencyScore = (aTimestamp - oldestTimestamp) / timeRange;
        const bRecencyScore = (bTimestamp - oldestTimestamp) / timeRange;

        // Get original scores if available (default to 1 if not)
        const aOriginalScore = a.metadata.score || 1;
        const bOriginalScore = b.metadata.score || 1;

        // Combine scores with weighting
        const aCombinedScore = (aOriginalScore * (1 - recencyWeight)) + (aRecencyScore * recencyWeight);
        const bCombinedScore = (bOriginalScore * (1 - recencyWeight)) + (bRecencyScore * recencyWeight);

        // Sort in descending order (higher scores first)
        return bCombinedScore - aCombinedScore;
    });
}

/**
 * Applies recency bias to the results from HNSWLib.
 *
 * @param docs - The documents to rerank
 * @param recencyWeight - Weight to give to recency (0-1)
 * @returns A promise that resolves to an array of relevant documents, reranked by recency
 */
export async function applyRecencyBias(docs: Document[], recencyWeight: number): Promise<Document[]> {
    // Apply recency bias
    return reorderDocumentsByRecency(docs, recencyWeight);
}

/**
 * Fetches content from a URL and returns it as a string.
 *
 * @param url - The URL to fetch
 * @returns A promise that resolves to the content as a string
 */
function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
                return;
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                resolve(data);
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Parses a sitemap XML and extracts URLs with their last modified dates.
 *
 * @param sitemapContent - The sitemap XML content as a string
 * @returns An array of objects containing URLs and their last modified dates
 */
function parseSitemap(sitemapContent: string): Array<{ url: string, lastmod?: string }> {
    const urlEntries: Array<{ url: string, lastmod?: string }> = [];

    // Extract URL entries from the sitemap
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    let urlMatch;

    while ((urlMatch = urlRegex.exec(sitemapContent)) !== null) {
        const urlEntry = urlMatch[1];

        // Extract the URL (loc)
        const locMatch = /<loc>(.*?)<\/loc>/i.exec(urlEntry);
        if (!locMatch) continue;

        const url = locMatch[1];

        // Extract the last modified date if available
        const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/i.exec(urlEntry);
        const lastmod = lastmodMatch ? lastmodMatch[1] : undefined;

        urlEntries.push({url, lastmod});
    }

    // If no URL entries were found, try extracting from sitemap index
    if (urlEntries.length === 0) {
        const locRegex = /<loc>(.*?)<\/loc>/g;
        let match;

        while ((match = locRegex.exec(sitemapContent)) !== null) {
            urlEntries.push({url: match[1]});
        }
    }

    return urlEntries;
}

/**
 * Fetches content from a URL, processes it, and converts it to Document objects.
 *
 * @param url - The URL to fetch
 * @param userId - User ID to associate with the document
 * @param lastmod - Optional last modified date from the sitemap
 * @returns A promise that resolves to an array of Document objects with the chunked URL content
 */
async function fetchUrlContent(url: string, userId: string, lastmod?: string): Promise<Document[]> {
    try {
        const content = await fetchUrl(url);

        const splitter = RecursiveCharacterTextSplitter.fromLanguage("html");
        const transformer = new HtmlToTextTransformer();

        // Extract a simple title from the URL
        const title = url.split('/').pop() || url;

        // Create a hash from the URL and last modified date
        const hashInput = lastmod ? `${url}:${lastmod}` : url;
        const contentHash = crypto
            .createHash('md5')
            .update(hashInput)
            .digest('hex');

        // Create metadata object with lastmod if available
        const metadata: Record<string, any> = {
            source: url,
            title: title,
            user_id: userId,
            content_hash: contentHash,
        };

        // Add lastmod to metadata if available
        if (lastmod) {
            metadata.lastmod = lastmod;
            // Convert to timestamp for easier comparison in retrievers
            try {
                metadata.lastmod_timestamp = new Date(lastmod).getTime();
            } catch (e) {
                console.warn(`Could not parse lastmod date: ${lastmod}`);
            }
        }

        // Create an initial document with the content
        const doc = new Document({
            pageContent: content,
            metadata,
        });

        const sequence = splitter.pipe(transformer);

        // Return the chunked documents
        return await sequence.invoke([doc]);
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        throw error;
    }
}

function getLocalFilePath(configuration: ReturnType<typeof ensureConfiguration>): string {
    const {userId, embeddingModel: embeddingModelName, sitemapUrls} = configuration;

    // Create a deterministic name for the vector store based on configuration
    // Sort arrays to ensure consistent order regardless of input order
    const sortedSitemapUrls = [...(sitemapUrls || [])].sort();

    // Create a configuration hash for naming
    const configHash = crypto
        .createHash('md5')
        .update(JSON.stringify({
            embeddingModel: embeddingModelName,
            sitemapUrls: sortedSitemapUrls
        }))
        .digest('hex')
        .substring(0, 10); // Use first 10 chars for brevity

    // Create base directory for user
    const userBaseDir = path.join(process.cwd(), "vector_store", userId);
    if (!fs.existsSync(userBaseDir)) {
        fs.mkdirSync(userBaseDir, {recursive: true});
    }

    // Create specific directory for this configuration
    return path.join(userBaseDir, configHash);
}

/**
 * Creates or loads a file-based HNSWLib vector store.
 *
 * @param configuration - Configuration object
 * @param embeddingModel - Embedding model to use
 * @returns An HNSWLib vector store instance
 */
async function getOrCreateHNSWLib(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings
): Promise<HNSWLib> {
    const {embeddingModel: embeddingModelName, sitemapUrls} = configuration;

    const sortedSitemapUrls = [...(sitemapUrls || [])].sort();
    // Create a configuration hash for naming
    const configHash = crypto
        .createHash('md5')
        .update(JSON.stringify({
            embeddingModel: embeddingModelName,
            sitemapUrls: sortedSitemapUrls
        }))
        .digest('hex')
        .substring(0, 10); // Use first 10 chars for brevity


    // Create specific directory for this configuration
    const storageDir = getLocalFilePath(configuration)
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, {recursive: true});
    }

    // Create a config file to track what configuration created this vector store
    const configFilePath = path.join(storageDir, 'config.json');
    const configData = {
        embeddingModel: embeddingModelName,
        sitemapUrls: sortedSitemapUrls,
        created: new Date().toISOString()
    };

    // Check if configuration has changed
    let configChanged = false;
    if (fs.existsSync(configFilePath)) {
        try {
            const existingConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
            // Compare only the relevant parts of the configuration
            const existingConfigHash = crypto
                .createHash('md5')
                .update(JSON.stringify({
                    documentPaths: existingConfig.documentPaths,
                    embeddingModel: existingConfig.embeddingModel,
                    sitemapUrls: existingConfig.sitemapUrls
                }))
                .digest('hex')
                .substring(0, 10);

            if (existingConfigHash !== configHash) {
                console.log('Configuration has changed, recreating vector store');
                configChanged = true;

                // Remove existing vector store files
                if (fs.existsSync(path.join(storageDir, "hnswlib.index"))) {
                    fs.unlinkSync(path.join(storageDir, "hnswlib.index"));
                }
                if (fs.existsSync(path.join(storageDir, "docstore.json"))) {
                    fs.unlinkSync(path.join(storageDir, "docstore.json"));
                }
            }
        } catch (error) {
            console.error('Error reading existing config file, recreating vector store:', error);
            configChanged = true;
        }
    }

    // Write the current configuration to the config file
    fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2));

    let vectorStore: HNSWLib;
    if (fs.existsSync(path.join(storageDir, "hnswlib.index"))) {
        vectorStore = await HNSWLib.load(storageDir, embeddingModel);
        if (configChanged) {
            console.log(`Configuration changed, creating new vector store`);
            await vectorStore.delete({directory: storageDir})
        }
    } else {
        // Create a memory vector store from the documents
        vectorStore = await HNSWLib.fromDocuments(
            [{pageContent: "dummy", metadata: {}}],
            embeddingModel
        );
        await vectorStore.save(storageDir);
    }

    return vectorStore;
}


/**
 * Fetches documents from sitemap URLs and adds them to the HNSWLib vector store.
 *
 * @param configuration - Configuration object
 * @param vectorStore - The vector store to add documents to
 * @param embeddingModel - The embedding model to use
 * @returns A promise that resolves when all documents have been processed
 */
async function addDocumentsFromSitemaps(
    configuration: ReturnType<typeof ensureConfiguration>,
    vectorStore: HNSWLib,
    embeddingModel: Embeddings,
): Promise<void> {
    if (!configuration.sitemapUrls || configuration.sitemapUrls.length === 0) {
        return;
    }

    // Get the storage directory for this configuration
    const storageDir = getLocalFilePath(configuration);
    const sitemapMetadataPath = path.join(storageDir, 'sitemap_metadata.json');

    // Load existing sitemap metadata if available
    let sitemapMetadata: Record<string, { lastModified: string, lastIngestionDate: string }> = {};
    if (fs.existsSync(sitemapMetadataPath)) {
        try {
            sitemapMetadata = JSON.parse(fs.readFileSync(sitemapMetadataPath, 'utf8'));
        } catch (error) {
            console.warn('Error reading sitemap metadata, will recreate:', error);
        }
    }

    // Process each sitemap URL
    for (const sitemapUrl of configuration.sitemapUrls) {
        try {
            console.log(`Checking sitemap: ${sitemapUrl}`);

            // Fetch the sitemap content
            const sitemapContent = await fetchUrl(sitemapUrl);

            // Calculate a hash of the sitemap content to detect changes
            const sitemapHash = crypto
                .createHash('md5')
                .update(sitemapContent)
                .digest('hex');

            const currentDate = new Date().toISOString();

            // Check if we've processed this sitemap before and if it has changed
            if (sitemapMetadata[sitemapUrl] && 
                sitemapMetadata[sitemapUrl].lastModified === sitemapHash) {
                console.log(`Sitemap ${sitemapUrl} hasn't changed since last ingestion on ${sitemapMetadata[sitemapUrl].lastIngestionDate}. Skipping processing.`);
                continue;
            }

            console.log(`Processing sitemap: ${sitemapUrl} - content has changed or first time processing`);

            // Parse the sitemap to extract URLs and lastmod dates
            const urlEntries = parseSitemap(sitemapContent);
            console.log(`Found ${urlEntries.length} URLs in sitemap: ${sitemapUrl}`);

            // Process all URL entries in the sitemap concurrently
            await Promise.all(
                urlEntries.map(async (entry) => {
                    try {
                        // Create a hash from the URL and last modified date
                        const hashInput = entry.lastmod ? `${entry.url}:${entry.lastmod}` : entry.url;
                        const urlHash = crypto
                            .createHash('md5')
                            .update(hashInput)
                            .digest('hex');

                        // Check if a document with the same hash already exists in the vector store
                        let skipUrl = false;
                        try {
                            // Use the vectorStore to check if any documents with this hash exist
                            const existingDocs = await vectorStore.asRetriever(1, (doc) => {
                                return doc.metadata.content_hash === urlHash;
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

                        console.log(`Processing URL: ${entry.url}${entry.lastmod ? ` (Last modified: ${entry.lastmod})` : ''}`);

                        // Fetch and process the URL content, passing the lastmod if available
                        const urlDocuments = await fetchUrlContent(entry.url, configuration.userId, entry.lastmod).then((docs) => docs.filter(doc => doc.pageContent));

                        if (urlDocuments.length > 0) {
                            // Get the vector store and add documents
                            const vectorStore = await getHNSWLib(configuration, embeddingModel);
                            await vectorStore.addDocuments(urlDocuments);

                            // Always save after adding documents
                            console.log(`Saving vector store to local storage`);
                            await vectorStore.save(storageDir);
                        }

                        console.log(`Added ${urlDocuments.length} documents from URL: ${entry.url}`);
                    } catch (error) {
                        console.error(`Error processing URL ${entry.url}:`, error);
                        // Continue with other URLs even if one fails
                    }
                })
            );

            // Update the metadata for this sitemap
            sitemapMetadata[sitemapUrl] = {
                lastModified: sitemapHash,
                lastIngestionDate: currentDate
            };

            // Save the updated metadata
            fs.writeFileSync(sitemapMetadataPath, JSON.stringify(sitemapMetadata, null, 2));

        } catch (error) {
            console.error(`Error processing sitemap ${sitemapUrl}:`, error);
            // Continue with other sitemaps even if one fails
        }
    }
}

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
 * Gets an HNSWLib instance with the specified configuration and filter.
 */
async function getHNSWLib(configuration: ReturnType<typeof ensureConfiguration>, embeddingModel: Embeddings): Promise<HNSWLib> {
    return getOrCreateHNSWLib(configuration, embeddingModel);
}

/**
 * Creates an HNSWLib instance for document retrieval without triggering ingestion.
 * This function only accesses the existing vector store and will fail if it doesn't exist.
 *
 * @param config - The configuration object
 * @returns An HNSWLib instance
 * @throws Error if the vector store doesn't exist or is empty
 */
export async function getVectorStore(
    config: RunnableConfig,
): Promise<HNSWLib> {
    const configuration = ensureConfiguration(config);
    const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);

    const userId = configuration.userId;
    if (!userId) {
        throw new Error("Please provide a valid user_id in the configuration.");
    }

    // Get the storage directory for this configuration
    const storageDir = getLocalFilePath(configuration);

    // Check if vector store exists
    if (!fs.existsSync(path.join(storageDir, "hnswlib.index")) || 
        !fs.existsSync(path.join(storageDir, "docstore.json"))) {
        throw new Error("Vector store not found. Please run the ingestion script first.");
    }

    // Load the existing vector store
    const vectorStore = await HNSWLib.load(storageDir, embeddingModel);

    // Check if the vector store is empty
    try {
        const testQuery = await vectorStore.similaritySearch("test", 1);
        if (testQuery.length === 0) {
            throw new Error("Vector store is empty. Please run the ingestion script first.");
        }
    } catch (error: unknown) {
        if ((error as Error).message === "Vector store is empty. Please run the ingestion script first.") {
            throw error;
        }
        throw new Error(`Error accessing vector store: ${(error as Error).message}`);
    }

    return vectorStore;
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

    const userId = configuration.userId;
    if (!userId) {
        throw new Error("Please provide a valid user_id in the configuration.");
    }

    const vectorStore = await getHNSWLib(configuration, embeddingModel);
    await addDocumentsFromSitemaps(configuration, vectorStore, embeddingModel);

    console.log("Document ingestion completed successfully.");
}
