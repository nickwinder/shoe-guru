import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Download an image from a URL
 * @param url The URL of the image to download
 * @returns The image data as a Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error);
    throw error;
  }
}

/**
 * Get a placeholder image for when the actual image cannot be found
 * @returns The placeholder image data as a Buffer
 */
async function getPlaceholderImage(): Promise<Buffer> {
  // Use the SVG placeholder file
  const placeholderPath = path.join(__dirname, 'placeholder.svg');

  try {
    if (fs.existsSync(placeholderPath)) {
      return fs.readFileSync(placeholderPath);
    } else {
      console.warn('Placeholder SVG not found at', placeholderPath);
      // Return a simple SVG as a fallback
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="#f0f0f0" />
        <text x="50" y="100" font-family="Arial" font-size="14" fill="#333">
          No Image Available
        </text>
      </svg>`;
      return Buffer.from(svgContent);
    }
  } catch (error) {
    console.error('Error reading placeholder image:', error);
    // Return a very simple SVG as a last resort
    return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0" /><text x="50" y="100" fill="#333">No Image</text></svg>');
  }
}

/**
 * Search for a shoe image on the website
 * @param brand The brand of the shoe
 * @param model The model of the shoe
 * @returns The URL of the image if found, null otherwise
 */
async function findShoeImage(brand: string, model: string): Promise<string | null> {
  try {
    // Normalize the brand and model names for URL construction
    const normalizedBrand = brand.toLowerCase().trim();
    const normalizedModel = model.toLowerCase().trim().replace(/\s+/g, '-');

    // Construct the URL to search for the image
    const url = `https://barefootrunreview.com/altra/`;

    console.log(`Searching for image at ${url} for ${brand} ${model} (${normalizedModel})`);

    // Fetch the HTML content
    const response = await axios.get(url);
    const html = response.data;

    // Load the HTML content into cheerio
    const $ = cheerio.load(html);

    // Look for image elements that might contain the shoe image
    // We're looking for images with filenames that include the model name and either "-outline" or "-hero"
    const imagePattern = new RegExp(`${normalizedModel}.*-?(outline|hero|solo|outsole)?`, 'i');

    let imageUrl: string | null = null;

    // Search through all img elements
    $('img').each((_, element) => {
      const src = $(element).attr('src');
      if (src && imagePattern.test(src)) {
        // Found a matching image
        imageUrl = src;
        return false; // Break the loop
      }
    });

    // If no image was found, search through background images in style attributes
    if (!imageUrl) {
      $('[style*="background"]').each((_, element) => {
        const style = $(element).attr('style');
        if (style) {
          const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match && match[1] && imagePattern.test(match[1])) {
            imageUrl = match[1];
            return false; // Break the loop
          }
        }
      });
    }

    return imageUrl;
  } catch (error) {
    console.error(`Error finding image for ${brand} ${model}:`, error);
    return null;
  }
}

/**
 * Process a ShoeGender entry to find and store its image
 * @param shoeGender The ShoeGender entry to process
 */
async function processShoeGender(shoeGender: any): Promise<void> {
  try {
    // Get the associated shoe to extract brand and model
    const shoe = await prisma.shoe.findUnique({
      where: { id: shoeGender.shoeId }
    });

    if (!shoe) {
      console.error(`Shoe with ID ${shoeGender.shoeId} not found`);
      return;
    }

    console.log(`Processing ${shoe.brand} ${shoe.model} (${shoeGender.gender})`);

    // Find the image URL
    const imageUrl = await findShoeImage(shoe.brand, shoe.model);

    let imageData: Buffer;
    let imageName: string;

    if (imageUrl) {
      // Download the image
      console.log(`Found image at ${imageUrl}`);
      imageData = await downloadImage(imageUrl);

      // Determine if the image is an outline or hero type
      const isHero = /-hero/i.test(imageUrl);
      const imageType = isHero ? 'hero' : 'outline';

      imageName = `${shoe.brand}_${shoe.model}_${shoeGender.gender}_${imageType}.png`;

      // Store the image in the database with reference to ShoeGender
      const image = await prisma.image.create({
        data: {
          name: imageName,
          data: imageData,
          shoeGenderId: shoeGender.id
        }
      });
      console.log(`Saved image with ID ${image.id} for ShoeGender ${shoeGender.id}`);
    } else {
      console.log(`No image found for ${shoe.brand} ${shoe.model}, no image to upload`);
    }
  } catch (error) {
    console.error(`Error processing ShoeGender ${shoeGender.id}:`, error);
  }

}

/**
 * Main function to run the image scraper
 */
async function main() {
  try {
    console.log('Starting shoe image scraper...');

    // Retrieve all male ShoeGender entries
    const maleShoeGenders = await prisma.shoeGender.findMany({
      where: { gender: 'male' }
    });

    console.log(`Found ${maleShoeGenders.length} male ShoeGender entries`);

    // Process each ShoeGender entry
    for (const shoeGender of maleShoeGenders) {
      await processShoeGender(shoeGender);
    }

    console.log('Shoe image scraping completed successfully');
  } catch (error) {
    console.error('Error running shoe image scraper:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}
