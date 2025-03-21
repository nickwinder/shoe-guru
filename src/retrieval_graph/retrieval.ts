import {Client} from "@elastic/elasticsearch";
import {ElasticVectorSearch} from "@langchain/community/vectorstores/elasticsearch";
import {HNSWLib} from "@langchain/community/vectorstores/hnswlib";
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {RunnableConfig} from "@langchain/core/runnables";
import {VectorStoreRetriever} from "@langchain/core/vectorstores";
import {MongoDBAtlasVectorSearch} from "@langchain/mongodb";
import {PineconeStore} from "@langchain/pinecone";
import {MongoClient} from "mongodb";
import {ensureConfiguration} from "./configuration.js";
import {Pinecone as PineconeClient} from "@pinecone-database/pinecone";
import {Embeddings} from "@langchain/core/embeddings";
import {CohereEmbeddings} from "@langchain/cohere";
import {OpenAIEmbeddings} from "@langchain/openai";
import {Document} from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import {DocxLoader} from "@langchain/community/document_loaders/fs/docx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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
 * Parses a sitemap XML and extracts URLs.
 *
 * @param sitemapContent - The sitemap XML content as a string
 * @returns An array of URLs found in the sitemap
 */
function parseSitemap(sitemapContent: string): string[] {
    const urls: string[] = [];

    // Simple regex-based extraction of URLs from sitemap
    // This handles both standard sitemaps and sitemap indexes
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;

    while ((match = locRegex.exec(sitemapContent)) !== null) {
        urls.push(match[1]);
    }

    return urls;
}

/**
 * Fetches content from a URL, processes it, and converts it to Document objects.
 *
 * @param url - The URL to fetch
 * @param userId - User ID to associate with the document
 * @returns A promise that resolves to an array of Document objects with the chunked URL content
 */
async function fetchUrlContent(url: string, userId: string): Promise<Document[]> {
    try {
        const content = await fetchUrl(url);

        // Create a simple text splitter for chunking
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        // Extract a simple title from the URL
        const title = url.split('/').pop() || url;

        // Create an initial document with the content
        const doc = new Document({
            pageContent: content,
            metadata: {
                source: url,
                title: title,
                user_id: userId,
            },
        });

        // Split the document into chunks
        const chunkedDocs = await textSplitter.splitDocuments([doc]);

        // Return the chunked documents
        return chunkedDocs;
    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        throw error;
    }
}

/**
 * Loads a DOCX file, chunks it, and converts it to Document objects.
 *
 * @param filePath - Path to the DOCX file
 * @param userId - User ID to associate with the document
 * @returns An array of Document objects with the chunked DOCX content
 */
async function loadDocxFile(filePath: string, userId: string): Promise<Document[]> {
    try {
        // Check if the file exists before trying to read it
        if (!fs.existsSync(filePath)) {
            throw new Error(`DOCX file does not exist: ${filePath}`);
        }

        // Use LangChain's DocxLoader to load the document
        const loader = new DocxLoader(filePath);
        const docs = await loader.load();

        // Create a text splitter for chunking
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        // Split the document into chunks
        const chunkedDocs = await textSplitter.splitDocuments(docs);

        // Add user_id and other metadata to each document
        return chunkedDocs.map(doc => {
            return new Document({
                pageContent: doc.pageContent,
                metadata: {
                    ...doc.metadata,
                    title: path.basename(filePath, path.extname(filePath)),
                    user_id: userId,
                },
            });
        });
    } catch (error) {
        console.error(`Error loading DOCX file ${filePath}:`, error);
        throw error;
    }
}

/**
 * Processes a directory and returns all supported document files in it.
 *
 * @param dirPath - Path to the directory
 * @returns Array of paths to supported document files
 */
function getDocumentFilesFromDirectory(dirPath: string): string[] {
    try {
        if (!fs.existsSync(dirPath)) {
            throw new Error(`Directory does not exist: ${dirPath}`);
        }

        if (!fs.statSync(dirPath).isDirectory()) {
            throw new Error(`Path is not a directory: ${dirPath}`);
        }

        // List of supported file extensions
        const supportedExtensions = ['.docx'];

        const files = fs.readdirSync(dirPath);
        return files
            .filter(file => {
                const extension = path.extname(file).toLowerCase();
                return supportedExtensions.includes(extension);
            })
            .map(file => path.join(dirPath, file));
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error);
        throw error;
    }
}

/**
 * Creates a memory vector store retriever from document files.
 *
 * @param configuration - Configuration object
 * @param embeddingModel - Embedding model to use
 * @returns A VectorStoreRetriever for the memory vector store
 */
async function makeLocalMemoryRetriever(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
    const {documentPaths, userId} = configuration;

    if (!documentPaths || documentPaths.length === 0) {
        throw new Error("No document paths provided for local memory retriever");
    }

    // Load all document files
    const documents: Document[] = [];
    const filesToProcess: string[] = [];

    // Process each path (could be a file or directory)
    for (const docPath of documentPaths) {
        try {
            // Check if the path exists
            if (!fs.existsSync(docPath)) {
                console.warn(`Path does not exist: ${docPath}`);
                continue;
            }

            // Check if the path is a directory
            if (fs.statSync(docPath).isDirectory()) {
                // Get all supported document files from the directory
                const documentFiles = getDocumentFilesFromDirectory(docPath);
                filesToProcess.push(...documentFiles);
            } else {
                // It's a file, add it to the list
                filesToProcess.push(docPath);
            }
        } catch (error) {
            console.error(`Error processing path ${docPath}:`, error);
            // Continue with other paths even if one fails
        }
    }

    // Process all files
    for (const filePath of filesToProcess) {
        try {
            const extension = path.extname(filePath).toLowerCase();

            if (extension === '.docx') {
                const docxDocuments = await loadDocxFile(filePath, userId);
                documents.push(...docxDocuments);
            } else {
                console.warn(`Unsupported file type: ${filePath}`);
                continue;
            }
        } catch (error) {
            console.error(`Error loading file ${filePath}:`, error);
            // Continue with other files even if one fails
        }
    }

    if (documents.length === 0) {
        console.warn("No documents were successfully loaded from the provided paths");
        // Create an empty memory vector store
        const vectorStore = new MemoryVectorStore(embeddingModel);

        const searchKwargs = configuration.searchKwargs || {};
        const filter: Record<string, unknown> = {
            ...searchKwargs,
            user_id: configuration.userId,
        };

        return vectorStore.asRetriever({
            filter: (doc) => {
                for (const key in filter) {
                    if (doc.metadata[key] !== filter[key]) {
                        return false;
                    }
                }
                return true
            }
        });
    }

    // Create a memory vector store from the documents
    const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddingModel
    );

    const searchKwargs = configuration.searchKwargs || {};
    const filter: Record<string, unknown> = {
        ...searchKwargs,
        user_id: configuration.userId,
    };

    return vectorStore.asRetriever({
        filter: (doc) => {
            for (const key in filter) {
                if (doc.metadata[key] !== filter[key]) {
                    return false;
                }
            }
            return true
        }
    });
}

/**
 * Creates a file-based vector store retriever from document files using HNSWLib.
 *
 * @param configuration - Configuration object
 * @param embeddingModel - Embedding model to use
 * @returns A VectorStoreRetriever for the file-based vector store
 */
async function makeLocalFileRetriever(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
    const {documentPaths, userId, embeddingModel: embeddingModelName, sitemapUrls} = configuration;

    if (!documentPaths || documentPaths.length === 0) {
        throw new Error("No document paths provided for local file retriever");
    }

    // Create a deterministic name for the vector store based on configuration
    // Sort arrays to ensure consistent order regardless of input order
    const sortedDocPaths = [...documentPaths].sort();
    const sortedSitemapUrls = [...(sitemapUrls || [])].sort();

    // Create a configuration hash for naming
    const configHash = require('crypto')
        .createHash('md5')
        .update(JSON.stringify({
            documentPaths: sortedDocPaths,
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
    const storageDir = path.join(userBaseDir, configHash);
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, {recursive: true});
    }

    // Create a config file to track what configuration created this vector store
    const configFilePath = path.join(storageDir, 'config.json');
    const configData = {
        documentPaths: sortedDocPaths,
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
            const existingConfigHash = require('crypto')
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

    // Load all document files
    const documents: Document[] = [];
    const filesToProcess: string[] = [];

    // Process each path (could be a file or directory)
    for (const docPath of documentPaths) {
        try {
            // Check if the path exists
            if (!fs.existsSync(docPath)) {
                console.warn(`Path does not exist: ${docPath}`);
                continue;
            }

            // Check if the path is a directory
            if (fs.statSync(docPath).isDirectory()) {
                // Get all supported document files from the directory
                const documentFiles = getDocumentFilesFromDirectory(docPath);
                filesToProcess.push(...documentFiles);
            } else {
                // It's a file, add it to the list
                filesToProcess.push(docPath);
            }
        } catch (error) {
            console.error(`Error processing path ${docPath}:`, error);
            // Continue with other paths even if one fails
        }
    }

    // Process all files
    for (const filePath of filesToProcess) {
        try {
            const extension = path.extname(filePath).toLowerCase();

            if (extension === '.docx') {
                const docxDocuments = await loadDocxFile(filePath, userId);
                documents.push(...docxDocuments);
            } else {
                console.warn(`Unsupported file type: ${filePath}`);
                continue;
            }
        } catch (error) {
            console.error(`Error loading file ${filePath}:`, error);
            // Continue with other files even if one fails
        }
    }

    let vectorStore: HNSWLib;

    // Check if we have an existing index and configuration hasn't changed
    if (fs.existsSync(path.join(storageDir, "hnswlib.index")) && !configChanged) {
        console.log(`Loading existing vector store from ${storageDir}`);
        // Load the existing vector store
        vectorStore = await HNSWLib.load(storageDir, embeddingModel);

        // Add new documents if any
        if (documents.length > 0) {
            console.log(`Adding ${documents.length} new documents to existing vector store`);
            await vectorStore.addDocuments(documents);
            // Save the updated vector store
            await vectorStore.save(storageDir);
        }
    } else {
        // Either no existing index or configuration has changed
        if (documents.length === 0) {
            console.warn("No documents were successfully loaded from the provided paths");
            // Create an empty HNSWLib vector store
            vectorStore = new HNSWLib(embeddingModel, {
                space: "cosine",
                numDimensions: 1536, // Default for OpenAI embeddings
            });
        } else {
            // Create a new HNSWLib vector store from the documents
            if (configChanged) {
                console.log(`Configuration changed, creating new vector store with ${documents.length} documents`);
            } else {
                console.log(`Creating new vector store with ${documents.length} documents`);
            }
            vectorStore = await HNSWLib.fromDocuments(documents, embeddingModel);
            // Save the vector store
            await vectorStore.save(storageDir);
        }
    }

    const searchKwargs = configuration.searchKwargs || {};
    const filter: Record<string, unknown> = {
        ...searchKwargs,
        user_id: configuration.userId,
    };

    return vectorStore.asRetriever({
        filter: (doc) => {
            for (const key in filter) {
                if (doc.metadata[key] !== filter[key]) {
                    return false;
                }
            }
            return true
        }
    });
}

async function makeElasticRetriever(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
    const elasticUrl = process.env.ELASTICSEARCH_URL;
    if (!elasticUrl) {
        throw new Error("ELASTICSEARCH_URL environment variable is not defined");
    }

    let auth: { username: string; password: string } | { apiKey: string };
    if (configuration.retrieverProvider === "elastic-local") {
        const username = process.env.ELASTICSEARCH_USER;
        const password = process.env.ELASTICSEARCH_PASSWORD;
        if (!username || !password) {
            throw new Error(
                "ELASTICSEARCH_USER or ELASTICSEARCH_PASSWORD environment variable is not defined",
            );
        }
        auth = {username, password};
    } else {
        const apiKey = process.env.ELASTICSEARCH_API_KEY;
        if (!apiKey) {
            throw new Error(
                "ELASTICSEARCH_API_KEY environment variable is not defined",
            );
        }
        auth = {apiKey};
    }

    const client = new Client({
        node: elasticUrl,
        auth,
    });

    const vectorStore = new ElasticVectorSearch(embeddingModel, {
        client,
        indexName: "langchain_index",
    });
    const searchKwargs = configuration.searchKwargs || {};
    const filter = {
        ...searchKwargs,
        user_id: configuration.userId,
    };

    return vectorStore.asRetriever({filter});
}

async function makePineconeRetriever(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
        throw new Error("PINECONE_INDEX_NAME environment variable is not defined");
    }
    const pinecone = new PineconeClient();
    const pineconeIndex = pinecone.Index(indexName!);
    const vectorStore = await PineconeStore.fromExistingIndex(embeddingModel, {
        pineconeIndex,
    });

    const searchKwargs = configuration.searchKwargs || {};
    const filter = {
        ...searchKwargs,
        user_id: configuration.userId,
    };

    return vectorStore.asRetriever({filter});
}

async function makeMongoDBRetriever(
    configuration: ReturnType<typeof ensureConfiguration>,
    embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is not defined");
    }
    const client = new MongoClient(process.env.MONGODB_URI);
    const namespace = `langgraph_retrieval_agent.${configuration.userId}`;
    const [dbName, collectionName] = namespace.split(".");
    const collection = client.db(dbName).collection(collectionName);
    const vectorStore = new MongoDBAtlasVectorSearch(embeddingModel, {
        collection: collection,
        textKey: "text",
        embeddingKey: "embedding",
        indexName: "vector_index",
    });
    const searchKwargs = {...configuration.searchKwargs};
    searchKwargs.preFilter = {
        ...searchKwargs.preFilter,
        user_id: {$eq: configuration.userId},
    };
    return vectorStore.asRetriever({filter: searchKwargs});
}

/**
 * Fetches documents from sitemap URLs.
 *
 * @param sitemapUrls - Array of sitemap URLs
 * @param userId - User ID to associate with the documents
 * @returns A promise that resolves to an array of Document objects
 */
async function fetchDocumentsFromSitemaps(
    sitemapUrls: string[],
    userId: string
): Promise<Document[]> {
    if (!sitemapUrls || sitemapUrls.length === 0) {
        return [];
    }

    const documents: Document[] = [];

    // Process each sitemap URL
    for (const sitemapUrl of sitemapUrls) {
        try {
            console.log(`Processing sitemap: ${sitemapUrl}`);

            // Fetch the sitemap content
            const sitemapContent = await fetchUrl(sitemapUrl);

            // Parse the sitemap to extract URLs
            const urls = parseSitemap(sitemapContent);
            console.log(`Found ${urls.length} URLs in sitemap: ${sitemapUrl}`);

            // Process each URL in the sitemap
            for (const url of urls) {
                try {
                    console.log(`Processing URL: ${url}`);

                    // Fetch and process the URL content
                    const urlDocuments = await fetchUrlContent(url, userId);

                    // Add the documents to our collection
                    documents.push(...urlDocuments);

                    console.log(`Added ${urlDocuments.length} documents from URL: ${url}`);
                } catch (error) {
                    console.error(`Error processing URL ${url}:`, error);
                    // Continue with other URLs even if one fails
                }
            }
        } catch (error) {
            console.error(`Error processing sitemap ${sitemapUrl}:`, error);
            // Continue with other sitemaps even if one fails
        }
    }

    return documents;
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
        case "cohere":
            return new CohereEmbeddings({model});
        default:
            throw new Error(`Unsupported embedding provider: ${provider}`);
    }
}

export async function makeRetriever(
    config: RunnableConfig,
): Promise<VectorStoreRetriever> {
    const configuration = ensureConfiguration(config);
    const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);

    const userId = configuration.userId;
    if (!userId) {
        throw new Error("Please provide a valid user_id in the configuration.");
    }

    // Check if we have sitemap URLs to process
    const sitemapDocuments = await fetchDocumentsFromSitemaps(configuration.sitemapUrls, userId);

    // Create the retriever based on the provider
    let retriever: VectorStoreRetriever;

    switch (configuration.retrieverProvider) {
        case "elastic":
        case "elastic-local":
            retriever = await makeElasticRetriever(configuration, embeddingModel);
            break;
        case "pinecone":
            retriever = await makePineconeRetriever(configuration, embeddingModel);
            break;
        case "mongodb":
            retriever = await makeMongoDBRetriever(configuration, embeddingModel);
            break;
        case "local-memory":
            retriever = await makeLocalMemoryRetriever(configuration, embeddingModel);
            break;
        case "local-file":
            retriever = await makeLocalFileRetriever(configuration, embeddingModel);
            break;
        default:
            throw new Error(
                `Unrecognized retrieverProvider in configuration: ${configuration.retrieverProvider}`,
            );
    }

    // Add documents from sitemaps if any
    if (sitemapDocuments.length > 0) {
        console.log(`Adding ${sitemapDocuments.length} documents from sitemaps to the retriever`);
        await retriever.addDocuments(sitemapDocuments);
    }

    return retriever;
}
