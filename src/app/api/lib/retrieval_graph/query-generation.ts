import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { getMessageText, loadChatModel } from './utils'
import { SearchQuery } from './schemas'
import { formatShoeData } from './formatting'

/**
 * Generates a search query based on the current state
 */
export async function generateQuery(
  state: typeof StateAnnotation.State,
  config?: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  const messages = state.messages

  // Check if there are any messages
  if (!messages || messages.length === 0) {
    console.log('No messages found, returning empty query')
    return { queries: [] }
  }

  const configuration = ensureConfiguration(config)

  let queries = state.queries || []
  if (messages.length === 1) {
    const humanInput = getMessageText(messages[messages.length - 1])
    queries = [humanInput]
  }

  // Format the shoe data for inclusion in the prompt
  const shoeData = formatShoeData(state.relevantShoes || [])

  // Feel free to customize the prompt, model, and other logic!
  let systemMessage = configuration.querySystemPromptTemplate
    .replace('{queries}', queries.join('\n- '))
    .replace('{systemTime}', new Date().toISOString())
    .replace('{shoes}', shoeData)

  const messageValue = [{ role: 'system', content: systemMessage }, ...state.messages]
  const model = (await loadChatModel(configuration.responseModel)).withStructuredOutput(SearchQuery)

  const generated = await model.invoke(messageValue)
  return {
    queries: [generated.query],
  }
}
