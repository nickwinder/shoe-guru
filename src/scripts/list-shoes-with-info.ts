import { PrismaClient } from '@prisma/client';

/**
 * Script to read the shoe database and output information for each shoe
 * in the format: "{Brand} {Model}: {Shoe info excluding description} {include male weight and price}"
 */
async function main() {
  // Initialize Prisma client
  const prisma = new PrismaClient();

  try {
    console.log('Reading shoe database...');

    // Retrieve all shoes from the database with ShoeGender relation
    const shoes = await prisma.shoe.findMany({
      include: {
        ShoeGender: true
      }
    });

    console.log(`Found ${shoes.length} shoes in the database.\n`);

    // Output information for each shoe
    shoes.forEach(shoe => {
      // Find male gender data if available
      const maleData = shoe.ShoeGender.find(gender => 
        gender.gender.toLowerCase().includes('men') || 
        gender.gender.toLowerCase().includes('male')
      );

      // Format weight and price information
      const weightInfo = maleData ? `${maleData.weightGrams}g` : 'not given';
      const priceInfo = maleData ? `$${maleData.priceRRP}` : 'not given';

      // Format shoe specifications
      const shoeInfo = `Stack Height: ${shoe.forefootStackHeightMm}mm-${shoe.heelStackHeightMm}mm, Drop: ${shoe.dropMm}mm, Fit: ${shoe.fit}${shoe.wideOption ? ', Wide Option Available' : ''}${shoe.intendedUse ? `, Intended Use: ${shoe.intendedUse}` : ''}`;

      // Output formatted string
      console.log(`**${shoe.brand} ${shoe.model}**: ${shoeInfo} | Male Weight: ${weightInfo}, Price: ${priceInfo}`);
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
