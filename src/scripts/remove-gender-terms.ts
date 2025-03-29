import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Function to remove gender-specific terms from a string
 * @param description The description string to process
 * @returns The processed description with gender-specific terms removed
 */
function removeGenderTerms(description: string): string {
  if (!description) return description;
  
  // Define gender-specific terms to remove (including plurals)
  const genderTerms = [
    'Women', 'women', 'Woman', 'woman',
    'Men', 'men', 'Man', 'man',
    'male', 'Male', 'males', 'Males',
    'female', 'Female', 'females', 'Females', "Men's", "Women's"
  ];
  
  // Create a regex pattern to match whole words only
  const pattern = new RegExp(`\\b(${genderTerms.join('|')})\\b`, 'g');
  
  // Replace gender terms with empty string
  return description.replace(pattern, '').replace(/\s+/g, ' ').trim();
}

/**
 * Main function to process all shoe descriptions
 */
async function main() {
  console.log('Starting to process shoe descriptions...');
  
  try {
    // Get all shoes from the database
    const shoes = await prisma.shoe.findMany();
    console.log(`Found ${shoes.length} shoes to process`);
    
    // Process each shoe
    for (const shoe of shoes) {
      const originalDescription = shoe.description;
      const updatedDescription = removeGenderTerms(originalDescription);
      
      // Only update if the description has changed
      if (originalDescription !== updatedDescription) {
        await prisma.shoe.update({
          where: { id: shoe.id },
          data: { description: updatedDescription }
        });
        
        console.log(`Updated shoe ID ${shoe.id}: "${shoe.brand} ${shoe.model}"`);
        console.log(`Original: "${originalDescription}"`);
        console.log(`Updated: "${updatedDescription}"`);
        console.log('---');
      }
    }
    
    console.log('Finished processing all shoe descriptions');
  } catch (error) {
    console.error('Error processing shoe descriptions:', error);
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the main function
main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
