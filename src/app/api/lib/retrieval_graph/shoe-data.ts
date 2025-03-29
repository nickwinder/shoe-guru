import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { getMessageText, loadChatModel } from './utils'
import { ShoeSearchConditions } from './schemas'
import { buildShoeQuery } from './query-builder'

/**
 * Fetches shoe data based on the user's query
 */
export async function fetchShoeData(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  // Use the last user message instead of a generated query
  const messages = state.messages

  // Check if there are any messages
  if (!messages || messages.length === 0) {
    console.log('No messages found, returning empty shoe data')
    return { relevantShoes: [] }
  }

  const query = getMessageText(messages[messages.length - 1])
  console.log(`Fetching shoe data for user message: ${query}`)

  // Get configuration
  const configuration = ensureConfiguration(config)

  // Use a language model to parse the natural language query
  const systemPrompt = `
You are a shoe search assistant that converts natural language queries into structured search parameters.
Your task is to extract search conditions from the user's query about shoes.

Available shoe attributes - If the attribute is not relevant to the query, return "empty" for it's value:
- stackHeightMm: The height of the shoe's sole in millimeters. This will match shoes where either the forefoot or heel stack height is within the specified range.
- drop: The difference between heel and forefoot stack heights.
- width: The width of the shoe (narrow, standard, wide)
- intendedUse: What the shoe is designed for (road, trail, race, etc.)
- gender: The gender the shoe is designed for (men, women, unisex)

Examples:
- "Show me shoes with zero drop" → drop.min = 0, drop.max = 0
- "What are the highest stack height shoes?" → stackHeightMm.sort = "desc"
- "Find trail running shoes" → intendedUse = "trail"
- "Show me women's shoes with stack height under 20mm" → gender = "women", stackHeightMm.max = 20
- "What are the lowest stack height shoes?" → stackHeightMm.sort = "asc"

Extract only the parameters that are explicitly mentioned or implied in the query.
`

  // Create a chat model with structured output
  const model = (await loadChatModel(configuration.responseModel)).withStructuredOutput(ShoeSearchConditions)

  // Invoke the model with the user's query
  const searchConditions = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ])

  // Build Prisma query from the structured output
  const shoes = await buildShoeQuery(searchConditions)

  console.log(`Found ${shoes.length} relevant shoes`)
  if (shoes.length > 0) {
    console.log(
      'Shoes:',
      shoes.map((shoe) => shoe.model),
    )
  }
  return { relevantShoes: shoes }
}
