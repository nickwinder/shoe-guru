import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient, Shoe, ShoeSpec, ShoeReview, ShoeVersion } from '@prisma/client';
import { initializeDatabase } from './init-db';
import { z } from 'zod';
import {loadChatModel} from "src/retrieval_graph/utils";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define schema for shoe data extraction
const ShoeDataSchema = z.object({
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
  reviews: z.array(z.object({
    fit: z.string().nullable().describe("The fit rating or description"),
    feel: z.string().nullable().describe("The feel rating or description"),
    durability: z.string().nullable().describe("The durability rating or description")
  })),
  version: z.object({
    previousModel: z.string().nullable().describe("The previous model name of the shoe"),
    changes: z.string().nullable().describe("The changes made from the previous model"),
    releaseDate: z.string().nullable().describe("The release date of the shoe in ISO format (YYYY-MM-DD)")
  }).nullable().describe("Version information for the shoe")
});

// Define schema for multiple shoe data extraction
const ShoesDataSchema = z.array(ShoeDataSchema);

/**
 * Extract shoe data from HTML content using an LLM
 * @param html The HTML content to extract data from
 * @param shoeType The type of shoe (e.g., 'running', 'trail')
 * @param modelName The name of the LLM model to use (default: 'openai/gpt-4o')
 * @returns An array of extracted shoe data
 */
async function extractShoeDataWithLLM(
  html: string, 
  shoeType: string, 
  modelName = 'openai/gpt-4o-mini'
): Promise<z.infer<typeof ShoesDataSchema>> {
  console.log(`Extracting shoe data using LLM model: ${modelName}...`);

  try {
    // Load the LLM model
    const model = (await loadChatModel(modelName)).withStructuredOutput(ShoesDataSchema);

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
6. Reviews (if available):
   - Fit rating/description
   - Feel rating/description
   - Durability rating/description
7. Version information (if available):
   - Previous model name
   - Changes from previous model
   - Release date (in YYYY-MM-DD format)

Be thorough and extract all shoes present in the HTML. If a piece of information is not available, return null for that field.
The shoes are of type: ${shoeType}.

Return the data in the structured format specified by the schema.`
      },
      {
        role: "user",
        content: `Extract shoe data from the following HTML content:\n\n${html}`
      }
    ];

    // Extract data using the LLM
    const result = await model.invoke(prompt);
    console.log(`LLM extracted ${result.length} shoes`);

    return result;
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
async function parseSitemap(
  sitemapUrl: string,
  productUrlPatterns: Array<{ pattern: RegExp, type: string }>,
  defaultType: string = 'running'
): Promise<Array<{ url: string, type: string }>> {
  console.log(`Parsing sitemap: ${sitemapUrl}`);

  try {
    // Fetch the sitemap XML
    const response = await axios.get(sitemapUrl);
    const xml = response.data;

    // Parse the XML using Cheerio
    const $ = cheerio.load(xml, { xmlMode: true });

    // Extract URLs from the sitemap
    const urls: Array<{ url: string, type: string }> = [];

    // Handle standard sitemap format
    $('url loc').each((_, element) => {
      const url = $(element).text().trim();

      // Determine if this is a product page and what type it is
      let matchedType = defaultType;
      let isProductPage = false;

      for (const { pattern, type } of productUrlPatterns) {
        if (pattern.test(url)) {
          isProductPage = true;
          matchedType = type;
          break;
        }
      }

      if (isProductPage) {
        urls.push({ url, type: matchedType });
      }
    });

    // Handle sitemap index format (sitemap of sitemaps)
    if (urls.length === 0) {
      const sitemapPromises = $('sitemap loc').map(async (_, element) => {
        const nestedSitemapUrl = $(element).text().trim();
        return parseSitemap(nestedSitemapUrl, productUrlPatterns, defaultType);
      }).get();

      const nestedResults = await Promise.all(sitemapPromises);
      return nestedResults.flat();
    }

    console.log(`Found ${urls.length} product pages in sitemap`);
    return urls;
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
 * Example: extractShoeDataWithLLM(html, page.type, 'anthropic/claude-3-sonnet-20240229')
 * 
 * @param pages Array of page objects with url and type properties
 * @returns Object with success status and message
 */
async function scrapeShoeData(pages?: Array<{ url: string, type: string }>): Promise<{ success: boolean, message: string }> {
  console.log('Starting shoe data scraping...');

  try {
    // Use provided pages or default to example pages
    const pagesToScrape = pages || [
      { url: 'https://www.runningshoestore.com/best-running-shoes', type: 'running' },
      { url: 'https://www.hikingfootwear.com/trail-shoes', type: 'trail' },
    ];

    for (const page of pagesToScrape) {
      console.log(`Scraping data from ${page.url}...`);

      // Fetch the HTML content
      const response = await axios.get(page.url);
      const html = response.data;

      // Extract shoe data using LLM
      const extractedShoes = await extractShoeDataWithLLM(html, page.type);

      console.log(`LLM found ${extractedShoes.length} shoes on ${page.url}`);

      // Process each extracted shoe
      for (const extractedShoe of extractedShoes) {
        const { model, brand, price, trueToSize, specifications, reviews, version } = extractedShoe;

        // Skip if we don't have the minimum required data
        if (!model || !brand) {
          console.log('Skipping shoe with incomplete data');
          continue;
        }

        console.log(`Processing: ${brand} ${model}`);

        // Create or update the shoe in the database
        const shoe = await prisma.shoe.upsert({
          where: {
            // Since we don't have a unique constraint, we'll use a combination of fields
            // In a real application, you might want to add a unique constraint
            id: 0, // This will always fail the where clause, forcing an insert
          },
          update: {
            model,
            brand,
            intendedUse: page.type,
            price: price !== null ? price : null,
            trueToSize: trueToSize !== null ? trueToSize : null,
            // Other fields would be updated here
          },
          create: {
            model,
            brand,
            intendedUse: page.type,
            price: price !== null ? price : null,
            trueToSize: trueToSize !== null ? trueToSize : null,
            // Other fields would be set here
          },
        });

        console.log(`Saved shoe: ${shoe.id} - ${shoe.brand} ${shoe.model}`);

        // Extract and save shoe specifications
        const { weightGrams, stackHeightMm, heelToToeDropMm, width, depth } = specifications;

        if (weightGrams !== null || stackHeightMm !== null || heelToToeDropMm !== null || width !== null || depth !== null) {
          await prisma.shoeSpec.upsert({
            where: {
              shoeId: shoe.id,
            },
            update: {
              weightGrams,
              stackHeightMm,
              heelToToeDropMm,
              width,
              depth,
              // Other spec fields would be updated here
            },
            create: {
              shoeId: shoe.id,
              weightGrams,
              stackHeightMm,
              heelToToeDropMm,
              width,
              depth,
              // Other spec fields would be set here
            },
          });

          console.log(`Saved specs for shoe: ${shoe.id}`);
        }

        // Save reviews if available
        if (reviews && reviews.length > 0) {
          for (const reviewData of reviews) {
            const { fit, feel, durability } = reviewData;

            if (fit || feel || durability) {
              await prisma.shoeReview.create({
                data: {
                  shoeId: shoe.id,
                  fit,
                  feel,
                  durability,
                },
              });

              console.log(`Saved review for shoe: ${shoe.id}`);
            }
          }
        }

        // Save version information if available
        if (version) {
          const { previousModel, changes, releaseDate } = version;

          if (previousModel || changes || releaseDate) {
            // Parse the release date string to a Date object if it exists
            const parsedReleaseDate = releaseDate ? new Date(releaseDate) : null;

            await prisma.shoeVersion.create({
              data: {
                shoeId: shoe.id,
                previousModel,
                changes,
                releaseDate: parsedReleaseDate,
              },
            });

            console.log(`Saved version information for shoe: ${shoe.id}`);
          }
        }
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
 * @param sitemapUrl Optional URL of the sitemap to parse. If not provided, uses default example pages.
 */
async function main(sitemapUrl?: string) {
  // First initialize the database
  const dbInit = await initializeDatabase();

  if (!dbInit.success) {
    console.error('Database initialization failed, cannot proceed with scraping');
    process.exit(1);
  }

  let pages;

  // If a sitemap URL is provided, parse it to get product pages
  if (sitemapUrl) {
    console.log(`Using sitemap: ${sitemapUrl}`);

    // Define patterns to identify product pages and their types
    const productUrlPatterns = [
      { pattern: /\/running-shoes\//, type: 'running' },
      { pattern: /\/trail-shoes\//, type: 'trail' },
      { pattern: /\/hiking-boots\//, type: 'hiking' },
      // Add more patterns as needed
    ];

    // Parse the sitemap to get product pages
    pages = await parseSitemap(sitemapUrl, productUrlPatterns);

    if (pages.length === 0) {
      console.warn('No product pages found in sitemap. Using default example pages.');
      pages = undefined; // Will use default pages in scrapeShoeData
    }
  } else {
    console.log('No sitemap URL provided. Using default example pages.');
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
  // You can provide a sitemap URL as a command-line argument
  const sitemapUrl = process.argv[2];

  main(sitemapUrl)
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { scrapeShoeData, parseSitemap, extractShoeDataWithLLM };
