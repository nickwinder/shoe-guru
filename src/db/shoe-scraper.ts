import axios from 'axios';
import {PrismaClient} from '@prisma/client';
import {initializeDatabase} from './init-db';
import {z} from 'zod';
import {loadChatModel} from "../retrieval_graph/utils";
import Sitemapper from "sitemapper";
import {convert} from "html-to-text";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define schema for shoe data extraction
const BrandShoeDataSchema = z.object({
    model: z.string().describe("The model name of the shoe. This should not include the gender the shoe is made for, nor the version number or model type like mid or luxe."),
    brand: z.string().describe("The brand name of the shoe"),
    specifications: z.object({
        stackHeightMm: z.number().nullable().describe("The stack height of the shoe in millimeters"),
        heelToToeDropMm: z.number().nullable().describe("The heel-to-toe drop of the shoe in millimeters"),
        width: z.string().nullable().describe("The width of the shoe (e.g., narrow, standard, wide)"),
        depth: z.string().nullable().describe("The depth of the shoe (e.g., low, medium, high)")
    }),
    version: z.object({
        name: z.string().describe("The version name of the shoe (e.g., '2', '3', '4.5', 'Mid', 'Waterproof')"),
        gender: z.enum(['male', 'female', 'none']).describe('The gender the shoe is made for'),
        price: z.number().nullable().describe("The price of the shoe in numeric format (no currency symbol)"),
        weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
        intendedUse: z.string().nullable().describe('The intended use of the shoe e.g. road, trail'),
        trueToSize: z.string().nullable().describe("Whether the shoe is true to size. Or fits small, or large."),
        previousModel: z.string().nullable().describe("The previous model name of the shoe"),
        nextModel: z.string().nullable().describe("The next model name of the shoe"),
        changes: z.string().nullable().describe("The changes made from the previous model"),
        releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)")
    }).describe("Version information for the shoe")
});

/**
 * Extract shoe data from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o')
 * @returns An array of extracted shoe data
 */
export async function extractShoeDataFromBrandSite(
    html: string,
    modelName = 'openai/gpt-4o'
): Promise<z.infer<typeof BrandShoeDataSchema>> {
    console.log(`Extracting shoe data using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(BrandShoeDataSchema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: `You are a specialized AI for extracting structured data about shoes from HTML content. 
Your task is to analyze the HTML and identify all shoes present, extracting their details according to the specified schema.

For each shoe, extract:
1. Model name (without the version number or type like mid or waterproof)
2. Brand name
3. Specifications:
   - Weight in grams
   - Stack height in millimeters
   - Heel-to-toe drop in millimeters
   - Width (e.g., narrow, standard, wide)
   - Depth (e.g., low, medium, high)
4. Version information:
   - Version name (e.g '2', '3', '4.5', 'Mid', 'Waterproof')
   - Gender (male, female, or none)
   - Price (as a number without currency symbols)
   - Intended use (e.g., road, trail)
   - True to size (indicating if the shoe fits true to size, small, or large)
   - Previous model name (if available)
   - Next model name (if available)
   - Changes from previous model (if available)
   - Release date (in YYYY-MM-DD format) (if available)

IMPORTANT: Be thorough and extract all shoes present in the HTML. If a piece of information is not available or you are uncertain about its value, you MUST return null for that field. Do not guess or provide default values when information is missing.

For numeric fields like price, weight, stack height, and heel-to-toe drop, only provide a value if you can find a specific number in the content. Otherwise, return null.

For text fields like intended use, true to size, previous model, etc., only provide a value if you can find specific text about it. Otherwise, return null.

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
            } = await extractShoeDataFromBrandSite(html);

            // Skip if we don't have the minimum required data
            if (!model || !brand) {
                console.log('Skipping shoe with incomplete data');
                continue;
            }

            console.log(`Processing: ${brand} ${model}`);

            // Create or update the shoe in the database
            const shoe = await prisma.shoe.upsert({
                where: {
                    model_brand: {model, brand},
                },
                update: {
                    // No additional fields to update
                },
                create: {
                    model,
                    brand,
                    // No additional fields to create
                },
            });

            console.log(`Saved shoe: ${shoe.id} - ${shoe.brand} ${shoe.model}`);

            // Extract and save shoe specifications
            const {stackHeightMm, heelToToeDropMm, width, depth} = specifications;

            if (stackHeightMm !== null || heelToToeDropMm !== null || width !== null || depth !== null) {
                await prisma.shoeSpec.upsert({
                    where: {
                        shoeId: shoe.id,
                    },
                    update: {
                        stackHeightMm,
                        heelToToeDropMm,
                        width,
                        depth,
                        // Other spec fields would be updated here
                    },
                    create: {
                        shoeId: shoe.id,
                        stackHeightMm,
                        heelToToeDropMm,
                        width,
                        depth,
                        // Other spec fields would be set here
                    },
                });

                console.log(`Saved specs for shoe: ${shoe.id}`);
            }

            // Save version information if available
            const {previousModel, nextModel, changes, releaseDate, gender, intendedUse, trueToSize, price, weightGrams} = version;
            const versionName = version.name ? version.name : '1';

            // Parse the release date string to a Date object if it exists
            const parsedReleaseDate = releaseDate && !isNaN(Date.parse(releaseDate)) ? new Date(releaseDate) : null;

            const versionDB = await prisma.shoeVersion.upsert({
                where: {
                    id_name: {
                        shoeId: shoe.id,
                        name: versionName,
                    }
                },
                update: {
                    previousModel,
                    nextModel,
                    changes,
                    releaseDate: parsedReleaseDate,
                    intendedUse,
                    trueToSize,
                },
                create: {
                    shoeId: shoe.id,
                    name: versionName,
                    previousModel,
                    nextModel,
                    changes,
                    releaseDate: parsedReleaseDate,
                    intendedUse,
                    trueToSize,
                },
            });

            await prisma.shoeGender.upsert({
                where: {
                    id_gender: {
                        versionId: versionDB.id,
                        gender,
                    }
                },
                update: {
                    price: price !== null ? price : undefined,
                    weightGrams,
                },
                create: {
                    versionId: versionDB.id,
                    gender,
                    price: price !== null ? price : undefined,
                    weightGrams,
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
 * @param sitemapUrl Optional URL of the sitemap to parse. If not provided, uses default example pages.
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
