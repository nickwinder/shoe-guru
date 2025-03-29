import { RunnableConfig } from '@langchain/core/runnables'
import { RESPONSE_SYSTEM_PROMPT_TEMPLATE } from './prompts'
import { Annotation } from '@langchain/langgraph'

/**
 * The complete configuration for the agent.
 */
export const ConfigurationAnnotation = Annotation.Root({
  /**
   * The system prompt used for generating responses.
   */
  responseSystemPromptTemplate: Annotation<string>,

  /**
   * The language model used for generating responses. Should be in the form: provider/model-name.
   */
  responseModel: Annotation<string>,
})

/**
 * Create a typeof ConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof ConfigurationAnnotation.State with the specified configuration.
 */
export function ensureConfiguration(
  config: RunnableConfig | undefined = undefined,
): typeof ConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<typeof ConfigurationAnnotation.State>

  return {
    responseSystemPromptTemplate: configurable.responseSystemPromptTemplate || RESPONSE_SYSTEM_PROMPT_TEMPLATE,
    responseModel: configurable.responseModel || 'openai/gpt-4o-mini',
  }
}
