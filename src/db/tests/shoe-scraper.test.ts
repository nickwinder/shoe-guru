import axios from "axios";
import {describe, expect, it} from "vitest";
import {convert} from 'html-to-text'
import {extractShoeDataFromBrandSite, parseSitemap} from "src/db/shoe-scraper";

describe("Shoe Scraper", () => {
    // This test uses real HTTP requests to test against the actual sitemap
    it("should extract Altra Superior 6 from real sitemap and page content", async () => {
        // Define the sitemap URL
        const sitemapUrl = "https://www.altrarunning.com/sitemap_0.xml";

        // Define patterns to identify product pages and their types
        const productUrlPatterns = [
            {pattern: /\/trail\//, type: 'trail'},
            {pattern: /\/road\//, type: 'road'},
        ];

        // Step 1: Parse the real sitemap to find product pages
        const pages = await parseSitemap(sitemapUrl, productUrlPatterns);

        // Verify that we found some pages
        expect(pages.length).toBeGreaterThan(0);

        // Step 2: Find the Altra Superior 6 page
        const superiorPage = pages.find(page =>
            page.url.toLowerCase().includes('superior-6') ||
            page.url.toLowerCase().includes('superior6')
        );

        expect(superiorPage).toBeDefined();

        if (superiorPage) {
            console.log(`Found Altra Superior 6 page: ${superiorPage.url}`);

            // Step 3: Fetch the actual page content
            const response = await axios.get(superiorPage.url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:81.0) Gecko/20100101 Firefox/81.0',
                },

            });
            const html = convert(response.data)

            // Step 4: Extract shoe data using the real LLM-based extraction
            const superiorShoe = await extractShoeDataFromBrandSite(superiorPage.url, html);

            expect(superiorShoe).toBeDefined();

            if (superiorShoe) {
                // Verify the basic extracted data for the Altra Superior 6
                expect(superiorShoe.brand.toLowerCase()).toContain('altra');
                expect(superiorShoe.model.toLowerCase()).toContain('superior');

                // Verify that we have specifications
                expect(superiorShoe.specifications).toBeDefined();

                // Altra is known for zero drop shoes
                if (superiorShoe.specifications.heelToToeDropMm !== null) {
                    expect(superiorShoe.specifications.heelToToeDropMm).toBe(0);
                }

                // Verify price if available
                if (superiorShoe.version.price !== null) {
                    expect(typeof superiorShoe.version.price).toBe('number');
                    expect(superiorShoe.version.price).toBeGreaterThan(0);
                }

                // Verify weight if available
                if (superiorShoe.version.weightGrams !== null) {
                    expect(typeof superiorShoe.version.weightGrams).toBe('number');
                    expect(superiorShoe.version.weightGrams).toBeGreaterThan(0);
                }

                // Verify stack height if available
                if (superiorShoe.specifications.stackHeightMm !== null) {
                    expect(typeof superiorShoe.specifications.stackHeightMm).toBe('number');
                    expect(superiorShoe.specifications.stackHeightMm).toBeGreaterThan(0);
                }

                // Log the extracted data for verification
                console.log('Extracted Altra Superior 6 data:');
                console.log(`- Brand: ${superiorShoe.brand}`);
                console.log(`- Model: ${superiorShoe.model}`);
                console.log(`- Price: ${superiorShoe.version.price}`);
                console.log('- Specifications:');
                console.log(`  - Weight: ${superiorShoe.version.weightGrams} grams`);
                console.log(`  - Stack Height: ${superiorShoe.specifications.stackHeightMm} mm`);
                console.log(`  - Heel-to-Toe Drop: ${superiorShoe.specifications.heelToToeDropMm} mm`);
                console.log(`  - Width: ${superiorShoe.specifications.width}`);
                console.log(`  - Depth: ${superiorShoe.specifications.depth}`);

                if (superiorShoe.version) {
                    console.log('- Version Information:');
                    console.log(`  - Previous Model: ${superiorShoe.version.previousModel}`);
                    console.log(`  - Changes: ${superiorShoe.version.changes}`);
                    console.log(`  - Release Date: ${superiorShoe.version.releaseDate}`);
                }
            }
        }
    }, 30000); // Increase timeout for this test as it makes real HTTP requests and uses an LLM
});
