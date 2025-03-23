import {z} from 'zod';
import Sitemapper from "sitemapper";
import {BaseChatModel} from "@langchain/core/language_models/chat_models";
import {initChatModel} from "langchain/chat_models/universal";

async function loadChatModel(
    fullySpecifiedName: string,
): Promise<BaseChatModel> {
    const index = fullySpecifiedName.indexOf("/");
    if (index === -1) {
        // If there's no "/", assume it's just the model
        return await initChatModel(fullySpecifiedName);
    } else {
        const provider = fullySpecifiedName.slice(0, index);
        const model = fullySpecifiedName.slice(index + 1);
        return await initChatModel(model, {modelProvider: provider});
    }
}

// Define schema for shoe data extraction
const BrandShoeDataSchema = z.object({
    model: z.string().describe("The model name of the shoe"),
    brand: z.string().describe("The brand name of the shoe"),
    price: z.number().nullable().describe("The price of the shoe in numeric format (no currency symbol)"),
    trueToSize: z.boolean().nullable().describe("Whether the shoe is true to size"),
    specifications: z.object({
        weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
        stackHeightMm: z.number().nullable().describe("The stack height of the shoe in millimeters"),
        heelToToeDropMm: z.number().nullable().describe("The heel-to-toe drop of the shoe in millimeters"),
        width: z.string().nullable().describe("The width of the shoe (e.g., narrow, standard, wide)"),
        depth: z.string().nullable().describe("The depth of the shoe (e.g., low, medium, high)")
    }),
    version: z.object({
        previousModel: z.string().nullable().describe("The previous model name of the shoe"),
        changes: z.string().nullable().describe("The changes made from the previous model"),
        releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)")
    }).nullable().describe("Version information for the shoe")
});

/**
 * Extract shoe data from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o')
 * @returns An array of extracted shoe data
 */
export async function extractShoeDataFromBrandSite(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof BrandShoeDataSchema>> {
    console.log(`Extracting shoe data using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(BrandShoeDataSchema);

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting structured data about shoes from HTML content. 
Your task is to analyze the HTML and identify all shoes present, extracting their details according to the specified schema.

For each shoe, extract:
1. Model name
2. Brand name
3. Price (as a number without currency symbols)
4. True to size (boolean indicating if the shoe fits true to size)
5. Specifications:
   - Weight in grams
   - Stack height in millimeters
   - Heel-to-toe drop in millimeters
   - Width (e.g., narrow, standard, wide)
   - Depth (e.g., low, medium, high)
6. Version information (if available):
   - Previous model name
   - Changes from previous model
   - Release date (in YYYY-MM-DD format)

Be thorough and extract all shoes present in the HTML. If a piece of information is not available, return null for that field.

Return the data in the structured format specified by the schema.`
            },
            {
                role: "user",
                content: `Extract shoe data from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error('Error extracting shoe data with LLM:', error);
        throw error;
    }
}

/**
 * Parse a sitemap XML to identify product pages
 *
 * @param sitemapUrl The URL of the sitemap to parse
 * @param productUrlPatterns Array of regex patterns to identify product pages
 * @param defaultType Default shoe type to assign if not specified in patterns
 * @returns Array of page objects with url and type properties
 */
export async function parseSitemap(
    sitemapUrl: string,
    productUrlPatterns: Array<{ pattern: RegExp, type: string }>,
): Promise<Array<{ url: string }>> {
    console.log(`Parsing sitemap: ${sitemapUrl}`);

    try {
        const sitemap = new Sitemapper({
            url: sitemapUrl,
            requestHeaders: {
                'User-Agent':
                    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:81.0) Gecko/20100101 Firefox/81.0',
            },
        });

        const {sites} = await sitemap.fetch()

        console.log(`${sites.length} pages found`)

        // Filter the sites to only include product pages
        const urls = sites.filter(site => productUrlPatterns.some(pattern => pattern.pattern.test(site)))

        console.log(`Found ${urls.length} product pages in sitemap`);
        return urls.map(url => ({url: url}));
    } catch (error) {
        console.error(`Error parsing sitemap ${sitemapUrl}:`, error);
        return [];
    }
}
