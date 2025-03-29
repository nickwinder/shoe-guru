import { z } from 'zod'

/**
 * Schema for search query
 */
export const SearchQuery = z.object({
  query: z.string().describe('Search the indexed documents for a query.'),
})

/**
 * Schema for structured output of shoe search conditions
 */
export const ShoeSearchConditions = z.object({
  // Basic text search
  keywords: z.array(z.string()).describe('Keywords to search for in shoe names, brands, etc.').optional(),

  // Specific numeric filters
  stackHeightMm: z.union([
    z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      sort: z.enum(['asc', 'desc']).optional(),
    }),
    z.literal('empty'),
  ]),

  drop: z.union([
    z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      sort: z.enum(['asc', 'desc']).optional(),
    }),
    z.literal('empty'),
  ]),

  // String filters
  width: z.union([z.string(), z.literal('empty')]),
  intendedUse: z.union([z.enum(['road', 'trail']), z.literal('empty')]),
  gender: z.union([z.string(), z.literal('empty')]),

  // Limit
  limit: z.number().optional(),
})
