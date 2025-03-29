import { Prisma, Shoe, ShoeGender, ShoeReview } from '@prisma/client'
import { prisma } from 'src/lib/prisma'

/**
 * Builds a Prisma query from the structured search conditions
 */
export async function buildShoeQuery(searchConditions: any): Promise<Array<Shoe & { ShoeGender: ShoeGender[]; reviews: ShoeReview[] }>> {
  let whereConditions: Prisma.ShoeWhereInput[] = []
  const orderBy: any[] = []

  console.log(`Building shoe query with conditions: ${JSON.stringify(searchConditions)}`)

  // Process keywords for text search
  processKeywords(searchConditions, whereConditions);

  // Process stack height conditions
  processStackHeight(searchConditions, whereConditions, orderBy);

  // Process drop conditions
  processDropConditions(searchConditions, whereConditions);

  // Process string filters
  processStringFilters(searchConditions, whereConditions);

  // Query the database with the constructed conditions
  let shoes: Array<Shoe & { ShoeGender: ShoeGender[]; reviews: ShoeReview[] }> = []

  // Only search if we have conditions
  if (whereConditions.length > 0) {
    const limit = Math.min(searchConditions.limit || 5, 5)

    // Query the database for shoes that match the search conditions
    shoes = await prisma.shoe.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : undefined,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      include: {
        ShoeGender: true,
        reviews: true,
      },
      take: limit,
    })
  }

  // Apply drop sorting if needed
  applySorting(searchConditions, shoes);

  return shoes
}

/**
 * Process keywords for text search
 */
function processKeywords(searchConditions: any, whereConditions: Prisma.ShoeWhereInput[]) {
  if (searchConditions.keywords && searchConditions.keywords.length > 0) {
    const keywordConditions = searchConditions.keywords.map((keyword: string) => ({
      OR: [
        { model: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
        { brand: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
        { intendedUse: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
        { ShoeGender: { some: { gender: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } } } },
        {
          reviews: {
            some: {
              OR: [
                { fit: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
                { feel: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
                { durability: { contains: keyword, mode: 'insensitive' as Prisma.QueryMode } },
              ],
            },
          },
        },
      ],
    }))
    whereConditions.push({ OR: keywordConditions })
  }
}

/**
 * Process stack height conditions
 */
function processStackHeight(searchConditions: any, whereConditions: Prisma.ShoeWhereInput[], orderBy: any[]) {
  if (typeof searchConditions.stackHeightMm !== 'string') {
    const stackHeight = searchConditions.stackHeightMm
    const stackHeightCondition: any = {}

    if (stackHeight.min !== undefined) {
      stackHeightCondition.gte = stackHeight.min
    }
    if (stackHeight.max !== undefined) {
      stackHeightCondition.lte = stackHeight.max
    }

    // Apply the same condition to both forefoot and heel stack heights
    if (Object.keys(stackHeightCondition).length > 0) {
      whereConditions.push({
        OR: [
          { forefootStackHeightMm: stackHeightCondition },
          { heelStackHeightMm: stackHeightCondition }
        ]
      })
    }

    // Apply sorting to both if specified
    if (stackHeight.sort) {
      // Sort by both forefoot and heel stack heights
      // This gives priority to forefoot but also considers heel
      orderBy.push({ forefootStackHeightMm: stackHeight.sort })
      orderBy.push({ heelStackHeightMm: stackHeight.sort })
    }
  }
}

/**
 * Process drop conditions
 */
function processDropConditions(searchConditions: any, whereConditions: Prisma.ShoeWhereInput[]) {
  if (typeof searchConditions.drop !== 'string') {
    const drop = searchConditions.drop

    // We can now directly query the dropMm column
    if (drop.min !== undefined || drop.max !== undefined || drop.sort) {
      if (drop.min !== undefined) {
        whereConditions.push({ dropMm: { gte: drop.min } })
      }

      if (drop.max !== undefined) {
        whereConditions.push({ dropMm: { lte: drop.max } })
      }
    }
  }
}

/**
 * Process string filters (width, intendedUse, gender)
 */
export function processStringFilters(searchConditions: any, whereConditions: Prisma.ShoeWhereInput[]) {
  if (searchConditions.width && searchConditions.width !== 'empty') {
    whereConditions.push({ fit: { contains: searchConditions.width, mode: 'insensitive' as Prisma.QueryMode } })
  }

  if (searchConditions.intendedUse && searchConditions.intendedUse !== 'empty') {
    whereConditions.push({
      intendedUse: {
        contains: searchConditions.intendedUse,
        mode: 'insensitive' as Prisma.QueryMode,
      },
    })
  }

  if (searchConditions.gender && searchConditions.gender !== 'empty') {
    whereConditions.push({
      ShoeGender: {
        some: {
          gender: {
            contains: searchConditions.gender,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
      },
    })
  }
}

/**
 * Apply sorting to the shoes
 */
function applySorting(searchConditions: any, shoes: Array<Shoe & { ShoeGender: ShoeGender[]; reviews: ShoeReview[] }>) {
  if (
    searchConditions.drop &&
    typeof searchConditions.drop !== 'string' &&
    searchConditions.drop.sort &&
    shoes.length > 0
  ) {
    console.log(`Applying drop sorting: ${searchConditions.drop.sort}`)
    const sort = searchConditions.drop.sort

    // Sort by drop if requested
    shoes.sort((a, b) => {
      return sort === 'asc' ? a.dropMm! - b.dropMm! : b.dropMm! - a.dropMm!
    })

    console.log(`Shoes sorted by drop: ${searchConditions.drop.sort}`)
  }
}
