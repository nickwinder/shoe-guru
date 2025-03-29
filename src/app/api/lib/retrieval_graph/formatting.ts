import { Shoe, ShoeGender, ShoeReview } from '@prisma/client'

/**
 * Format shoe data for inclusion in the prompt
 * @param shoes Array of shoes with related data
 * @returns Formatted string representation of the shoes
 */
export function formatShoeData(shoes: Array<any>): string {
  if (!shoes || shoes.length === 0) {
    return 'No relevant shoes found in the database.'
  }

  return shoes
    .map((shoe) => {
      // Format basic shoe info
      let shoeInfo = `## ${shoe.brand} ${shoe.model}\n`

      // Add specifications if available
      const specs = []
      specs.push(`Forefoot Stack Height: ${shoe.forefootStackHeightMm}mm`)
      specs.push(`Heel Stack Height: ${shoe.heelStackHeightMm}mm`)
      specs.push(`Drop: ${shoe.dropMm}mm`)
      specs.push(`Fit: ${shoe.fit}`)
      specs.push(`Wide Option: ${shoe.wideOption ? 'Yes' : 'No'}`)
      if (shoe.intendedUse) specs.push(`Intended Use: ${shoe.intendedUse}`)
      if (shoe.description) specs.push(`Description: ${shoe.description}`)

      if (specs.length > 0) {
        shoeInfo += '### Specifications\n'
        shoeInfo += specs.map((spec) => `- ${spec}`).join('\n') + '\n'
      }

      // Add gender-specific information
      if (shoe.ShoeGender && shoe.ShoeGender.length > 0) {
        shoeInfo += '### Gender Specific information\n'
        shoe.ShoeGender.forEach((version: ShoeGender) => {
          shoeInfo += `- ${version.gender} version`
          if (version.priceRRP) shoeInfo += `, RRP: $${version.priceRRP}`
          if (version.price) shoeInfo += `, Current Price: $${version.price}`
          shoeInfo += `, Weight: ${version.weightGrams}g`
          shoeInfo += `\n`
        })
      }

      // Add reviews if available
      if (shoe.reviews && shoe.reviews.length > 0) {
        shoeInfo += '### Reviews\n'
        shoe.reviews.forEach((review: ShoeReview) => {
          if (review.fit) shoeInfo += `- Fit: ${review.fit}\n`
          if (review.feel) shoeInfo += `- Feel: ${review.feel}\n`
          if (review.durability) shoeInfo += `- Durability: ${review.durability}\n`
        })
      }

      return shoeInfo
    })
    .join('\n\n')
}
