/**
 * Define the configurable parameters for the agent.
 */
import { RunnableConfig } from "@langchain/core/runnables";
import {
  RESPONSE_SYSTEM_PROMPT_TEMPLATE,
  QUERY_SYSTEM_PROMPT_TEMPLATE,
} from "./prompts.js";
import { Annotation } from "@langchain/langgraph";

/**
 * typeof ConfigurationAnnotation.State class for indexing and retrieval operations.
 *
 * This annotation defines the parameters needed for configuring the indexing and
 * retrieval processes, including user identification, embedding model selection,
 * retriever provider choice, and search parameters.
 */
export const IndexConfigurationAnnotation = Annotation.Root({
  /**
   * Unique identifier for the user.
   */
  userId: Annotation<string>,

  /**
   * Name of the embedding model to use. Must be a valid embedding model name.
   */
  embeddingModel: Annotation<string>,

  /**
   * The vector store provider to use for retrieval.
   * Only 'local-file' (HNSWLib) is supported.
   */
  retrieverProvider: Annotation<"local-file">,

  /**
   * Paths to document files or directories for the HNSWLib retriever.
   * Can be paths to individual document files or directories containing documents.
   */
  documentPaths: Annotation<string[]>,

  /**
   * URLs to sitemaps for content retrieval.
   * Can be used with any retrieverProvider to fetch and index content from URLs in the sitemaps.
   * Can be URLs to XML sitemaps.
   */
  sitemapUrls: Annotation<string[]>,

  /**
   * Additional keyword arguments to pass to the search function of the retriever.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchKwargs: Annotation<Record<string, any>>,

  /**
   * Weight to give to recency when ranking documents (0-1).
   * 0 means no recency bias, 1 means only consider recency.
   * Default is 0.3 (30% recency, 70% relevance).
   */
  recencyWeight: Annotation<number>,
});

/**
 * Create an typeof IndexConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof IndexConfigurationAnnotation.State with the specified configuration.
 */
export function ensureIndexConfiguration(
  config: RunnableConfig | undefined = undefined,
): typeof IndexConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof IndexConfigurationAnnotation.State
  >;
  return {
    userId: configurable.userId || "default", // Give a default user for shared docs
    embeddingModel:
      configurable.embeddingModel || "openai/text-embedding-3-small",
    retrieverProvider: configurable.retrieverProvider || "local-file",
    documentPaths: configurable.documentPaths || ["/Users/nickwinder/Downloads/reviews"],
    sitemapUrls: configurable.sitemapUrls || [],
    searchKwargs: configurable.searchKwargs || {},
    recencyWeight: configurable.recencyWeight !== undefined ? configurable.recencyWeight : 0.3,
  };
}

/**
 * The complete configuration for the agent.
 */
export const ConfigurationAnnotation = Annotation.Root({
  ...IndexConfigurationAnnotation.spec,
  /**
   * The system prompt used for generating responses.
   */
  responseSystemPromptTemplate: Annotation<string>,

  /**
   * The language model used for generating responses. Should be in the form: provider/model-name.
   */
  responseModel: Annotation<string>,

  /**
   * The system prompt used for processing and refining queries.
   */
  querySystemPromptTemplate: Annotation<string>,

  /**
   * The language model used for processing and refining queries. Should be in the form: provider/model-name.
   */
  queryModel: Annotation<string>,
});

/**
 * Create a typeof ConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof ConfigurationAnnotation.State with the specified configuration.
 */
export function ensureConfiguration(
  config: RunnableConfig | undefined = undefined,
): typeof ConfigurationAnnotation.State {
  const indexConfig = ensureIndexConfiguration(config);
  const configurable = (config?.configurable || {}) as Partial<
    typeof ConfigurationAnnotation.State
  >;

  return {
    ...indexConfig,
    responseSystemPromptTemplate:
      configurable.responseSystemPromptTemplate ||
      RESPONSE_SYSTEM_PROMPT_TEMPLATE,
    responseModel:
      configurable.responseModel || "openai/gpt-4o-mini",
    querySystemPromptTemplate:
      configurable.querySystemPromptTemplate || QUERY_SYSTEM_PROMPT_TEMPLATE,
    queryModel: configurable.queryModel || "openai/gpt-4o-mini",
  };
}
