import { initializeDatabase } from './init-db';
import { scrapeShoeData } from './shoe-scraper';

/**
 * Main function to initialize the database and scrape shoe data
 */
async function main() {
  console.log('Starting shoe database operations...');
  
  try {
    // Step 1: Initialize the database
    console.log('Step 1: Initializing database...');
    const dbInit = await initializeDatabase();
    
    if (!dbInit.success) {
      console.error('Database initialization failed, cannot proceed with scraping');
      process.exit(1);
    }
    
    console.log('Database initialization successful');
    
    // Step 2: Scrape shoe data from websites
    console.log('Step 2: Scraping shoe data from websites...');
    const scrapeResult = await scrapeShoeData();
    
    if (!scrapeResult.success) {
      console.error('Shoe data scraping failed');
      process.exit(1);
    }
    
    console.log('Shoe data scraping successful');
    
    console.log('All operations completed successfully');
    return { success: true, message: 'Database initialized and shoe data scraped successfully' };
  } catch (error) {
    console.error('Error in main operation:', error);
    return { success: false, message: `Operation failed: ${error.message}` };
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main()
    .then((result) => {
      console.log(result.message);
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export { main, initializeDatabase, scrapeShoeData };
