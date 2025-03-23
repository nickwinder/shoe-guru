# Shoe Database and Web Scraper

This module provides functionality to create and populate a database of shoe information by scraping data from websites.

## Database Schema

The database schema is defined using Prisma and includes the following models:

- **Shoe**: Basic information about a shoe (model, brand, intended use, price, etc.)
- **ShoeSpec**: Technical specifications of a shoe (weight, stack height, heel-to-toe drop, etc.)
- **ShoeReview**: Reviews and ratings for a shoe (fit, feel, durability)
- **ShoeVersion**: Information about different versions of a shoe (previous model, changes, release date)

## Setup

1. Make sure you have a PostgreSQL database running and accessible
2. Update the `DATABASE_URL` in the `.env` file with your database connection string
3. Run the following commands to set up the database:

```bash
# Generate Prisma client
npm run prisma:generate

# Create database migrations
npm run prisma:migrate

# Initialize the database and run the web scraper
npm run db:setup
```

## Available Scripts

- `npm run db:init`: Initialize the database
- `npm run db:scrape`: Run the web scraper to collect shoe data
- `npm run db:setup`: Run both initialization and scraping
- `npm run prisma:generate`: Generate the Prisma client
- `npm run prisma:migrate`: Create and apply database migrations

## Web Scraper

The web scraper is configured to collect data from the following websites:
- Running shoes: https://www.runningshoestore.com/best-running-shoes
- Trail shoes: https://www.hikingfootwear.com/trail-shoes

Note: These are example URLs and would need to be updated with real websites. The scraper uses an LLM (Language Learning Model) to extract data from HTML content, making it adaptable to different websites without requiring specific CSS selectors.

### LLM-Based Extraction

Instead of relying on fixed CSS selectors that need to be adjusted for each website, the scraper uses an LLM to analyze the HTML content and extract structured data. This approach offers several benefits:

1. **Flexibility**: Works across different websites without needing to adjust selectors
2. **Adaptability**: Can handle changes in website structure without breaking
3. **Comprehensiveness**: Can extract data even when the HTML structure is complex or inconsistent
4. **Intelligence**: Can infer relationships and extract meaningful data based on context

The LLM is provided with a schema defining the expected data structure (shoe model, brand, price, specifications, reviews) and extracts this information regardless of how it's presented in the HTML.

## Customization

To customize the web scraper for different websites:

1. Update the `websites` array in `shoe-scraper.ts` with the URLs you want to scrape
2. Optionally modify the `ShoeDataSchema` to extract additional or different data fields
3. Optionally specify a different LLM model by passing it to the `extractShoeDataWithLLM` function:
   ```typescript
   // Example: Use Claude 3 Sonnet instead of the default GPT-4o
   const extractedShoes = await extractShoeDataWithLLM(html, site.type, 'anthropic/claude-3-sonnet-20240229');
   ```
4. Adjust the prompt in the `extractShoeDataWithLLM` function if you need to provide more specific instructions to the LLM

## Error Handling

The scripts include comprehensive error handling and logging to help diagnose issues during the database setup and scraping process.
