import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { formatDocs, loadChatModel } from './utils'
import { formatShoeData } from './formatting'

/**
 * Generates a response based on the retrieved documents and the user's query
 */
export async function respond(
  state: typeof StateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof StateAnnotation.Update> {
  /**
   * Call the LLM powering our "agent".
   */
  const configuration = ensureConfiguration(config)

  const model = await loadChatModel(configuration.responseModel)

  const retrievedDocs = formatDocs(state.retrievedDocs)

  // Format the shoe data
  const shoeData = formatShoeData(state.relevantShoes || [])

  // Feel free to customize the prompt, model, and other logic!
  let systemMessage = configuration.responseSystemPromptTemplate
    .replace('{retrievedDocs}', retrievedDocs)
    .replace('{systemTime}', new Date().toISOString())
    .replace('{shoes}', shoeData)

  const messageValue = [{ role: 'system', content: systemMessage }, ...state.messages]
  const response = await model.withConfig({ tags: ['respond'] }).invoke(messageValue)
  // We return a list, because this will get added to the existing list
  return { messages: [response] }
}
