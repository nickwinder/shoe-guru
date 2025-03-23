import { PrismaClient } from '@prisma/client';

/**
 * Initialize the database by creating tables based on the Prisma schema
 */
async function initializeDatabase() {
  console.log('Initializing database...');
  
  const prisma = new PrismaClient();
  
  try {
    // Connect to the database
    await prisma.$connect();
    console.log('Connected to the database');
    
    // Check if we can query the database
    const shoeCount = await prisma.shoe.count();
    console.log(`Current shoe count: ${shoeCount}`);
    
    console.log('Database initialization complete');
    
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, message: `Database initialization failed: ${error.message}` };
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
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

export { initializeDatabase };
