# Shoe Image Scraper

This script is designed to find and download shoe outline images for male shoe models from the Barefoot Run Review website, store them in the database, and link them to the corresponding ShoeGender entries.

## Overview

The shoe image scraper performs the following tasks:

1. Retrieves all male ShoeGender entries from the database
2. For each entry, gets the associated Shoe to extract brand and model information
3. Searches the Barefoot Run Review website for images matching the brand and model with "-outline" suffix
4. Downloads the images if found, or uses a placeholder image if not found
5. Stores the images in the Image table
6. Creates images with references to their corresponding ShoeGender entries

## Prerequisites

Before running the script, ensure that:

1. The database is properly set up and contains Shoe and ShoeGender entries
2. You have an internet connection to access the Barefoot Run Review website
3. The necessary dependencies are installed (axios, cheerio, etc.)

## Usage

To run the script, use the following npm command:

```bash
npm run db:scrape-images
```

This command will:
1. Build the TypeScript code
2. Run the compiled JavaScript file

## How It Works

### Finding Images

The script searches for images on the Barefoot Run Review website by:

1. Normalizing the brand and model names for consistent searching
2. Constructing the URL to search for the image
3. Fetching the HTML content of the page
4. Using Cheerio to parse the HTML and search for image elements
5. Looking for images with filenames that include the model name and "-outline" suffix
6. If no image is found in img elements, searching through background images in style attributes
7. Converting relative URLs to absolute URLs

### Handling Missing Images

If an image cannot be found for a particular shoe, the script:

1. Uses a placeholder SVG image (located at `src/db/placeholder.svg`)
2. Logs a message indicating that no image was found
3. Stores the placeholder in the database with a name indicating it's a placeholder

### Database Operations

The script interacts with the database using Prisma:

1. Retrieves ShoeGender entries with `gender: 'male'`
2. Gets the associated Shoe for each ShoeGender
3. Creates new Image entries with the downloaded image data
4. Creates Image entries with references to their corresponding ShoeGender through the `shoeGenderId` field

## Troubleshooting

If you encounter issues:

1. Check that the database is properly set up and accessible
2. Ensure you have internet access to download images
3. Verify that the Barefoot Run Review website structure hasn't changed
4. Check the console output for error messages

## Customization

You can customize the script by:

1. Modifying the URL to search for images on different websites
2. Changing the image pattern to look for different types of images
3. Updating the placeholder image to use a different design
4. Adjusting the naming convention for saved images
