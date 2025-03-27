import axios from 'axios';
import {PrismaClient} from '@prisma/client';
import {initializeDatabase} from './init-db';
import {z} from 'zod';
import {loadChatModel} from "../retrieval_graph/utils";
import Sitemapper from "sitemapper";
import {convert} from "html-to-text";

/**
 * Helper function to convert string "null" values to undefined
 * @param value The value to check
 * @returns undefined if the value is already undefined, contains "null", or equals "null", otherwise the original value
 */
function nullStringToUndefined<T>(value: T): T | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'string' && value.includes('null')) return undefined;
    return value;
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Define schemas for shoe data extraction
// Basic shoe information schema
const BasicShoeInfoSchema = z.object({
    model: z.string().describe("The model name of the shoe. This should not include the gender the shoe is made for."),
    brand: z.string().describe("The brand name of the shoe"),
});

// Shoe specifications schema
const ShoeSpecificationsSchema = z.object({
    forefootStackHeightMm: z.number().nullable().describe("The forefoot stack height of the shoe in millimeters"),
    heelStackHeightMm: z.number().nullable().describe("The heel stack height of the shoe in millimeters"),
    width: z.string().nullable().describe("The width of the shoe (e.g., narrow, standard, wide)"),
    depth: z.string().nullable().describe("The depth of the shoe (e.g., low, medium, high)")
});

// Shoe version information schema
const ShoeVersionInfoSchema = z.object({
    intendedUse: z.string().nullable().describe('The intended use of the shoe e.g. road, trail'),
    previousModel: z.string().nullable().describe("The previous model name of the shoe"),
    nextModel: z.string().nullable().describe("The next model name of the shoe"),
    changes: z.string().nullable().describe("The changes made from the previous model"),
    releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)")
});

// Shoe gender-specific information schema
const ShoeGenderInfoSchema = z.object({
    gender: z.enum(['male', 'female', 'none']).describe('The gender the shoe is made for'),
    price: z.number().nullable().describe("The price of the shoe in numeric format (no currency symbol)"),
    weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
});

// Combined schema for backward compatibility
const BrandShoeDataSchema = z.object({
    model: z.string().describe("The model name of the shoe. This should not include the gender the shoe is made for, nor the version number or model type like mid or luxe."),
    brand: z.string().describe("The brand name of the shoe"),
    specifications: ShoeSpecificationsSchema,
    version: z.object({
        gender: z.enum(['male', 'female', 'none']).describe('The gender the shoe is made for'),
        price: z.number().nullable().describe("The price of the shoe in numeric format (no currency symbol)"),
        weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
        intendedUse: z.string().nullable().describe('The intended use of the shoe e.g. road, trail'),
        previousModel: z.string().nullable().describe("The previous model name of the shoe"),
        nextModel: z.string().nullable().describe("The next model name of the shoe"),
        changes: z.string().nullable().describe("The changes made from the previous model"),
        releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)"),
        url: z.string().describe("The URL of the shoe")
    }).describe("Version information for the shoe")
});

/**
 * Extract basic shoe information from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Basic shoe information (model, brand)
 */
async function extractBasicShoeInfo(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof BasicShoeInfoSchema>> {
    console.log(`Extracting basic shoe information using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(BasicShoeInfoSchema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting basic shoe information from HTML content.
Your task is to analyze the HTML and identify the model name and brand of the shoe.

Extract:
1. Model name
2. Brand name

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct model name and brand.
The model name should not include the gender the shoe is made for.`,
            },
            {
                role: "user",
                content: `Extract the model name and brand from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error('Error extracting basic shoe information with LLM:', error);
        throw error;
    }
}

/**
 * Extract shoe specifications from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Shoe specifications (forefootStackHeightMm, heelStackHeightMm, width, depth)
 */
async function extractShoeSpecifications(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof ShoeSpecificationsSchema>> {
    console.log(`Extracting shoe specifications using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(ShoeSpecificationsSchema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting shoe specifications from HTML content.
Your task is to analyze the HTML and identify the technical specifications of the shoe.

Extract:
1. Forefoot stack height in millimeters
2. Heel stack height in millimeters
3. Width (e.g., narrow, standard, wide)
4. Depth (e.g., low, medium, high)

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct specifications.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For numeric fields like forefoot stack height and heel stack height, only provide a value if you can find a specific number in the content. Otherwise, return null.
Note: If you only find a single stack height value without specifying forefoot or heel, try to determine which it is. If you find a drop value and one of the stack heights, you can calculate the other.`
            },
            {
                role: "user",
                content: `Extract the specifications from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error('Error extracting shoe specifications with LLM:', error);
        throw error;
    }
}

/**
 * Extract shoe version information from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Shoe version information
 */
async function extractShoeVersionInfo(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof ShoeVersionInfoSchema>> {
    console.log(`Extracting shoe version information using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(ShoeVersionInfoSchema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting shoe information from HTML content.
Your task is to analyze the HTML and identify specific details about the shoe.

Extract:
1. Intended use (e.g., road, trail)
2. Previous model name (if available)
3. Next model name (if available)
4. Changes from previous model (if available)
5. Release date (in YYYY-MM-DD format) (if available)

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct version information.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For text fields like intended use, previous model, etc., only provide a value if you can find specific text about it. Otherwise, return null.`
            },
            {
                role: "user",
                content: `Extract the version information from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error('Error extracting shoe version information with LLM:', error);
        throw error;
    }
}

/**
 * Extract shoe gender-specific information from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Shoe gender-specific information
 */
async function extractShoeGenderInfo(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof ShoeGenderInfoSchema>> {
    console.log(`Extracting shoe gender information using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(ShoeGenderInfoSchema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting gender-specific shoe information from HTML content.
Your task is to analyze the HTML and identify gender-specific details about the shoe.

Extract:
1. Gender (male, female, or none)
3. Price (as a number without currency symbols)
4. Weight in grams

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct gender-specific information.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For numeric fields like price and weight, only provide a value if you can find a specific number in the content. Otherwise, return null.`
            },
            {
                role: "user",
                content: `Extract the gender-specific information from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error('Error extracting shoe gender information with LLM:', error);
        throw error;
    }
}

/**
 * Extract shoe data from HTML content using an LLM
 * @param url
 * @param content
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns An array of extracted shoe data
 */
export async function extractShoeDataFromBrandSite(
    url: string,
    content: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof BrandShoeDataSchema>> {
    console.log(`Extracting shoe data using LLM model: ${modelName}...`);

    try {
        // Extract each aspect of the shoe data separately
        const basicInfo = await extractBasicShoeInfo(content, modelName);
        const specifications = await extractShoeSpecifications(content, modelName);
        const versionInfo = await extractShoeVersionInfo(content, modelName);
        const genderInfo = await extractShoeGenderInfo(content, modelName);

        // Combine the extracted data into the expected format
        return {
            model: basicInfo.model,
            brand: basicInfo.brand,
            specifications: specifications,
            version: {
                ...versionInfo,
                ...genderInfo,
                url
            }
        };
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

/**
 * Scrape shoe data from a list of pages and save it to the database
 *
 * This function uses an LLM to extract structured data from HTML content instead of relying on fixed CSS selectors.
 * The LLM analyzes the HTML and identifies shoe information regardless of the specific HTML structure,
 * making the scraper more flexible and adaptable to different websites.
 *
 * To use a different LLM model, modify the call to extractShoeDataWithLLM and specify the model name.
 * Example: extractShoeDataWithLLM(html, 'anthropic/claude-3-sonnet-20240229')
 *
 * @returns Object with success status and message
 * @param pagesToScrape
 */
async function scrapeShoeData(pagesToScrape: Array<{ url: string }>): Promise<{ success: boolean, message: string }> {
    console.log('Starting shoe data scraping...');

    try {
        for (const page of pagesToScrape) {
            console.log(`Scraping data from ${page.url}...`);

            const response = await axios.get(page.url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:81.0) Gecko/20100101 Firefox/81.0',
                },

            });
            const html = convert(response.data)

            // Extract shoe data using LLM
            const {
                model,
                brand,
                specifications,
                version
            } = await extractShoeDataFromBrandSite(page.url, html);

            // Skip if we don't have the minimum required data
            if (!model || !brand) {
                console.log('Skipping shoe with incomplete data');
                continue;
            }

            console.log(`Processing: ${brand} ${model}`);

            // Extract all data
            const {forefootStackHeightMm, heelStackHeightMm, width, depth} = specifications;
            const {previousModel, nextModel, changes, releaseDate, gender, intendedUse, price, weightGrams, url} = version;

            // Parse the release date string to a Date object if it exists
            const parsedReleaseDate = releaseDate && !isNaN(Date.parse(releaseDate)) ? new Date(releaseDate) : null;

            // Create or update the shoe in the database with all fields
            const shoe = await prisma.shoe.upsert({
                where: {
                    model_brand: {model, brand},
                },
                update: {
                    // Update spec fields
                    forefootStackHeightMm: nullStringToUndefined(forefootStackHeightMm),
                    heelStackHeightMm: nullStringToUndefined(heelStackHeightMm),
                    width: nullStringToUndefined(width),
                    depth: nullStringToUndefined(depth),

                    // Update version fields
                    previousModel: nullStringToUndefined(previousModel),
                    nextModel: nullStringToUndefined(nextModel),
                    changes: nullStringToUndefined(changes),
                    releaseDate: parsedReleaseDate,
                    intendedUse: nullStringToUndefined(intendedUse),
                },
                create: {
                    model,
                    brand,

                    // Create spec fields
                    forefootStackHeightMm: nullStringToUndefined(forefootStackHeightMm),
                    heelStackHeightMm: nullStringToUndefined(heelStackHeightMm),
                    width: nullStringToUndefined(width),
                    depth: nullStringToUndefined(depth),

                    // Create version fields
                    previousModel: nullStringToUndefined(previousModel),
                    nextModel: nullStringToUndefined(nextModel),
                    changes: nullStringToUndefined(changes),
                    releaseDate: parsedReleaseDate,
                    intendedUse: nullStringToUndefined(intendedUse),
                },
            });

            console.log(`Saved shoe: ${shoe.id} - ${shoe.brand} ${shoe.model}`);

            // Create or update gender information
            await prisma.shoeGender.upsert({
                where: {
                    id_gender: {
                        shoeId: shoe.id,
                        gender,
                    }
                },
                update: {
                    price: nullStringToUndefined(price),
                    weightGrams: nullStringToUndefined(weightGrams),
                    url
                },
                create: {
                    shoeId: shoe.id,
                    gender,
                    price: nullStringToUndefined(price),
                    weightGrams: nullStringToUndefined(weightGrams),
                    url
                }
            })

            console.log(`Saved version information for shoe: ${shoe.id}`);
        }

        console.log('Shoe data scraping completed successfully');
        return {success: true, message: 'Shoe data scraped and saved successfully'};
    } catch (error: unknown) {
        console.error('Error scraping shoe data:', error);
        return {success: false, message: `Shoe data scraping failed: ${(error as Error).message}`};
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Main function to run the scraper
 *
 * This function demonstrates how to use the sitemap parser to identify product pages
 * and pass them to the scraper.
 *
 */
async function main() {
    // First initialize the database
    const dbInit = await initializeDatabase();

    if (!dbInit.success) {
        console.error('Database initialization failed, cannot proceed with scraping');
        process.exit(1);
    }
    const sitemapUrl = "https://www.altrarunning.com/sitemap_0.xml";

    // If a sitemap URL is provided, parse it to get product pages
    console.log(`Using sitemap: ${sitemapUrl}`);

    // Define patterns to identify product pages and their types

    // Define patterns to identify product pages and their types
    const productUrlPatterns = [
        {pattern: /\/trail\//, type: 'trail'},
        {pattern: /\/road\//, type: 'road'},
    ];

    // Parse the sitemap to get product pages
    const pages = await parseSitemap(sitemapUrl, productUrlPatterns);

    if (pages.length === 0) {
        console.warn('No product pages found in sitemap. Using default example pages.');
    }

    // Then scrape the data from the identified pages
    const scrapeResult = await scrapeShoeData(pages);

    if (!scrapeResult.success) {
        console.error('Shoe data scraping failed');
        process.exit(1);
    }

    console.log('All operations completed successfully');
}

// Run the main function if this script is executed directly
if (require.main === module) {
    main()
        .catch((error) => {
            console.error('Unhandled error:', error);
            process.exit(1);
        });
}
