import { RunnableConfig } from '@langchain/core/runnables'
import { StateAnnotation } from './state'
import { ensureConfiguration } from './configuration'
import { getMessageText, loadChatModel } from './utils'
import { SystemMessage } from '@langchain/core/messages'
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts'
import { formatShoeData } from './formatting'

/**
 * Determines if the query should look up shoe data or generate a query
 */
export async function shouldLookupShoe(state: typeof StateAnnotation.State, config: RunnableConfig): Promise<string> {
  // Check if the last message is from the user
  const messages = state.messages
  if (messages.length === 0) return 'generateQuery'

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.getType() !== 'human') {
    return 'generateQuery'
  }

  // Ask the LLM to analyze the query and determine if the query requires shoe data, or is a general query on shoe choice.
  const configuration = ensureConfiguration(config)
  const model = await loadChatModel(configuration.queryModel)
  const system = new SystemMessage(`
    You are a shoe search assistant that determines if a query should look in a database for shoe specifications or not. 

    A query likely requires shoe specifications if it mentions an aspect of the shoe like drop, stack height, etc. And does not require shoe specifications if it is a general question like "What's the most durable shoe?".

    If the query requires shoe data, respond with "YES". If the query is a general question that could be better answered by other means, respond with "NO".`)

  const response = await model.invoke([system, ...messages])

  if (getMessageText(response) === 'NO') {
    return 'generateQuery'
  }

  return 'fetchShoeData'
}

/**
 * Determines if the query should retrieve documents or respond directly
 */
export async function shouldRetrieveDocs(state: typeof StateAnnotation.State, config: RunnableConfig): Promise<string> {
  // Check if the last message is from the user
  const messages = state.messages
  if (messages.length === 0) return 'respond'

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.getType() !== 'human') {
    return 'respond'
  }

  // Ask the LLM to analyze the query and determine if the query requires shoe data, or is a general query on shoe choice.
  const configuration = ensureConfiguration(config)
  const model = await loadChatModel(configuration.queryModel)
  const system = SystemMessagePromptTemplate.fromTemplate(`
    You are a shoe search assistant that determines if a query requires a search of shoe review documents or not.

    A shoe data look up has already been performed and the following information is available:
    {shoes}

    If the query requires a search of shoe review documents, respond with "YES". If the query is answered with the shoe data already present "NO".`)

  const chat = ChatPromptTemplate.fromMessages([system, HumanMessagePromptTemplate.fromTemplate('{query}')])

  const response = await chat.pipe(model).invoke({
    query: getMessageText(lastMessage),
    shoes: formatShoeData(state.relevantShoes || []),
  })

  if (getMessageText(response) === 'NO') {
    return 'respond'
  }

  return 'generateQuery'
}
