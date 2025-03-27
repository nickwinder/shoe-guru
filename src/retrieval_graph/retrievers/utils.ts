import {Document, DocumentInterface} from "@langchain/core/documents";
import * as https from "node:https";
import * as http from "node:http";
import {HtmlToTextTransformer} from "@langchain/community/document_transformers/html_to_text";
import {RecursiveCharacterTextSplitter} from "@langchain/textsplitters";
import crypto from "crypto";

/**
 * Reorders documents based on recency, giving a boost to more recent documents.
 *
 * @param docs - The documents to reorder
 * @param recencyWeight - The weight to give to recency (0-1)
 * @returns The reordered documents
 */
function reorderDocumentsByRecency(
    docs: DocumentInterface[],
    recencyWeight: number
): DocumentInterface[] {
    if (recencyWeight <= 0 || docs.length <= 1) {
        return docs;
    }

    // Clone the docs to avoid modifying the original array
    const reorderedDocs = [...docs];

    // Sort by date if available
    reorderedDocs.sort((a, b) => {
        // Get the dates from the metadata
        const dateA = a.metadata.createdAt ? new Date(a.metadata.createdAt).getTime() : 0;
        const dateB = b.metadata.createdAt ? new Date(b.metadata.createdAt).getTime() : 0;

        // If both documents have dates, sort by date
        if (dateA && dateB) {
            return dateB - dateA; // Most recent first
        }

        // If only one document has a date, prioritize it
        if (dateA) return -1;
        if (dateB) return 1;

        // If neither has a date, maintain original order
        return 0;
    });

    return reorderedDocs;
}

/**
 * Applies recency bias to the search results.
 *
 * @param docs - The documents to reorder
 * @param recencyWeight - The weight to give to recency (0-1)
 * @returns The reordered documents
 */
export function applyRecencyBias(docs: DocumentInterface[], recencyWeight: number): DocumentInterface[] {
    return reorderDocumentsByRecency(docs, recencyWeight);
}

/**
 * Fetches content from a URL and returns it as a string.
 *
 * @param url - The URL to fetch
 * @returns A promise that resolves to the content as a string
 */
export function fetchUrl(url: string): Promise<string> {
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
 * Parses a sitemap XML and returns the URLs.
 *
 * @param sitemapContent - The content of the sitemap
 * @returns An array of objects with url and lastmod properties
 */
export function parseSitemap(sitemapContent: string): { url: string; lastmod?: string }[] {
    const urls: { url: string; lastmod?: string }[] = [];

    // Simple regex-based parsing for sitemap XML
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    const locRegex = /<loc>(.*?)<\/loc>/;
    const lastmodRegex = /<lastmod>(.*?)<\/lastmod>/;

    let match;
    while ((match = urlRegex.exec(sitemapContent)) !== null) {
        const urlBlock = match[1];
        const locMatch = urlBlock.match(locRegex);
        const lastmodMatch = urlBlock.match(lastmodRegex);

        if (locMatch && locMatch[1]) {
            const url = locMatch[1].trim();
            const lastmod = lastmodMatch && lastmodMatch[1] ? lastmodMatch[1].trim() : undefined;

            urls.push({url, lastmod});
        }
    }

    return urls;
}

/**
 * Fetches the content of a URL and creates a document from it.
 *
 * @param url - The URL to fetch
 * @param lastmod - The last modified date of the URL
 * @returns A promise that resolves to an array of documents
 */
export async function fetchUrlContent(
    url: string,
    lastmod?: string
): Promise<Document[]> {
    try {
        // Fetch the URL content
        const content = await fetchUrl(url);

        // Create a hash of the content
        const contentHash = crypto.createHash('md5').update(content).digest('hex');

        // Create metadata for the document
        const metadata = {
            source: url,
            contentHash,
            lastmod,
            createdAt: new Date().toISOString(),
        };

        // Create a document from the content
        const doc = new Document({
            pageContent: content,
            metadata,
        });

        // If the content is HTML, convert it to text
        if (url.endsWith('.html') || content.includes('<!DOCTYPE html>') || content.includes('<html')) {
            const transformer = new HtmlToTextTransformer();
            const transformedDocs = await transformer.transformDocuments([doc]);

            // Split the document into smaller chunks if it's too large
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });

            const splitDocs = await textSplitter.splitDocuments(transformedDocs);

            // Add the URL as source to each split document
            return splitDocs.map(splitDoc => {
                splitDoc.metadata = {...metadata, ...splitDoc.metadata};
                return splitDoc;
            });
        }

        return [new Document({
            pageContent: content,
            metadata,
        })];
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return [];
    }
}
