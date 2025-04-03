import axios from 'axios';
import {PrismaClient} from '@prisma/client';
import {initializeDatabase} from './init-db';
import {z} from 'zod';
import {loadChatModel} from "../app/api/lib/retrieval_graph/utils";
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
    fit: z.string().nullable().describe("The fit of the shoe (e.g., slim, standard, original)"),
    wideOption: z.boolean().nullable().describe("Whether the shoe has a wide option available"),
    description: z.string().nullable().describe("A description of the shoe")
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
    price: z.number().nullable().describe("The current price of the shoe in numeric format (no currency symbol)"),
    priceRRP: z.number().nullable().describe("The recommended retail price (RRP) of the shoe in numeric format (no currency symbol)"),
    weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
    colors: z.array(z.string()).nullable().describe("The available colors of the shoe"),
});

// Combined schema for backward compatibility
const BrandShoeDataSchema = z.object({
    model: z.string().describe("The model name of the shoe. This should not include the gender the shoe is made for, nor the version number or model type like mid or luxe."),
    brand: z.string().describe("The brand name of the shoe"),
    specifications: ShoeSpecificationsSchema,
    version: z.object({
        gender: z.enum(['male', 'female', 'none']).describe('The gender the shoe is made for'),
        price: z.number().nullable().describe("The current price of the shoe in numeric format (no currency symbol)"),
        priceRRP: z.number().nullable().describe("The recommended retail price (RRP) of the shoe in numeric format (no currency symbol)"),
        weightGrams: z.number().nullable().describe("The weight of the shoe in grams"),
        colors: z.array(z.string()).nullable().describe("The available colors of the shoe"),
        intendedUse: z.string().nullable().describe('The intended use of the shoe e.g. road, trail'),
        previousModel: z.string().nullable().describe("The previous model name of the shoe"),
        nextModel: z.string().nullable().describe("The next model name of the shoe"),
        changes: z.string().nullable().describe("The changes made from the previous model"),
        releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)"),
        url: z.string().describe("The URL of the shoe")
    }).describe("Version information for the shoe")
});

/**
 * Generic function to extract data from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param schema The Zod schema to validate and structure the output
 * @param systemPrompt The system prompt for the LLM
 * @param extractionType Description of what's being extracted (for logging)
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Extracted data conforming to the provided schema
 */
async function extractDataWithLLM<T extends z.ZodType>(
    html: string,
    schema: T,
    systemPrompt: string,
    extractionType: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<T>> {
    console.log(`Extracting ${extractionType} using LLM model: ${modelName}...`);

    try {
        // Load the LLM model
        const llm = await loadChatModel(modelName);
        const model = llm.withStructuredOutput(schema).withRetry();

        // Create a prompt for the LLM
        const prompt = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: `Extract the ${extractionType} from the following HTML content:\n\n${html}`
            }
        ];

        // Extract data using the LLM
        return model.invoke(prompt);
    } catch (error) {
        console.error(`Error extracting ${extractionType} with LLM:`, error);
        throw error;
    }
}

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
    const systemPrompt = `You are a specialized AI for extracting basic shoe information from HTML content.
Your task is to analyze the HTML and identify the model name and brand of the shoe.

Extract:
1. Model name
2. Brand name

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct model name and brand.
The model name should not include the gender the shoe is made for.`;

    return extractDataWithLLM(html, BasicShoeInfoSchema, systemPrompt, "basic shoe information", modelName);
}

/**
 * Extract shoe specifications from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o-mini')
 * @returns Shoe specifications (forefootStackHeightMm, heelStackHeightMm, fit, wideOption, description)
 */
async function extractShoeSpecifications(
    html: string,
    modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof ShoeSpecificationsSchema>> {
    const systemPrompt = `You are a specialized AI for extracting shoe specifications from HTML content.
Your task is to analyze the HTML and identify the technical specifications of the shoe.

Extract:
1. Forefoot stack height in millimeters
2. Heel stack height in millimeters
3. Fit (e.g., slim, standard, original)
4. Wide option availability (true/false) (it's possible to determine this if a regular and wide version is mentioned)
5. Description of the shoe

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct specifications.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For numeric fields like forefoot stack height and heel stack height, only provide a value if you can find a specific number in the content. Otherwise, return null.
For the wide option availability, return true if the shoe is available in wide sizes, otherwise return false.
For the fit, look for descriptions of how the shoe fits (slim, standard, original, etc.).
For the description, extract a concise summary of the shoe's features and characteristics.
Note: If you only find a single stack height value without specifying forefoot or heel, try to determine which it is. If you find a drop value and one of the stack heights, you can calculate the other.`;

    return extractDataWithLLM(html, ShoeSpecificationsSchema, systemPrompt, "shoe specifications", modelName);
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
    const systemPrompt = `You are a specialized AI for extracting shoe information from HTML content.
Your task is to analyze the HTML and identify specific details about the shoe.

Extract:
1. Intended use (e.g., road, trail)
2. Previous model name (if available)
3. Next model name (if available)
4. Changes from previous model (if available)
5. Release date (in YYYY-MM-DD format) (if available)

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct version information.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For text fields like intended use, previous model, etc., only provide a value if you can find specific text about it. Otherwise, return null.`;

    return extractDataWithLLM(html, ShoeVersionInfoSchema, systemPrompt, "shoe version information", modelName);
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
    const systemPrompt = `You are a specialized AI for extracting gender-specific shoe information from HTML content.
Your task is to analyze the HTML and identify gender-specific details about the shoe.

Extract:
1. Gender (male, female, or none)
2. Current price (as a number without currency symbols)
3. Recommended Retail Price (RRP) (as a number without currency symbols)
4. Weight in grams
5. Available colors (as an array of strings)

IMPORTANT: Be thorough and accurate. Focus only on identifying the correct gender-specific information.
If a piece of information is not available or you are uncertain about its value, you MUST return null for that field.
For numeric fields like price, RRP, and weight, only provide a value if you can find a specific number in the content. Otherwise, return null.
For price information, look for both the current price (which may be discounted) and the original/recommended retail price (RRP).
The current price is the price the shoe is currently being sold for, while the RRP is the original or full price before any discounts.
For colors, look for any mention of available color options and return them as an array of strings. If no color information is found, return null.`;

    return extractDataWithLLM(html, ShoeGenderInfoSchema, systemPrompt, "shoe gender information", modelName);
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
 * Filter an object to only include specified fields
 * 
 * @param obj The object to filter
 * @param fieldsToUpdate Array of field names to include
 * @param validFields Array of valid field names for this object
 * @returns A new object with only the specified fields
 */
function filterObjectByFields<T extends Record<string, any>>(
    obj: T, 
    fieldsToUpdate: string[], 
    validFields: string[]
): Partial<T> {
    const result: Partial<T> = {};

    // Filter the fields to only include valid fields
    const validFieldsToUpdate = fieldsToUpdate.filter(field => validFields.includes(field));

    // Add only the specified fields to the result object
    for (const field of validFieldsToUpdate) {
        if (field in obj) {
            result[field as keyof T] = obj[field as keyof T];
        }
    }

    return result;
}

/**
 * Save shoe data to the database
 * 
 * @param shoeData The shoe data to save
 * @param fieldsToUpdate Optional array of field names to update. If not provided, all fields will be updated.
 * @returns The saved shoe object
 * @throws Error if database operations fail
 */
async function saveShoeToDatabase(
    shoeData: z.infer<typeof BrandShoeDataSchema>, 
    fieldsToUpdate?: string[]
): Promise<{ shoeId: number, brand: string, model: string } | null> {
    const { model, brand, specifications, version } = shoeData;
    const { forefootStackHeightMm, heelStackHeightMm, fit, wideOption, description } = specifications;
    const { gender, intendedUse, price, priceRRP, weightGrams, url, colors } = version;

    try {
        // If fieldsToUpdate is provided, check if the shoe exists in the database
        // If it doesn't exist, skip the scraping since we're only updating specific fields
        if (fieldsToUpdate && fieldsToUpdate.length > 0) {
            const existingShoe = await prisma.shoe.findUnique({
                where: {
                    model_brand: { model, brand },
                },
            });

            if (!existingShoe) {
                console.log(`Skipping ${brand} ${model} - shoe not found in database and only updating specific fields`);
                return null;
            }
        }
        // Calculate drop from forefoot and heel stack heights
        let dropMm = undefined
        if (forefootStackHeightMm && heelStackHeightMm) {
            dropMm = heelStackHeightMm - forefootStackHeightMm;
        }

        // Prepare shoe data for database
        const fullShoeData = {
            // Spec fields
            forefootStackHeightMm: forefootStackHeightMm || 0,
            heelStackHeightMm: heelStackHeightMm || 0,
            dropMm: dropMm || 0,
            fit: nullStringToUndefined(fit) || 'standard',
            wideOption: nullStringToUndefined(wideOption) || false,
            description: nullStringToUndefined(description) || '',

            // Version fields
            intendedUse: nullStringToUndefined(intendedUse),
        };

        // Prepare gender data for database
        const fullGenderData = {
            price: nullStringToUndefined(price) || 0,
            priceRRP: nullStringToUndefined(priceRRP) || nullStringToUndefined(price) || 0,
            weightGrams: nullStringToUndefined(weightGrams) || 0,
            colors: colors || [],
            url
        };

        // If fieldsToUpdate is provided, filter the data objects to only include those fields
        const updateShoeData = fieldsToUpdate 
            ? filterObjectByFields(fullShoeData, fieldsToUpdate, ['forefootStackHeightMm', 'heelStackHeightMm', 'dropMm', 'fit', 'wideOption', 'description', 'intendedUse'])
            : fullShoeData;

        const updateGenderData = fieldsToUpdate
            ? filterObjectByFields(fullGenderData, fieldsToUpdate, ['price', 'priceRRP', 'weightGrams', 'colors', 'url'])
            : fullGenderData;

        // Create or update the shoe in the database
        const shoe = await prisma.shoe.upsert({
            where: {
                model_brand: { model, brand },
            },
            update: updateShoeData,
            create: {
                model,
                brand,
                ...fullShoeData // Always use full data for creation
            },
        });

        console.log(`shoeId: ${shoe.id} - ${shoe.brand} ${shoe.model} - gender ${gender}`);

        // Create or update gender information
        await prisma.shoeGender.upsert({
            where: {
                id_gender: {
                    shoeId: shoe.id,
                    gender,
                }
            },
            update: updateGenderData,
            create: {
                shoeId: shoe.id,
                gender,
                ...fullGenderData // Always use full data for creation
            }
        });

        return { shoeId: shoe.id, brand: shoe.brand, model: shoe.model };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to save shoe data for ${brand} ${model}: ${errorMessage}`);
    }
}

/**
 * Fetch HTML content from a URL
 * 
 * @param url The URL to fetch
 * @returns The HTML content as text
 * @throws Error if the request fails or the response is invalid
 */
async function fetchHtmlContent(url: string): Promise<string> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:81.0) Gecko/20100101 Firefox/81.0',
            },
            timeout: 10000, // 10 second timeout
        });

        if (!response.data) {
            throw new Error('Empty response received');
        }

        return convert(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                throw new Error(`Failed to fetch ${url}: HTTP status ${error.response.status}`);
            } else if (error.request) {
                throw new Error(`Failed to fetch ${url}: No response received (timeout or network error)`);
            } else {
                throw new Error(`Failed to fetch ${url}: ${error.message}`);
            }
        }
        throw new Error(`Failed to fetch ${url}: ${(error as Error).message}`);
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
 * @param pagesToScrape Array of pages to scrape
 * @param fieldsToUpdate Optional array of field names to update. If not provided, all fields will be updated.
 * @returns Object with success status and message
 */
async function scrapeShoeData(
    pagesToScrape: Array<{ url: string }>,
    fieldsToUpdate?: string[]
): Promise<{ success: boolean, message: string }> {
    console.log('Starting shoe data scraping...');

    try {
        for (const page of pagesToScrape) {
            console.log(`Scraping data from ${page.url}...`);

            // Fetch HTML content
            const html = await fetchHtmlContent(page.url);

            // Extract shoe data using LLM
            const shoeData = await extractShoeDataFromBrandSite(page.url, html);

            // Skip if we don't have the minimum required data
            if (!shoeData.model || !shoeData.brand) {
                console.log('Skipping shoe with incomplete data');
                continue;
            }

            console.log(`Processing: ${shoeData.brand} ${shoeData.model}`);

            // Save shoe data to database
            const savedShoe = await saveShoeToDatabase(shoeData, fieldsToUpdate);

            // If savedShoe is null, it means we skipped this shoe because it wasn't in the database
            // and we were only updating specific fields
            if (savedShoe) {
                if (fieldsToUpdate && fieldsToUpdate.length > 0) {
                    console.log(`Updated fields ${fieldsToUpdate.join(', ')} for shoe: ${savedShoe.shoeId} - ${savedShoe.brand} ${savedShoe.model}`);
                } else {
                    console.log(`Saved shoe: ${savedShoe.shoeId} - ${savedShoe.brand} ${savedShoe.model}`);
                }
                console.log(`Saved version information for shoe: ${savedShoe.shoeId}`);
            }
        }

        console.log('Shoe data scraping completed successfully');
        return { success: true, message: 'Shoe data scraped and saved successfully' };
    } catch (error: unknown) {
        console.error('Error scraping shoe data:', error);
        return { success: false, message: `Shoe data scraping failed: ${(error as Error).message}` };
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
 * You can specify which fields to update by passing them as command-line arguments:
 * Example: node shoe-scraper.js --fields colors,price,weightGrams
 */
async function main() {
    // First initialize the database
    const dbInit = await initializeDatabase();

    if (!dbInit.success) {
        console.error('Database initialization failed, cannot proceed with scraping');
        process.exit(1);
    }

    // Parse command-line arguments to get fields to update
    let fieldsToUpdate: string[] | undefined;
    const fieldsArgIndex = process.argv.indexOf('--fields');
    if (fieldsArgIndex !== -1 && fieldsArgIndex < process.argv.length - 1) {
        fieldsToUpdate = process.argv[fieldsArgIndex + 1].split(',');
        console.log(`Will only update the following fields: ${fieldsToUpdate.join(', ')}`);
    }

    const sitemapUrl = "https://www.altrarunning.com/sitemap_0.xml";

    // If a sitemap URL is provided, parse it to get product pages
    console.log(`Using sitemap: ${sitemapUrl}`);

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
    const scrapeResult = await scrapeShoeData(pages, fieldsToUpdate);

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
