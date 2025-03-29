import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { loadChatModel } from './utils'

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
  const messageValue = [{ role: 'system', content: configuration.responseSystemPromptTemplate }, ...state.messages]
  const response = await model.withConfig({ tags: ['respond'] }).invoke(messageValue)
  // We return a list, because this will get added to the existing list
  return { messages: [response] }
}
