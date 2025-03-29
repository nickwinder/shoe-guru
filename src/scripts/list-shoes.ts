import { PrismaClient } from '@prisma/client';

/**
 * Script to read the shoe database and output information for each shoe
 * in the format: "{Brand} {Model}: {description}"
 */
async function main() {
  // Initialize Prisma client
  const prisma = new PrismaClient();

  try {
    console.log('Reading shoe database...');

    // Retrieve all shoes from the database
    const shoes = await prisma.shoe.findMany({
      select: {
        brand: true,
        model: true,
        description: true
      }
    });

    console.log(`Found ${shoes.length} shoes in the database.\n`);

    // Output information for each shoe
    shoes.forEach(shoe => {
      console.log(`**${shoe.brand} ${shoe.model}**: ${shoe.description}`);
    });

  } catch (error) {
    console.error('Error reading shoe database:', error);
  } finally {
    // Disconnect from the database
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
